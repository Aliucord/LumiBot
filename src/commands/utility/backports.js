const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// The Backports section of the Aliucord docs (https://yutaplug.github.io/Aliucord/#backports)
const DOCS_URL = 'https://raw.githubusercontent.com/yutaplug/Aliucord/main/index.md';
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

const MESSAGE_LIMIT = 2000;
const LEGEND = '-# 🚧 beta · ⚠️ maintenance · 💣 broken';
const INSTALL_HINT = '\n​\n-# hold this message (not the links) to install';
const MAX_SEARCH_LENGTH = 50;

let cachedBackports = null;
let cacheTimestamp = 0;

// [Name](url) -> [Name](<url>) so Discord doesn't embed every link
function formatLinks(text) {
  return text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '[$1](<$2>)');
}

function parseBackports(markdown) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const start = lines.findIndex(l => /^# Backports\s*$/.test(l));
  if (start === -1) throw new Error('Backports section not found in docs');

  const plugins = [];
  const builtIn = [];
  let section = null;

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^# /.test(line)) break;

    if (/^###\s+Plugins/i.test(line)) { section = 'plugins'; continue; }
    if (/^###\s+Built-in/i.test(line)) { section = 'builtIn'; continue; }

    if (section === 'plugins' && line.startsWith('|')) {
      const cells = line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      // Skip the header and |-|-| separator rows
      if (cells.length < 2 || /^-+$/.test(cells[0]) || cells[0] === 'Feature') continue;
      const feature = cells[0];
      const plugin = cells.slice(1).join('|');
      plugins.push({ feature, plugin, line: `${formatLinks(plugin)} - ${feature}` });
    } else if (section === 'builtIn' && line.startsWith('- ')) {
      builtIn.push(line.slice(2).trim());
    }
  }

  if (plugins.length === 0) throw new Error('No backport plugins found in docs');
  return { plugins, builtIn };
}

async function fetchBackports() {
  const now = Date.now();
  if (cachedBackports && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedBackports;
  }

  try {
    const response = await fetch(DOCS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    cachedBackports = parseBackports(await response.text());
    cacheTimestamp = now;
    console.log(`Fetched ${cachedBackports.plugins.length} backports from docs`);
  } catch (err) {
    console.error('Error fetching backports:', err);
  }
  return cachedBackports;
}

// Pack lines into pages that each fit in one message alongside the header and footer
function paginate(lines, reserved) {
  const budget = MESSAGE_LIMIT - reserved;
  const pages = [];
  let current = [];
  let length = 0;

  for (const line of lines) {
    const added = (current.length ? 2 : 0) + line.length;
    if (current.length && length + added > budget) {
      pages.push(current);
      current = [];
      length = 0;
    }
    current.push(line);
    length += current.length === 1 ? line.length : added;
  }
  if (current.length) pages.push(current);
  return pages;
}

function buildPages(data, search) {
  const query = search ? search.toLowerCase() : null;
  const plugins = query
    ? data.plugins.filter(p => p.feature.toLowerCase().includes(query) || p.plugin.toLowerCase().includes(query))
    : data.plugins;
  const builtIn = query
    ? data.builtIn.filter(b => b.toLowerCase().includes(query))
    : data.builtIn;

  // Header (with worst-case page numbers) + legend + install hint
  const reserved = 80 + MAX_SEARCH_LENGTH + LEGEND.length + INSTALL_HINT.length;
  const pages = paginate(plugins.map(p => p.line), reserved).map(lines => ({ type: 'plugins', lines }));

  if (builtIn.length) {
    pages.push({ type: 'builtIn', lines: builtIn.map(b => `- ${formatLinks(b)}`) });
  }

  return { pages, pluginCount: plugins.length };
}

function renderPage(data, page, search) {
  const { pages, pluginCount } = buildPages(data, search);
  if (pages.length === 0) return null;

  page = Math.min(Math.max(page, 0), pages.length - 1);
  const current = pages[page];
  const pageLabel = pages.length > 1 ? ` (Page ${page + 1}/${pages.length})` : '';

  let content;
  if (current.type === 'builtIn') {
    content = `**Built-in to Aliucord**${pageLabel}\n-# No plugin needed for these\n\n${current.lines.join('\n')}`;
  } else {
    const title = search
      ? `**Backports matching "${search}"** (${pluginCount} found)`
      : '**Backports**';
    content = `${title}${pageLabel}\n${LEGEND}\n\n${current.lines.join('\n\n')}${INSTALL_HINT}`;
  }

  const components = [];
  if (pages.length > 1) {
    const encodedSearch = encodeSearch(search);
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`backports_prev_${page}_${encodedSearch}`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`backports_next_${page}_${encodedSearch}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === pages.length - 1)
    ));
  }

  return { content, components };
}

function encodeSearch(str) {
  if (!str) return '';
  return Buffer.from(str).toString('base64').replace(/=/g, '');
}

function decodeSearch(str) {
  if (!str) return null;
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

const NOT_FOUND = 'No backports found.';
const FETCH_ERROR = '❌ Could not load backports right now. See <https://yutaplug.github.io/Aliucord/#backports>';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backports')
    .setDescription('Plugins that backport features from new Discord to Aliucord')
    .addStringOption(option =>
      option.setName('search')
        .setDescription('Search by feature or plugin name')
        .setMaxLength(MAX_SEARCH_LENGTH)
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),

  async execute(interaction) {
    const send = interaction.options.getBoolean('send') ?? false;
    await interaction.deferReply(send ? {} : { flags: MessageFlags.Ephemeral });

    const data = await fetchBackports();
    if (!data) return interaction.editReply(FETCH_ERROR);

    const search = interaction.options.getString('search');
    const reply = renderPage(data, 0, search);
    await interaction.editReply(reply || NOT_FOUND);
  },

  async executePrefix(message, args, rawArgs) {
    const data = await fetchBackports();
    if (!data) return message.reply(FETCH_ERROR);

    const search = rawArgs ? rawArgs.slice(0, MAX_SEARCH_LENGTH) : null;
    const reply = renderPage(data, 0, search);
    await message.reply(reply || NOT_FOUND);
  },

  async handleButton(interaction, action, page, encodedSearch) {
    const data = await fetchBackports();
    if (!data) return interaction.update({ content: FETCH_ERROR, components: [] });

    page = parseInt(page) || 0;
    if (action === 'next') page++;
    if (action === 'prev') page--;

    const reply = renderPage(data, page, decodeSearch(encodedSearch));
    await interaction.update(reply || { content: NOT_FOUND, components: [] });
  },

  fetchBackports,
  parseBackports,
  renderPage
};

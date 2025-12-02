const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const MANIFEST_URL = 'https://plugins.aliucord.com/manifest.json';
const PLUGINS_PER_PAGE = 5;

let cachedPlugins = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

// Force cache refresh on startup
function clearPluginCache() {
  cachedPlugins = [];
  cacheTimestamp = 0;
}

function normalizePluginUrl(url) {
  try {
    // raw.githubusercontent.com /refs/heads/ → github.com /raw/ conversion
    const rawGithubRefsMatch = url.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/refs\/heads\/(.+)/);
    if (rawGithubRefsMatch) {
      const [, user, repo, pathWithBranch] = rawGithubRefsMatch;
      const normalized = `https://github.com/${user}/${repo}/raw/${pathWithBranch}`;
      console.log(`Normalized URL: ${url} → ${normalized}`);
      return normalized;
    }

    // GitHub /refs/heads/ → /raw/ conversion
    const githubRefsMatch = url.match(/github\.com\/([^/]+)\/([^/]+)\/refs\/heads\/(.+)/);
    if (githubRefsMatch) {
      const [, user, repo, pathWithBranch] = githubRefsMatch;
      const normalized = `https://github.com/${user}/${repo}/raw/${pathWithBranch}`;
      console.log(`Normalized URL: ${url} → ${normalized}`);
      return normalized;
    }

    // jsDelivr GitHub: https://cdn.jsdelivr.net/gh/user/repo@version/path/file.zip
    const jsDelivrMatch = url.match(/cdn\.jsdelivr\.net\/gh\/([^@/]+)\/([^@]+)@([^/]+)\/(.*)/);
    if (jsDelivrMatch) {
      const [, user, repo, version, path] = jsDelivrMatch;
      const normalized = `https://raw.githubusercontent.com/${user}/${repo}/${version}/${path}`;
      console.log(`Normalized URL: ${url} → ${normalized}`);
      return normalized;
    }

    // GitLab: https://gitlab.com/user/repo/-/raw/branch/path/file.zip
    const gitlabMatch = url.match(/gitlab\.com\/([^/]+)\/([^/]+)\/-\/raw\/([^/]+)\/(.*)/);
    if (gitlabMatch) {
      const [, user, repo, branch, path] = gitlabMatch;
      return `https://gitlab.com/${user}/${repo}/-/raw/${branch}/${path}`;
    }

    // If already in correct format or other, return as-is
    return url;
  } catch (err) {
    console.error('Error normalizing URL:', url, err);
    return url;
  }
}

async function fetchPlugins() {
  const now = Date.now();
  if (cachedPlugins.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedPlugins;
  }

  try {
    const response = await fetch(MANIFEST_URL);
    if (!response.ok) {
      console.error(`Error fetching manifest: HTTP ${response.status}`);
      return cachedPlugins.length > 0 ? cachedPlugins : [];
    }

    const data = await response.json();
    const plugins = [];

    if (Array.isArray(data)) {
      for (const plugin of data) {
        if (plugin.name && plugin.url) {
          const authors = Array.isArray(plugin.authors) ? plugin.authors.join(', ') : 'Unknown';
          const normalizedUrl = normalizePluginUrl(plugin.url);
          plugins.push({
            name: plugin.name,
            description: plugin.description || 'No description',
            url: normalizedUrl,
            version: plugin.version || '',
            authors: authors,
            changelog: plugin.changelog || ''
          });
        }
      }
    }

    cachedPlugins = plugins;
    cacheTimestamp = now;
    console.log(`Fetched ${plugins.length} plugins from Aliucord manifest`);
    return plugins;
  } catch (err) {
    console.error('Error fetching plugins from manifest:', err);
    return cachedPlugins.length > 0 ? cachedPlugins : [];
  }
}

async function initializePluginCache() {
  console.log('Initializing plugin cache...');
  await fetchPlugins();
}

function filterPlugins(plugins, search) {
  if (!search) return plugins;
  
  const searchLower = search.toLowerCase();
  return plugins.filter(plugin => 
    plugin.name.toLowerCase().includes(searchLower) ||
    plugin.description.toLowerCase().includes(searchLower) ||
    plugin.authors.toLowerCase().includes(searchLower)
  );
}

function formatPluginLine(plugin) {
  let text = `[${plugin.name}](${plugin.url})\n`;
  text += plugin.description;
  if (plugin.authors) {
    text += ` - ${plugin.authors}`;
  }
  return text;
}

function buildPaginationRow(page, totalPages, hasSearch = false) {
  const row = new ActionRowBuilder();
  
  const prevBtn = new ButtonBuilder()
    .setCustomId(`plugins_prev_${page}${hasSearch ? '_1' : '_0'}`)
    .setLabel('Previous')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === 0);
  
  const nextBtn = new ButtonBuilder()
    .setCustomId(`plugins_next_${page}${hasSearch ? '_1' : '_0'}`)
    .setLabel('Next')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === totalPages - 1);
  
  row.addComponents(prevBtn, nextBtn);
  return row;
}

async function handleButton(interaction, action, page, hasSearch) {
  try {
    const search = hasSearch === '1' ? interaction.message.content.match(/Search results for: "([^"]+)"/)?.[1] : null;
    const allPlugins = await fetchPlugins();
    const filteredPlugins = search ? filterPlugins(allPlugins, search) : allPlugins;

    page = parseInt(page);
    if (action === 'next') page++;
    if (action === 'prev') page--;

    const totalPages = Math.ceil(filteredPlugins.length / PLUGINS_PER_PAGE);
    if (page < 0 || page >= totalPages) {
      return await interaction.update({ content: 'Invalid page.', components: [] });
    }

    const start = page * PLUGINS_PER_PAGE;
    const pagePlugins = filteredPlugins.slice(start, start + PLUGINS_PER_PAGE);

    let content = '';
    if (search) {
      content += `**Search results for: "${search}"** (${filteredPlugins.length} found)\n\n`;
    } else {
      content += `**All Plugins** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pagePlugins.forEach((plugin, index) => {
      content += formatPluginLine(plugin);
      if (index < pagePlugins.length - 1) content += '\n\n';
    });

    const row = buildPaginationRow(page, totalPages, !!search);
    await interaction.update({ content, components: [row] });
  } catch (err) {
    console.error('Error in handleButton:', err);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugins')
    .setDescription('Browse Aliucord plugins')
    .addStringOption(option =>
      option.setName('search')
        .setDescription('Search for plugins by name, description, or author')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),

  async execute(interaction) {
    const send = interaction.options.getBoolean('send') ?? false;
    const deferOptions = send ? {} : { flags: MessageFlags.Ephemeral };
    await interaction.deferReply(deferOptions);

    const search = interaction.options.getString('search');
    const allPlugins = await fetchPlugins();
    const filteredPlugins = search ? filterPlugins(allPlugins, search) : allPlugins;

    if (filteredPlugins.length === 0) {
      return interaction.editReply('No plugins found.');
    }

    const page = 0;
    const totalPages = Math.ceil(filteredPlugins.length / PLUGINS_PER_PAGE);
    const start = page * PLUGINS_PER_PAGE;
    const pagePlugins = filteredPlugins.slice(start, start + PLUGINS_PER_PAGE);

    let content = '';
    if (search) {
      content += `**Search results for: "${search}"** (${filteredPlugins.length} found)\n\n`;
    } else {
      content += `**All Plugins** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pagePlugins.forEach((plugin, index) => {
      content += formatPluginLine(plugin);
      if (index < pagePlugins.length - 1) content += '\n\n';
    });

    const row = buildPaginationRow(page, totalPages, !!search);
    await interaction.editReply({ content, components: [row] });
  },

  async executePrefix(message, args) {
    const search = args.join(' ').trim() || null;

    const allPlugins = await fetchPlugins();
    const filteredPlugins = search ? filterPlugins(allPlugins, search) : allPlugins;

    if (filteredPlugins.length === 0) {
      const reply = await message.reply('No plugins found.');
      setTimeout(() => reply.delete().catch(() => {}), 30000);
      return;
    }

    const page = 0;
    const totalPages = Math.ceil(filteredPlugins.length / PLUGINS_PER_PAGE);
    const start = page * PLUGINS_PER_PAGE;
    const pagePlugins = filteredPlugins.slice(start, start + PLUGINS_PER_PAGE);

    let content = '';
    if (search) {
      content += `**Search results for: "${search}"** (${filteredPlugins.length} found)\n\n`;
    } else {
      content += `**All Plugins** (Page ${page + 1}/${totalPages})\n\n`;
    }

    pagePlugins.forEach((plugin, index) => {
      content += formatPluginLine(plugin);
      if (index < pagePlugins.length - 1) content += '\n\n';
    });

    const row = buildPaginationRow(page, totalPages, !!search);
    const replyOptions = { content, components: [row] };
    
    const reply = await message.reply(replyOptions);
    setTimeout(() => reply.delete().catch(() => {}), 30000);
  },

  handleButton,
  fetchPlugins,
  filterPlugins,
  initializePluginCache,
  clearPluginCache
};

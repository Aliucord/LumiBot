const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const path = require('path');
const { SUPPORT_HELPER_ROLE, SEARCH_CHANNELS, PUBLIC_SEARCH_CHANNELS } = require(path.join(__dirname, '../../utils/serverConfig'));
const { fetchPlugins, filterPlugins, formatPluginLine, getUniquePluginAuthors } = require(path.join(__dirname, '../../utils/plugins'));
const { fetchThemes, filterThemes, formatThemeLine, getUniqueThemeAuthors } = require(path.join(__dirname, '../../utils/themes'));

const ITEMS_PER_PAGE = 5;

const TYPES = {
  plugin: {
    label: 'Plugins',
    fetch: fetchPlugins,
    filter: filterPlugins,
    format: formatPluginLine,
    authors: getUniquePluginAuthors
  },
  theme: {
    label: 'Themes',
    fetch: fetchThemes,
    filter: filterThemes,
    format: formatThemeLine,
    authors: getUniqueThemeAuthors
  }
};

function parseType(str) {
  const lower = (str || '').toLowerCase();
  if (lower.startsWith('plugin') || lower === 'p') return 'plugin';
  if (lower.startsWith('theme') || lower === 't') return 'theme';
  return null;
}

function isSupportHelper(member) {
  const roles = member?.roles;
  if (!roles) return false;
  return roles.cache ? roles.cache.has(SUPPORT_HELPER_ROLE) : roles.includes(SUPPORT_HELPER_ROLE);
}

function channelList(ids) {
  const mentions = ids.map(id => `<#${id}>`);
  return mentions.length > 1
    ? `${mentions.slice(0, -1).join(', ')} or ${mentions[mentions.length - 1]}`
    : mentions[0];
}

// Returns null if allowed, otherwise the redirect message
function checkChannel(channelId, type, member) {
    if (isSupportHelper(member)) return null;
    const allowed = PUBLIC_SEARCH_CHANNELS[type];
    if (allowed.includes(channelId)) return null;

    const label = TYPES[type].label;
    if (SEARCH_CHANNELS[type].includes(channelId) && allowed.length === 0) {
        return `Only users with the support helper role can search ${label.toLowerCase()}.`;
    }
    if (allowed.length === 0) {
        return `${label} can only be searched by support helpers in ${channelList(SEARCH_CHANNELS[type])}.`;
    }
    return `${label} can only be searched in ${channelList(allowed)}, since that's where hold to install works.`;
}

function encodeFilter(str) {
  if (!str) return '';
  return Buffer.from(str).toString('base64').replace(/=/g, '');
}

function decodeFilter(str) {
  if (!str) return null;
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function buildRow(type, page, totalPages, search, author) {
  const encodedSearch = encodeFilter(search || '');
  const encodedAuthor = encodeFilter(author || '');

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`search_${type}_prev_${page}_${encodedSearch}_${encodedAuthor}`)
      .setLabel('Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`search_${type}_next_${page}_${encodedSearch}_${encodedAuthor}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages - 1)
  );
}

// Builds the message for a page, or null if nothing matched
async function buildPage(type, page, search, author) {
  const { label, fetch, filter, format } = TYPES[type];
  const filtered = filter(await fetch(), search, author);
  if (filtered.length === 0) return null;

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  page = Math.min(Math.max(page, 0), totalPages - 1);
  const pageItems = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  let content = '';
  if (search || author) {
    const filterText = [];
    if (search) filterText.push(`"${search}"`);
    if (author) filterText.push(`by ${author}`);
    content += `**${label} ${filterText.join(' ')}** (${filtered.length} found, page ${page + 1}/${totalPages})\n\n`;
  } else {
    content += `**All ${label}** (Page ${page + 1}/${totalPages})\n\n`;
  }

  content += pageItems.map(format).join('\n\n');
  content += '\n​\n-# hold this message (not the links) to install';

  return {
    content,
    components: [buildRow(type, page, totalPages, search, author)]
  };
}

async function handleButton(interaction) {
  const parts = interaction.customId.split('_');
  const type = parts[1];
  const action = parts[2];
  if (!TYPES[type]) return;

  let page = parseInt(parts[3]) || 0;
  if (action === 'next') page++;
  if (action === 'prev') page--;

  const result = await buildPage(type, page, decodeFilter(parts[4]), decodeFilter(parts[5]));
  if (!result) {
    return interaction.update({ content: 'No results found.', components: [] });
  }
  await interaction.update(result);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search Aliucord plugins or themes')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('What to search for')
        .setRequired(true)
        .addChoices(
          { name: 'Plugins', value: 'plugin' },
          { name: 'Themes', value: 'theme' }
        ))
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Search by name (plugins also match description)')
        .setRequired(false)
        .setAutocomplete(true))
    .addStringOption(option =>
      option.setName('author')
        .setDescription('Filter by author')
        .setRequired(false)
        .setAutocomplete(true))
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),

  async execute(interaction) {
    const type = interaction.options.getString('type');

    const redirect = checkChannel(interaction.channelId, type, interaction.member);
    if (redirect) {
      return interaction.reply({ content: redirect, flags: MessageFlags.Ephemeral });
    }

    const send = interaction.options.getBoolean('send') ?? false;
    await interaction.deferReply(send ? {} : { flags: MessageFlags.Ephemeral });

    const search = interaction.options.getString('query');
    const author = interaction.options.getString('author');
    const result = await buildPage(type, 0, search, author);
    if (!result) {
      return interaction.editReply(`No ${TYPES[type].label.toLowerCase()} found.`);
    }
    await interaction.editReply(result);
  },

  async executePrefix(message, args) {
    try {
      const type = parseType(args[0]);
      if (!type) {
        await message.reply('Usage: `!search <plugin|theme> [query] [-a author]`');
        return;
      }
      args = args.slice(1);

      const redirect = checkChannel(message.channelId, type, message.member);
      if (redirect) {
        const msg = await message.reply(redirect);
        setTimeout(() => msg.delete().catch(() => {}), 15000);
        return;
      }

      let search = null;
      let author = null;

      const authorIndex = args.indexOf('-a');
      if (authorIndex !== -1) {
        const afterFlag = args.slice(authorIndex + 1);
        const nextFlagIndex = afterFlag.findIndex(a => a.startsWith('-'));
        const authorArgs = nextFlagIndex === -1 ? afterFlag : afterFlag.slice(0, nextFlagIndex);
        author = authorArgs.join(' ').trim() || null;
        search = args.slice(0, authorIndex).join(' ').trim() || null;
      } else {
        search = args.join(' ').trim() || null;
      }

      const result = await buildPage(type, 0, search, author);
      if (!result) {
        await message.reply(`No ${TYPES[type].label.toLowerCase()} found.`);
        return;
      }
      await message.reply(result);
    } catch (err) {
      console.error('Error in search executePrefix:', err);
      await message.reply('There was an error executing this command.').catch(() => {});
    }
  },

  async autocomplete(interaction) {
    try {
      const focusedOption = interaction.options.getFocused(true);
      const searchLower = focusedOption.value.toLowerCase();
      const type = TYPES[interaction.options.getString('type')] ? interaction.options.getString('type') : 'plugin';
      const allItems = await TYPES[type].fetch();

      let names;
      if (focusedOption.name === 'author') {
        names = TYPES[type].authors(allItems);
      } else {
        names = allItems.map(item => item.name);
      }

      const matches = names
        .filter(name => name.toLowerCase().includes(searchLower))
        .slice(0, 25)
        .map(name => ({ name: name.substring(0, 100), value: name.substring(0, 100) }));
      await interaction.respond(matches);
    } catch (err) {
      console.error('Error in search autocomplete:', err);
      await interaction.respond([]).catch(() => {});
    }
  },

  handleButton
};

const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const MANIFEST_URL = 'https://plugins.aliucord.com/manifest.json';

let cachedPlugins = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

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
          plugins.push({
            name: plugin.name,
            description: plugin.description || 'No description',
            url: plugin.url,
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
  let text = `[**${plugin.name}**](${plugin.url})\n`;
  text += plugin.description;
  if (plugin.authors) {
    text += ` - ${plugin.authors}`;
  }
  return text;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugins')
    .setDescription('Browse Aliucord plugins')
    .addStringOption(option =>
      option.setName('search')
        .setDescription('Search for plugins by name, description, or author')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const search = interaction.options.getString('search');
    const allPlugins = await fetchPlugins();
    const plugins = search ? filterPlugins(allPlugins, search) : allPlugins.slice(0, 5);

    if (plugins.length === 0) {
      return interaction.editReply('No plugins found.');
    }

    let content = '';
    if (search) {
      content += `**Search results for: "${search}"**\n\n`;
    }

    plugins.forEach((plugin, index) => {
      content += formatPluginLine(plugin);
      if (index < plugins.length - 1) content += '\n\n';
    });

    await interaction.editReply(content);
  },

  async executePrefix(message, args) {
    const search = args.join(' ') || null;
    const allPlugins = await fetchPlugins();
    const plugins = search ? filterPlugins(allPlugins, search) : allPlugins.slice(0, 5);

    if (plugins.length === 0) {
      return message.reply('No plugins found.');
    }

    let content = '';
    if (search) {
      content += `**Search results for: "${search}"**\n\n`;
    }

    plugins.forEach((plugin, index) => {
      content += formatPluginLine(plugin);
      if (index < plugins.length - 1) content += '\n\n';
    });

    await message.reply(content);
  },

  fetchPlugins,
  filterPlugins,
  initializePluginCache
};

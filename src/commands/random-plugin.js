const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fetchPlugins, filterPlugins } = require('./plugins');

const PLUGINS_PER_PAGE = 5;

const SUPPORTED_CHANNELS = [
  '811261298997460992',
  '847566769258233926',
  '875213883776847873'
];

function isChannelSupported(channelId) {
  return SUPPORTED_CHANNELS.includes(channelId);
}

function formatPluginLine(plugin) {
  let text = `[${plugin.name}](${plugin.url})\n`;
  text += plugin.description;
  if (plugin.authors) {
    text += ` - ${plugin.authors}`;
  }
  return text;
}

function buildPaginationRow(page, totalPages) {
  const row = new ActionRowBuilder();
  
  const prevBtn = new ButtonBuilder()
    .setCustomId(`random_prev_${page}_0`)
    .setLabel('Previous')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === 0);
  
  const nextBtn = new ButtonBuilder()
    .setCustomId(`random_next_${page}_0`)
    .setLabel('Next')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === totalPages - 1);
  
  row.addComponents(prevBtn, nextBtn);
  return row;
}

async function handleRandomButton(interaction, action, page) {
  try {
    const allPlugins = await fetchPlugins();
    const randomIndex = Math.floor(Math.random() * allPlugins.length);
    const randomPlugin = allPlugins[randomIndex];
    
    page = parseInt(page);
    const totalPages = 1; // Only 1 plugin shown at a time

    let content = `**Random Plugin Suggestion**\n\n`;
    content += formatPluginLine(randomPlugin);

    const isSupported = isChannelSupported(interaction.channelId);
    if (isSupported) {
      content += '\n​\n-# hold this message (not the links) to install';
    }

    const row = buildPaginationRow(page, totalPages);
    await interaction.update({ content, components: [row] });
    
    if (!isSupported) {
      try {
        const msg = await interaction.followUp({
          content: 'Use command in <#847566769258233926> for hold-to-install feature',
          flags: MessageFlags.Ephemeral
        });
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      } catch (err) {
        console.error('Error sending info message:', err);
      }
    }
  } catch (err) {
    console.error('Error in handleRandomButton:', err);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('random-plugin')
    .setDescription('Get a random Aliucord plugin suggestion'),
  
  async execute(interaction) {
    const deferOptions = { flags: MessageFlags.Ephemeral };
    await interaction.deferReply(deferOptions);

    try {
      const allPlugins = await fetchPlugins();
      if (allPlugins.length === 0) {
        return interaction.editReply('No plugins available.');
      }

      const randomIndex = Math.floor(Math.random() * allPlugins.length);
      const randomPlugin = allPlugins[randomIndex];

      let content = `**Random Plugin Suggestion**\n\n`;
      content += formatPluginLine(randomPlugin);

      const isSupported = isChannelSupported(interaction.channelId);
      if (isSupported) {
        content += '\n_ _\n-# hold this message (not the links) to install';
      }

      const row = buildPaginationRow(0, 1);
      await interaction.editReply({ content, components: [row] });
      
      if (!isSupported) {
        try {
          const msg = await interaction.followUp({
            content: 'Use command in <#847566769258233926> for hold-to-install feature',
            flags: MessageFlags.Ephemeral
          });
          setTimeout(() => msg.delete().catch(() => {}), 10000);
        } catch (err) {
          console.error('Error sending info message:', err);
        }
      }
    } catch (err) {
      console.error('Error in random-plugin command:', err);
      await interaction.editReply('❌ Failed to fetch plugins.');
    }
  },

  async executePrefix(message) {
    try {
      const allPlugins = await fetchPlugins();
      if (allPlugins.length === 0) {
        return message.reply('No plugins available.');
      }

      const randomIndex = Math.floor(Math.random() * allPlugins.length);
      const randomPlugin = allPlugins[randomIndex];

      let content = `**Random Plugin Suggestion**\n\n`;
      content += formatPluginLine(randomPlugin);

      const isSupported = isChannelSupported(message.channelId);
      if (isSupported) {
        content += '\n_ _\n-# hold this message (not the links) to install';
      }

      const row = buildPaginationRow(0, 1);
      const reply = await message.reply({ content, components: [row] });
      
      if (!isSupported) {
        try {
          const msg = await message.reply({
            content: 'Use command in <#847566769258233926> for hold-to-install feature'
          });
          setTimeout(() => msg.delete().catch(() => {}), 10000);
        } catch (err) {
          console.error('Error sending info message:', err);
        }
      }
    } catch (err) {
      console.error('Error in random-plugin prefix:', err);
      await message.reply('❌ Failed to fetch plugins.');
    }
  },

  handleRandomButton
};

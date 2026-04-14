const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const path = require('path');
const { getPluginReviews, getUserReviews, getPluginAverageRating } = require('../../utils/db');
const { fetchPlugins } = require(path.join(__dirname, '../utility/plugins'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugin-reviews')
    .setDescription('Display plugin reviews for this server'),
  async execute(interaction) {
    // You can expand this logic if desired (basic stub here demonstrates fetchPlugins usage)
    const plugins = await fetchPlugins(interaction.guildId);
    await interaction.reply({
      content: `Plugins on this server: ${plugins.map(p => p.name).join(', ')}`
    });
  }
};

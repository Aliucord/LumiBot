const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const path = require('path');
const { fetchPlugins } = require(path.join(__dirname, '../utility/plugins'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('random-plugin')
    .setDescription('Fetches a random plugin'),
  async execute(interaction) {
    const plugins = await fetchPlugins(interaction.guildId);
    const random = plugins[Math.floor(Math.random() * plugins.length)];
    if (random) {
      await interaction.reply({ content: `Random plugin: ${random.name} - ${random.url}` });
    } else {
      await interaction.reply({ content: 'No plugins found.' });
    }
  }
};

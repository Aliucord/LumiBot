const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const INSTALL_EMBED = {
  title: 'Aliucord Installation',
  description: '**Download the Manager:**\n\n' +
    '[Aliucord Manager](https://github.com/Aliucord/Manager/releases/latest)\n\n' +
    '*Use the manager to install and manage Aliucord*',
  color: 0x3DDC84
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('install')
    .setDescription('Get installation instructions'),

  async execute(interaction) {
    await interaction.reply({
      embeds: [INSTALL_EMBED],
      flags: MessageFlags.Ephemeral
    });
  },

  async executePrefix(message) {
    await message.reply({ embeds: [INSTALL_EMBED] });
  }
};

const { SlashCommandBuilder } = require('discord.js');
const { createMarkdownCommand } = require('../../utils/remoteMarkdown');

const BEGINNER_URL = 'https://github.com/yutaplug/Aliucord/raw/bot/beginner.md';

module.exports = createMarkdownCommand(
  new SlashCommandBuilder()
    .setName('beginner')
    .setDescription('Beginner guide for installing Aliucord, plugins and themes')
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),
  BEGINNER_URL
);

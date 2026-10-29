const { SlashCommandBuilder } = require('discord.js');
const { createMarkdownCommand } = require('../../utils/remoteMarkdown');

const FIXES_URL = 'https://github.com/yutaplug/Aliucord/raw/bot/fixes.md';

module.exports = createMarkdownCommand(
  new SlashCommandBuilder()
    .setName('fixes')
    .setDescription('Plugins that fix broken features')
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),
  FIXES_URL
);

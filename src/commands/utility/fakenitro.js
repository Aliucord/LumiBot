const { SlashCommandBuilder } = require('discord.js');
const { createMarkdownCommand } = require('../../utils/remoteMarkdown');

const FAKENITRO_URL = 'https://github.com/yutaplug/Aliucord/raw/bot/fakenitro.md';

module.exports = createMarkdownCommand(
  new SlashCommandBuilder()
    .setName('fakenitro')
    .setDescription('Get the "fakenitro" plugins for Aliucord')
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),
  FAKENITRO_URL
);

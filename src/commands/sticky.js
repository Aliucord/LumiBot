const { SlashCommandBuilder, MessageFlags, PermissionsBitField } = require('discord.js');
const { initializeStickyManager, setSticky, disableSticky, getSticky } = require('../utils/stickyManager');
const { findChannel } = require('../utils/prefixParser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Manage sticky messages in channels')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set or update the sticky message for a channel')
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('Sticky message content')
            .setRequired(true))
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to set sticky (default: current)')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable sticky message in a channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to disable sticky (default: current)')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('show')
        .setDescription('Show current sticky for a channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to show sticky (default: current)')
            .setRequired(false))),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({
        content: '❌ You need moderator permissions (Manage Messages) to use this command.',
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const guildId = interaction.guildId;

    if (sub === 'set') {
      const message = interaction.options.getString('message');
      const ok = await setSticky(guildId, channel, message);
      if (!ok) return interaction.reply('❌ Failed to set sticky message.');
      return interaction.reply(`✅ Sticky message set in ${channel}`);
    }

    if (sub === 'disable') {
      const ok = await disableSticky(guildId, channel);
      if (!ok) return interaction.reply('❌ Failed to disable sticky message.');
      return interaction.reply(`✅ Sticky message disabled in ${channel}`);
    }

    if (sub === 'show') {
      const cfg = getSticky(channel.id);
      if (!cfg) return interaction.reply(`ℹ️ No sticky message configured in ${channel}.`);
      return interaction.reply({ content: `📌 Sticky in ${channel}:

${cfg.content}`, flags: MessageFlags.Ephemeral });
    }
  },

  async executePrefix(message, args, rawArgs) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply('❌ You need moderator permissions (Manage Messages) to use this command.');
    }

    const sub = (args[0] || '').toLowerCase();
    if (!['set', 'disable', 'show'].includes(sub)) {
      return message.reply('❌ Usage: `!sticky set [#channel] | <message>` | `!sticky disable [#channel]` | `!sticky show [#channel]`');
    }

    let channel = message.channel;
    let rest = rawArgs.slice(sub.length).trim();

    // If a channel mention/name is present before a pipe for set, or as sole arg for disable/show
    const channelMention = rest.match(/^<#\d+>|^\S+/)?.[0];
    if (channelMention && sub !== 'set') {
      const found = findChannel(message.guild, channelMention);
      if (found) {
        channel = found;
        rest = rest.slice(channelMention.length).trim();
      }
    }

    if (sub === 'set') {
      const pipeIdx = rest.indexOf('|');
      if (pipeIdx === -1) {
        return message.reply('❌ Usage: `!sticky set [#channel] | <message>`');
      }

      const maybeChan = rest.slice(0, pipeIdx).trim();
      const found = findChannel(message.guild, maybeChan);
      if (found) channel = found;

      const stickyText = rest.slice(pipeIdx + 1).trim();
      if (!stickyText) return message.reply('❌ Sticky message cannot be empty.');

      const ok = await setSticky(message.guild.id, channel, stickyText);
      if (!ok) return message.reply('❌ Failed to set sticky message.');
      return message.reply(`✅ Sticky message set in ${channel}`);
    }

    if (sub === 'disable') {
      const ok = await disableSticky(message.guild.id, channel);
      if (!ok) return message.reply('❌ Failed to disable sticky message.');
      return message.reply(`✅ Sticky message disabled in ${channel}`);
    }

    if (sub === 'show') {
      const cfg = getSticky(channel.id);
      if (!cfg) return message.reply(`ℹ️ No sticky message configured in ${channel}.`);
      return message.reply(`📌 Sticky in ${channel}:\n\n${cfg.content}`);
    }
  }
};

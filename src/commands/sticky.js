const { SlashCommandBuilder, MessageFlags, PermissionsBitField } = require('discord.js');
const { setSticky, disableSticky } = require('../utils/stickyManager');
const { findChannel } = require('../utils/prefixParser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sticky')
    .setDescription('Manage stickied messages')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add or update a stickied message in a channel')
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('Message content')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('cooldown')
            .setDescription('Cooldown in seconds (default 120)')
            .setMinValue(0)
            .setRequired(false))
        .addBooleanOption(opt =>
          opt.setName('warning')
            .setDescription("Include '**__Stickied Message:__**' header (default on)")
            .setRequired(false))
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Target channel (default: current)')
            .setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove the stickied message from a channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Target channel (default: current)')
            .setRequired(false))),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const perms = interaction.member.permissions;
      const hasModPerms = perms.has(PermissionsBitField.Flags.ManageMessages)
        || perms.has(PermissionsBitField.Flags.ManageGuild)
        || perms.has(PermissionsBitField.Flags.BanMembers)
        || perms.has(PermissionsBitField.Flags.KickMembers);

      if (!hasModPerms) {
        return interaction.editReply({
          content: '❌ You need moderator permissions (Manage Messages) to use this command.'
        });
      }

      const sub = interaction.options.getSubcommand();
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const guildId = interaction.guildId;

      if (sub === 'add') {
        const message = interaction.options.getString('message');
        const cooldown = interaction.options.getInteger('cooldown') ?? 120;
        const warning = interaction.options.getBoolean('warning');
        const res = await setSticky(guildId, channel, message, cooldown, warning == null ? true : warning);
        if (!res?.ok) return interaction.editReply({ content: `❌ Failed to set stickied message: ${res?.error || 'unknown error'}` });
        return interaction.editReply({ content: `✅ Stickied message set in ${channel} (cooldown ${cooldown}s)` });
      }

      if (sub === 'remove') {
        const ok = await disableSticky(guildId, channel);
        if (!ok) return interaction.editReply({ content: '❌ Failed to remove stickied message.' });
        return interaction.editReply({ content: `✅ Removed stickied message from ${channel}` });
      }
    } catch (err) {
      console.error('Error in sticky command:', err);
      return interaction.editReply({ 
        content: `❌ An error occurred: ${err.message || 'unknown error'}`
      }).catch(() => {});
    }
  },

  async executePrefix(message, args, rawArgs) {
    const perms = message.member.permissions;
    const hasModPerms = perms.has(PermissionsBitField.Flags.ManageMessages)
      || perms.has(PermissionsBitField.Flags.ManageGuild)
      || perms.has(PermissionsBitField.Flags.BanMembers)
      || perms.has(PermissionsBitField.Flags.KickMembers);

    if (!hasModPerms) {
      return message.reply('❌ You need moderator permissions (Manage Messages) to use this command.');
    }

    const sub = (args[0] || '').toLowerCase();
    if (!['add', 'remove', 'set', 'disable'].includes(sub)) {
      return message.reply('❌ Usage: `!sticky add [#channel] | <message> [| cooldown=<seconds>] [| warning=true|false]` | `!sticky remove [#channel]`');
    }

    let channel = message.channel;
    let rest = rawArgs.slice(sub.length).trim();

    const channelMention = rest.match(/^<#\d+>|^\S+/)?.[0];
    if (channelMention && !['set', 'add'].includes(sub)) {
      const found = findChannel(message.guild, channelMention);
      if (found) {
        channel = found;
        rest = rest.slice(channelMention.length).trim();
      }
    }

    if (sub === 'set' || sub === 'add') {
      const pipeIdx = rest.indexOf('|');
      if (pipeIdx === -1) {
        return message.reply('❌ Usage: `!sticky add [#channel] | <message> [| cooldown=<seconds>] [| warning=true|false]`');
      }

      const maybeChan = rest.slice(0, pipeIdx).trim();
      const found = findChannel(message.guild, maybeChan);
      if (found) channel = found;

      const remainder = rest.slice(pipeIdx + 1).trim();
      if (!remainder) return message.reply('❌ Sticky message cannot be empty.');

      const parts = remainder.split('|').map(p => p.trim()).filter(Boolean);
      const stickyText = parts[0];
      let cooldown = 120;
      let warning = true;
      for (let i = 1; i < parts.length; i++) {
        const [k, vRaw] = parts[i].split('=').map(s => s?.trim());
        if (!k) continue;
        const kL = k.toLowerCase();
        if (kL === 'cooldown') {
          const v = parseInt(vRaw, 10);
          if (!isNaN(v) && v >= 0) cooldown = v;
        } else if (kL === 'warning') {
          const v = (vRaw || '').toLowerCase();
          if (v === 'true' || v === 'false') warning = v === 'true';
        }
      }

      const res = await setSticky(message.guild.id, channel, stickyText, cooldown, warning);
      if (!res?.ok) return message.reply(`❌ Failed to set stickied message: ${res?.error || 'unknown error'}`);
      return message.reply(`✅ Stickied message set in ${channel} (cooldown ${cooldown}s)`);
    }

    if (sub === 'disable' || sub === 'remove') {
      const ok = await disableSticky(message.guild.id, channel);
      if (!ok) return message.reply('❌ Failed to remove stickied message.');
      return message.reply(`✅ Removed stickied message from ${channel}`);
    }
  }
};

const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');
const path = require('path');
const { minkyIntervals, saveMinkyInterval } = require(path.join(__dirname, '../../utils/db'));
const { parseInterval, sendMinkyToChannel, formatInterval } = require(path.join(__dirname, '../../utils/helpers'));
const { findChannel } = require(path.join(__dirname, '../../utils/prefixParser'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('minkyinterval')
    .setDescription('Schedule automatic Minky images at a set interval')
    .addStringOption(option =>
      option.setName('interval')
        .setDescription('Time interval (e.g., 30m, 1h, 6h, 1d)')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to send Minky images to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)),
  
  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        content: '❌ You need Administrator permissions to use this command.',
        flags: MessageFlags.Ephemeral
      });
    }

    const intervalStr = interaction.options.getString('interval');
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guildId;
    const key = `${guildId}-${channel.id}`;

    const intervalMs = parseInterval(intervalStr);
    if (!intervalMs) {
      return interaction.reply({
        content: '❌ Invalid interval format. Use format like: 30m, 1h, 6h, 1d',
        flags: MessageFlags.Ephemeral
      });
    }

    if (intervalMs < 5 * 60 * 1000) {
      return interaction.reply({
        content: '❌ Minimum interval is 5 minutes (5m).',
        flags: MessageFlags.Ephemeral
      });
    }

    if (minkyIntervals[key]) {
      clearInterval(minkyIntervals[key].timer);
    }

    const timer = setInterval(() => sendMinkyToChannel(channel), intervalMs);
    minkyIntervals[key] = {
      timer,
      interval: intervalStr,
      channelId: channel.id,
      guildId
    };

    await saveMinkyInterval(guildId, channel.id, intervalStr, intervalMs);

    const displayInterval = formatInterval(intervalStr);
    await interaction.reply(`✅ Minky images will be sent to ${channel} every ${displayInterval}! Sending the first one now...`);
    
    await sendMinkyToChannel(channel);
  },

  async executePrefix(message, args) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ You need Administrator permissions to use this command.');
    }

    if (args.length < 2) {
      return message.reply('❌ Usage: `l!minkyinterval <interval> <#channel>`\nExample: `l!minkyinterval 1h #general`');
    }

    const intervalStr = args[0];
    const channel = findChannel(message.guild, args[1]);
    
    if (!channel) {
      return message.reply('❌ Invalid channel. Mention a channel like `#general`.');
    }

    if (channel.type !== ChannelType.GuildText) {
      return message.reply('❌ Please specify a text channel.');
    }

    const guildId = message.guild.id;
    const key = `${guildId}-${channel.id}`;

    const intervalMs = parseInterval(intervalStr);
    if (!intervalMs) {
      return message.reply('❌ Invalid interval format. Use format like: 30m, 1h, 6h, 1d');
    }

    if (intervalMs < 5 * 60 * 1000) {
      return message.reply('❌ Minimum interval is 5 minutes (5m).');
    }

    if (minkyIntervals[key]) {
      clearInterval(minkyIntervals[key].timer);
    }

    const timer = setInterval(() => sendMinkyToChannel(channel), intervalMs);
    minkyIntervals[key] = {
      timer,
      interval: intervalStr,
      channelId: channel.id,
      guildId
    };

    await saveMinkyInterval(guildId, channel.id, intervalStr, intervalMs);

    const displayInterval = formatInterval(intervalStr);
    await message.reply(`✅ Minky images will be sent to ${channel} every ${displayInterval}! Sending the first one now...`);
    
    await sendMinkyToChannel(channel);
  }
};

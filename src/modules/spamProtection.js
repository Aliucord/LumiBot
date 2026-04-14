const userMessageMap = new Map();
const userMediaMap = new Map();

const TIME_WINDOW = 7000;
const MESSAGE_LIMIT = 5; 
const CHANNEL_LIMIT = 3; 
const INVITE_REGEX = /discord(?:\.gg|\.com\/invite)\/(?!uwucord|EsNDvBaHVU|D9uwnFnqmd|n9QQ4XhhJP|0Tmfo5ZbORCRqbAd|sbA3xCJ|rMdz)[a-z0-9-_]+/i;

function isMedia(message) {
  return message.attachments.size > 0 || message.embeds.length > 0;
}

module.exports = {
  checkSpam(message) {
    if (!message.guild || message.author.bot) return false;
    const now = Date.now();
    const key = `${message.guild.id}:${message.author.id}`;
    if (!userMessageMap.has(key)) userMessageMap.set(key, []);
    const msgTimestamps = userMessageMap.get(key);
    msgTimestamps.push(now);
    while (msgTimestamps.length && now - msgTimestamps[0] > TIME_WINDOW) msgTimestamps.shift();
    userMessageMap.set(key, msgTimestamps);
    if (msgTimestamps.length > MESSAGE_LIMIT) return 'general';
    if (isMedia(message)) {
      if (!userMediaMap.has(key)) userMediaMap.set(key, []);
      const entries = userMediaMap.get(key);
      entries.push({ channelId: message.channel.id, timestamp: now });
      while (entries.length && now - entries[0].timestamp > TIME_WINDOW) entries.shift();
      const uniqueChannels = new Set(entries.map(e => e.channelId));
      userMediaMap.set(key, entries);
      if (uniqueChannels.size >= CHANNEL_LIMIT) return 'media';
    }
    if (INVITE_REGEX.test(message.content)) {
      if (!userMediaMap.has(key)) userMediaMap.set(key, []);
      const entries = userMediaMap.get(key);
      entries.push({ channelId: message.channel.id, timestamp: now, invite: true });
      while (entries.length && now - entries[0].timestamp > TIME_WINDOW) entries.shift();
      const inviteChannels = new Set(entries.filter(e => e.invite).map(e => e.channelId));
      userMediaMap.set(key, entries);
      if (inviteChannels.size >= CHANNEL_LIMIT) return 'invite';
    }
    return false;
  },
  async handleSpam(message, type) {
    const member = message.guild.members.cache.get(message.author.id);
    if (!member) return;
    let punishment = 'Softban';
    let actionSuccess = false;
    let errorMsg = null;
    try {
      if (!member.bannable) {
        punishment = 'Mute';
        await member.timeout?.(60 * 60 * 1000, 'Anti-spam/anti-scam mute'); // 1 hour mute fallback
      } else {
        await member.ban({ reason: 'Anti-spam/anti-scam softban', deleteMessageSeconds: 7 * 24 * 60 * 60 }); // delete up to 7 days
        await message.guild.members.unban(member.id, 'Softban unban');
      }
      actionSuccess = true;
    } catch (err) {
      errorMsg = err.message || String(err);
    }

    const { EmbedBuilder, ChannelType } = require('discord.js');
    const logChannelId = '816302304713900062';
    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

    let reasonMsg = 'Attempted to spam in a channel';
    let details = '';
    if (type === 'media') {
      details = 'spamming media in multiple channels (possible scam)';
    } else if (type === 'invite') {
      details = 'spamming Discord invite links in multiple channels';
    } else {
      details = 'sent too many messages in a short time';
    }

    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const msgTimestamps = (userMessageMap.get(key) || []).filter(ts => now - ts <= 7000);
    const count = msgTimestamps.length;
    const timeWindow = (msgTimestamps.length > 1) ? (msgTimestamps[msgTimestamps.length-1] - msgTimestamps[0]) / 1000 : 0;

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${message.author.username} (${message.author.id})`, iconURL: message.author.displayAvatarURL?.() })
      .setTitle('Attempted to spam in a channel')
      .addFields(
        { name: 'In', value: `<#${message.channel.id}>`, inline: false },
        { name: 'Punishment Triggered', value: punishment + (actionSuccess ? '' : ' (Failed)'), inline: false },
        { name: 'Details', value: details, inline: false },
        { name: 'Messages', value: `${count} messages in ${timeWindow.toFixed(3)} seconds`, inline: false }
      )
      .setColor(actionSuccess ? 0xffa500 : 0xff0000)
      .setTimestamp();
    if (errorMsg) {
      embed.addFields({ name: 'Error', value: errorMsg, inline: false });
    }
    await logChannel.send({ embeds: [embed] });
  }
};

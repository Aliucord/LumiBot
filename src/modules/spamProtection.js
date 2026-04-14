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
    if (!member.bannable) {
      await message.channel.send(`${member.user.tag} cannot be softbanned (missing permissions).`);
      return;
    }
    try {
      await member.ban({ reason: 'Anti-spam/anti-scam softban' });
      await message.guild.members.unban(member.id, 'Softban unban');
      let reasonMsg = 'spamming media in multiple channels (possible scam)';
      if (type === 'invite') reasonMsg = 'spamming Discord invite links in multiple channels';
      await message.channel.send(`${member.user.tag} has been softbanned for ${reasonMsg}`);
    } catch (err) {
      await message.channel.send(`Failed to softban ${member.user.tag}.`);
    }
  }
};

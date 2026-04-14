const { client: dbClient, saveStickyMessage, deleteStickyMessage, loadStickyMessages } = require('./db');

const stickies = {};

async function initializeStickyManager() {
  try {
    const rows = await loadStickyMessages();
    for (const row of rows) {
      const cooldownMs = Number(row.cooldown_ms ?? 120000);
      const includeWarning = (row.include_warning == null) ? true : (Number(row.include_warning) !== 0);
      stickies[row.channel_id] = {
        guildId: row.guild_id,
        content: row.content,
        cooldownMs: isNaN(cooldownMs) ? 120000 : cooldownMs,
        includeWarning,
        lastMessageId: row.last_message_id || null,
        lastSentMs: 0
      };
    }
    console.log(`Loaded ${Object.keys(stickies).length} sticky configs`);
  } catch (err) {
    console.error('Error initializing sticky manager:', err.message || err);
  }
}

async function setSticky(guildId, channel, content, cooldownSeconds = 120, includeWarning = true) {
  const channelId = channel.id;
  try {
    const cooldownMs = Math.max(0, Math.floor(Number(cooldownSeconds) || 0) * 1000);

    const saved = await saveStickyMessage(guildId, channelId, content, cooldownMs, includeWarning);
    if (!saved) {
      return { ok: false, error: 'DB_WRITE_FAILED: see server logs' };
    }

    stickies[channelId] = {
      guildId,
      content,
      cooldownMs,
      includeWarning: !!includeWarning,
      lastMessageId: stickies[channelId]?.lastMessageId || null,
      lastSentMs: 0
    };

    return { ok: true };
  } catch (err) {
    const message = err?.message ? String(err.message) : String(err);
    return { ok: false, error: `DB_WRITE_FAILED: ${message}` };
  }
}

async function disableSticky(guildId, channel) {
  const channelId = channel.id;
  try {
    const deleted = await deleteStickyMessage(guildId, channelId);
    if (!deleted) {
      console.error('Error deleting sticky (DB)');
    }

    const lastId = stickies[channelId]?.lastMessageId;
    if (lastId) {
      try {
        const msg = await channel.messages.fetch(lastId);
        if (msg && msg.deletable) await msg.delete();
      } catch (_) {
      }
    }

    delete stickies[channelId];
    return true;
  } catch (err) {
    console.error('Error disabling sticky:', err.message || err);
    return false;
  }
}


async function handleMessage(message) {
  if (!message.guild) return;
  const channelId = message.channel.id;
  const cfg = stickies[channelId];
  if (!cfg) return;

  if (message.author.bot) return;

  const now = Date.now();
  const elapsed = now - (cfg.lastSentMs || 0);
  if (cfg.cooldownMs != null && elapsed < cfg.cooldownMs) return;

  try {
    await repostSticky(message.channel);
    cfg.lastSentMs = now;
  } catch (err) {
    console.error('Error handling sticky on message:', err.message || err);
  }
}

async function repostSticky(channel) {
  const channelId = channel.id;
  const cfg = stickies[channelId];
  if (!cfg) return;

  if (cfg.lastMessageId) {
    try {
      const msg = await channel.messages.fetch(cfg.lastMessageId);
      if (msg && msg.deletable) await msg.delete();
    } catch (_) {
    }
  }

  const content = cfg.includeWarning ? `${cfg.content}\n\n*This is an automated stickied message.*` : cfg.content;

  const sent = await channel.send({ content, allowedMentions: { parse: [] } });

  cfg.lastMessageId = sent.id;
  try {
    if (cfg.guildId) {
      await dbClient.execute({
        sql: 'UPDATE sticky_messages SET last_message_id = ? WHERE guild_id = ? AND channel_id = ?',
        args: [sent.id, cfg.guildId, channelId]
      });
    } else {
      await dbClient.execute({
        sql: 'UPDATE sticky_messages SET last_message_id = ? WHERE channel_id = ?',
        args: [sent.id, channelId]
      });
    }
  } catch (err) {
    console.error('Error updating sticky last_message_id:', err.message || err);
  }
}

module.exports = {
  initializeStickyManager,
  setSticky,
  disableSticky,
  handleMessage
};

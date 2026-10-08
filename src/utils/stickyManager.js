const { client: dbClient, saveStickyMessage, deleteStickyMessage, loadStickyMessages } = require('./db');

const stickies = {};

async function initializeStickyManager() {
  try {
    const rows = await loadStickyMessages();
    for (const row of rows) {
      const includeWarning = (row.include_warning == null) ? true : (Number(row.include_warning) !== 0);
      stickies[row.channel_id] = {
        guildId: row.guild_id,
        content: row.content,
        includeWarning,
        lastMessageId: row.last_message_id || null,
        reposting: false,
        pending: false
      };
    }
    console.log(`Loaded ${Object.keys(stickies).length} sticky configs`);
  } catch (err) {
    console.error('Error initializing sticky manager:', err.message || err);
  }
}

async function setSticky(guildId, channel, content, includeWarning = true) {
  const channelId = channel.id;
  try {
    const saved = await saveStickyMessage(guildId, channelId, content, 0, includeWarning);
    if (!saved) {
      return { ok: false, error: 'DB_WRITE_FAILED: see server logs' };
    }

    // Update in place so a repost already running for this channel keeps its lock
    const cfg = stickies[channelId] || (stickies[channelId] = {
      lastMessageId: null,
      reposting: false,
      pending: false
    });
    cfg.guildId = guildId;
    cfg.content = content;
    cfg.includeWarning = !!includeWarning;

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

  // Only one repost per channel at a time; messages arriving mid-repost trigger a single
  // follow-up repost instead of each deleting the same old sticky and posting duplicates
  if (cfg.reposting) {
    cfg.pending = true;
    return;
  }

  cfg.reposting = true;
  try {
    do {
      cfg.pending = false;
      try {
        await repostSticky(message.channel);
      } catch (err) {
        console.error('Error handling sticky on message:', err.message || err);
      }
    } while (cfg.pending && stickies[channelId] === cfg);
  } finally {
    cfg.reposting = false;
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

  // Sticky was removed while this repost was in flight
  if (stickies[channelId] !== cfg) {
    await sent.delete().catch(() => {});
    return;
  }

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

const { createClient } = require('@libsql/client');
require('dotenv').config();

// Connect to Turso database
const client = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const responders = {};
const minkyIntervals = {};

async function initializeDatabase() {
  try {
    // Create autoresponders table if it doesn't exist
    console.log('Creating autoresponders table...');
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS autoresponders (
        guild_id TEXT NOT NULL,
        trigger_phrase TEXT NOT NULL,
        response TEXT NOT NULL,
        channel_id TEXT,
        PRIMARY KEY (guild_id, trigger_phrase, channel_id)
      )`,
      args: []
    });
    console.log('✓ Autoresponders table created');

    // Create minky_intervals table if it doesn't exist
    console.log('Creating minky_intervals table...');
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS minky_intervals (
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        interval_str TEXT NOT NULL,
        interval_ms INTEGER NOT NULL,
        PRIMARY KEY (guild_id, channel_id)
      )`,
      args: []
    });
    console.log('✓ Minky intervals table created');

    // Create bot_status table if it doesn't exist
    console.log('Creating bot_status table...');
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS bot_status (
        status TEXT NOT NULL,
        activity TEXT NOT NULL,
        message TEXT NOT NULL
      )`,
      args: []
    });
    console.log('✓ Bot status table created');

    console.log('✓ Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err.message || err);
  }
}

async function loadAutoresponders() {
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM autoresponders',
      args: []
    });
    for (const row of result.rows) {
      if (!responders[row.guild_id]) responders[row.guild_id] = [];
      responders[row.guild_id].push({
        trigger: row.trigger_phrase,
        response: row.response,
        channelId: row.channel_id
      });
    }
    console.log(`Loaded ${result.rows.length} autoresponders from database`);
  } catch (err) {
    console.error('Error loading autoresponders:', err.message || err);
  }
}

async function saveAutoresponder(guildId, trigger, response, channelId) {
  try {
    await client.execute({
      sql: 'INSERT OR REPLACE INTO autoresponders (guild_id, trigger_phrase, response, channel_id) VALUES (?, ?, ?, ?)',
      args: [guildId, trigger, response, channelId]
    });
  } catch (err) {
    console.error('Error saving autoresponder:', err);
  }
}

async function deleteAutoresponderFromDb(guildId, trigger, channelId) {
  try {
    if (channelId) {
      await client.execute({
        sql: 'DELETE FROM autoresponders WHERE guild_id = ? AND trigger_phrase = ? AND channel_id = ?',
        args: [guildId, trigger, channelId]
      });
    } else {
      await client.execute({
        sql: 'DELETE FROM autoresponders WHERE guild_id = ? AND trigger_phrase = ? AND channel_id IS NULL',
        args: [guildId, trigger]
      });
    }
  } catch (err) {
    console.error('Error deleting autoresponder:', err);
  }
}

async function saveMinkyInterval(guildId, channelId, intervalStr, intervalMs) {
  try {
    await client.execute({
      sql: 'INSERT OR REPLACE INTO minky_intervals (guild_id, channel_id, interval_str, interval_ms) VALUES (?, ?, ?, ?)',
      args: [guildId, channelId, intervalStr, intervalMs]
    });
  } catch (err) {
    console.error('Error saving minky interval:', err);
  }
}

async function deleteMinkyIntervalFromDb(guildId, channelId) {
  try {
    await client.execute({
      sql: 'DELETE FROM minky_intervals WHERE guild_id = ? AND channel_id = ?',
      args: [guildId, channelId]
    });
  } catch (err) {
    console.error('Error deleting minky interval:', err);
  }
}

async function loadMinkyIntervalsFromDb() {
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM minky_intervals',
      args: []
    });
    return result.rows;
  } catch (err) {
    console.error('Error loading minky intervals:', err.message || err);
    return [];
  }
}

async function saveBotStatus(status, activity, message) {
  try {
    await client.execute('DELETE FROM bot_status');
    await client.execute({
      sql: 'INSERT INTO bot_status (status, activity, message) VALUES (?, ?, ?)',
      args: [status, activity, message]
    });
  } catch (err) {
    console.error('Error saving bot status:', err);
  }
}

async function loadBotStatus() {
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM bot_status LIMIT 1',
      args: []
    });
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error loading bot status:', err.message || err);
    return null;
  }
}

module.exports = {
  client,
  responders,
  minkyIntervals,
  initializeDatabase,
  loadAutoresponders,
  saveAutoresponder,
  deleteAutoresponderFromDb,
  saveMinkyInterval,
  deleteMinkyIntervalFromDb,
  loadMinkyIntervalsFromDb,
  saveBotStatus,
  loadBotStatus
};

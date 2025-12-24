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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        trigger_phrase TEXT NOT NULL,
        response TEXT NOT NULL,
        channel_id TEXT,
        UNIQUE(guild_id, trigger_phrase, channel_id)
      )`,
      args: []
    });
    console.log('✓ Autoresponders table created');

    // Create minky_intervals table if it doesn't exist
    console.log('Creating minky_intervals table...');
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS minky_intervals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        interval_str TEXT NOT NULL,
        interval_ms INTEGER NOT NULL,
        UNIQUE(guild_id, channel_id)
      )`,
      args: []
    });
    console.log('✓ Minky intervals table created');

    // Create bot_status table if it doesn't exist
    console.log('Creating bot_status table...');
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS bot_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL,
        activity TEXT NOT NULL,
        message TEXT NOT NULL
      )`,
      args: []
    });
    console.log('✓ Bot status table created');

    console.log('Creating plugin_reviews table...');
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS plugin_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plugin_name TEXT NOT NULL,
        user_id TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        review TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(plugin_name, user_id)
      )`,
      args: []
    });
    console.log('✓ Plugin reviews table created');
    
    // Create sticky_messages table if it doesn't exist
    console.log('Creating sticky_messages table...');
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS sticky_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        content TEXT NOT NULL,
        last_message_id TEXT,
        UNIQUE(guild_id, channel_id)
      )`,
      args: []
    });
    console.log('✓ Sticky messages table created');

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

async function savePluginReview(pluginName, userId, rating, review) {
  try {
    await client.execute({
      sql: 'INSERT OR REPLACE INTO plugin_reviews (plugin_name, user_id, rating, review, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
      args: [pluginName.toLowerCase(), userId, rating, review || null]
    });
    return true;
  } catch (err) {
    console.error('Error saving plugin review:', err);
    return false;
  }
}

async function getPluginReviews(pluginName, sortBy = 'date') {
  try {
    const orderClause = sortBy === 'rating' ? 'rating DESC, created_at DESC' : 'created_at DESC';
    const result = await client.execute({
      sql: `SELECT * FROM plugin_reviews WHERE plugin_name = ? ORDER BY ${orderClause}`,
      args: [pluginName.toLowerCase()]
    });
    return result.rows;
  } catch (err) {
    console.error('Error getting plugin reviews:', err.message || err);
    return [];
  }
}

async function getUserReviews(userId) {
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM plugin_reviews WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId]
    });
    return result.rows;
  } catch (err) {
    console.error('Error getting user reviews:', err.message || err);
    return [];
  }
}

async function getReviewById(reviewId) {
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM plugin_reviews WHERE id = ?',
      args: [reviewId]
    });
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error getting review by id:', err.message || err);
    return null;
  }
}

async function deleteReview(reviewId) {
  try {
    await client.execute({
      sql: 'DELETE FROM plugin_reviews WHERE id = ?',
      args: [reviewId]
    });
    return true;
  } catch (err) {
    console.error('Error deleting review:', err);
    return false;
  }
}

async function getPluginAverageRating(pluginName) {
  try {
    const result = await client.execute({
      sql: 'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM plugin_reviews WHERE plugin_name = ?',
      args: [pluginName.toLowerCase()]
    });
    const row = result.rows[0];
    return {
      avgRating: row?.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null,
      reviewCount: row?.review_count || 0
    };
  } catch (err) {
    console.error('Error getting plugin average rating:', err.message || err);
    return { avgRating: null, reviewCount: 0 };
  }
}

async function getTopReviewedPlugins(limit = 5) {
  try {
    const result = await client.execute({
      sql: `SELECT plugin_name, COUNT(*) as review_count, AVG(rating) as avg_rating 
            FROM plugin_reviews 
            GROUP BY plugin_name 
            ORDER BY review_count DESC, avg_rating DESC 
            LIMIT ?`,
      args: [limit]
    });
    return result.rows.map(row => ({
      pluginName: row.plugin_name,
      reviewCount: row.review_count,
      avgRating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : null
    }));
  } catch (err) {
    console.error('Error getting top reviewed plugins:', err.message || err);
    return [];
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
  loadBotStatus,
  savePluginReview,
  getPluginReviews,
  getUserReviews,
  getReviewById,
  deleteReview,
  getPluginAverageRating,
  getTopReviewedPlugins
};

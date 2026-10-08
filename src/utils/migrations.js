const runMigrations = async (client) => {
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS _migrations (
            id TEXT PRIMARY KEY,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
          )`,
    args: []
  });

  const applied = new Set();
  try {
    const res = await client.execute({ sql: 'SELECT id FROM _migrations', args: [] });
    for (const row of res.rows) {
      applied.add(row.id);
    }
  } catch (_) {}

  const migrations = [
    {
      id: '0001_sticky_init',
      run: async () => {
        await client.execute({
          sql: `CREATE TABLE IF NOT EXISTS sticky_messages (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  guild_id TEXT NOT NULL,
                  channel_id TEXT NOT NULL,
                  content TEXT NOT NULL,
                  last_message_id TEXT,
                  cooldown_ms INTEGER NOT NULL DEFAULT 120000,
                  include_warning INTEGER NOT NULL DEFAULT 1,
                  UNIQUE(guild_id, channel_id)
                )`,
          args: []
        });
      }
    },
    {
      id: '0002_sticky_add_columns',
      run: async () => {
        const info = await client.execute({ sql: 'PRAGMA table_info(sticky_messages)', args: [] });
        const cols = new Set(info.rows.map(r => r.name || r.column_name || r[1]));
        if (!cols.has('guild_id')) {
          await client.execute({ sql: 'ALTER TABLE sticky_messages ADD COLUMN guild_id TEXT NOT NULL DEFAULT ""', args: [] });
        }
        if (!cols.has('channel_id')) {
          await client.execute({ sql: 'ALTER TABLE sticky_messages ADD COLUMN channel_id TEXT NOT NULL DEFAULT ""', args: [] });
        }
        if (!cols.has('content')) {
          await client.execute({ sql: 'ALTER TABLE sticky_messages ADD COLUMN content TEXT NOT NULL DEFAULT ""', args: [] });
        }
        if (!cols.has('last_message_id')) {
          await client.execute({ sql: 'ALTER TABLE sticky_messages ADD COLUMN last_message_id TEXT', args: [] });
        }
        if (!cols.has('cooldown_ms')) {
          await client.execute({ sql: 'ALTER TABLE sticky_messages ADD COLUMN cooldown_ms INTEGER NOT NULL DEFAULT 120000', args: [] });
        }
        if (!cols.has('include_warning')) {
          await client.execute({ sql: 'ALTER TABLE sticky_messages ADD COLUMN include_warning INTEGER NOT NULL DEFAULT 1', args: [] });
        }
      }
    },
    {
      // db.js reads/writes message_content (the column name in the original production table),
      // but fresh databases were created with only `content`
      id: '0003_sticky_message_content',
      run: async () => {
        const info = await client.execute({ sql: 'PRAGMA table_info(sticky_messages)', args: [] });
        const cols = new Set(info.rows.map(r => r.name || r.column_name || r[1]));
        if (!cols.has('message_content')) {
          await client.execute({ sql: "ALTER TABLE sticky_messages ADD COLUMN message_content TEXT NOT NULL DEFAULT ''", args: [] });
        }
      }
    }
  ];

  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    console.log(`Applying migration ${m.id}...`);
    try {
      await m.run();
      await client.execute({ sql: 'INSERT INTO _migrations (id) VALUES (?)', args: [m.id] });
      console.log(`✓ Migration ${m.id} applied`);
    } catch (err) {
      console.error(`Migration ${m.id} failed:`, err.message || err);
      // Don't throw - continue to next migration
    }
  }
};

module.exports = { runMigrations };

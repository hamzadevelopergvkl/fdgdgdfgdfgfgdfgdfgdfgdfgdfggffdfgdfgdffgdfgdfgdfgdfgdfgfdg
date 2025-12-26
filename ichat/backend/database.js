const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let db;

async function initDB() {
  db = await open({
    filename: path.join(__dirname, 'instachat.sqlite'),
                  driver: sqlite3.Database
  });

  await db.exec('PRAGMA foreign_keys = ON;');

  // Create Users Table
  await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    public_key TEXT,
    bio TEXT DEFAULT '',
    website TEXT DEFAULT '',
    timezone TEXT DEFAULT 'UTC',
    theme_color TEXT DEFAULT 'formal',
    is_online INTEGER DEFAULT 0,
    last_seen TEXT,
    is_private INTEGER DEFAULT 0,
    language TEXT DEFAULT 'English',
    auto_translate INTEGER DEFAULT 0,
    high_contrast INTEGER DEFAULT 0,
    data_saver INTEGER DEFAULT 0,
    font_size TEXT DEFAULT 'default',
    push_likes INTEGER DEFAULT 1,
    push_comments INTEGER DEFAULT 1,
    push_followers INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `);

  // Explicit Migrations for User Columns (Handles existing DBs that lack new columns)
  const userMigrations = [
    'public_key TEXT',
    'bio TEXT DEFAULT ""',
    'website TEXT DEFAULT ""',
    'timezone TEXT DEFAULT "UTC"',
    'is_private INTEGER DEFAULT 0',
    'language TEXT DEFAULT "English"',
    'auto_translate INTEGER DEFAULT 0',
    'high_contrast INTEGER DEFAULT 0',
    'data_saver INTEGER DEFAULT 0',
    'font_size TEXT DEFAULT "default"',
    'push_likes INTEGER DEFAULT 1',
    'push_comments INTEGER DEFAULT 1',
    'push_followers INTEGER DEFAULT 1'
  ];

  for (const colDef of userMigrations) {
    const colName = colDef.split(' ')[0];
    try {
      await db.exec(`ALTER TABLE users ADD COLUMN ${colDef}`);
      console.log(`Added column ${colName} to users table`);
    } catch (e) {
      // Column already exists or table is locked
    }
  }

  // Seed Bot User
  try {
    await db.run(`
    INSERT OR IGNORE INTO users (id, username, email, password, display_name, avatar_url, is_online, bio)
    VALUES (0, 'ai_assistant', 'bot@shadow.ai', 'system_protected_bot', 'AI Assistant', 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png', 1, 'Your personal AI helper.')
    `);
  } catch (e) { console.error("Bot seeding error:", e); }

  await db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT,
    is_request INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `);

  await db.exec(`
  CREATE TABLE IF NOT EXISTS chat_participants (
    chat_id INTEGER,
    user_id INTEGER,
    FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
                                                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                                                PRIMARY KEY (chat_id, user_id)
  );
  `);

  await db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    sender_id INTEGER,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    status TEXT DEFAULT 'sent',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,
    reactions TEXT DEFAULT '{}',
    FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
                                       FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
  );
  `);

  // Explicit Migrations for Message Columns
  const messageMigrations = [
    'status TEXT DEFAULT "sent"',
    'expires_at TEXT',
    'reactions TEXT DEFAULT "{}"'
  ];
  for (const colDef of messageMigrations) {
    const colName = colDef.split(' ')[0];
    try { await db.exec(`ALTER TABLE messages ADD COLUMN ${colDef}`); } catch (e) { /* Column already exists */ }
  }

  await db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    image_url TEXT NOT NULL,
    caption TEXT,
    location TEXT,
    filter_class TEXT DEFAULT '',
    type TEXT DEFAULT 'image',
    likes_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  `);

  await db.exec(`
  CREATE TABLE IF NOT EXISTS post_likes (
    user_id INTEGER,
    post_id INTEGER,
    PRIMARY KEY (user_id, post_id),
                                         FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                                         FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
  );
  `);

  await db.exec(`
  CREATE TABLE IF NOT EXISTS post_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    post_id INTEGER,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                                            FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
  );
  `);

  await db.exec(`
  CREATE TABLE IF NOT EXISTS saved_posts (
    user_id INTEGER,
    post_id INTEGER,
    PRIMARY KEY (user_id, post_id),
                                          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                                          FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
  );
  `);

  await db.exec(`
  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER,
    following_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
                                      FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE,
                                      FOREIGN KEY(following_id) REFERENCES users(id) ON DELETE CASCADE
  );
  `);

  await db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    actor_id INTEGER NOT NULL,
    post_id INTEGER,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                                            FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE CASCADE
  );
  `);

  console.log('✅ SQLite Connected & Tables Initialized');
  return db;
}

function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initDB, getDB };

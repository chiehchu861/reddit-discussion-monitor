require('dotenv').config();
const Snoowrap = require('snoowrap');
const TelegramBot = require('node-telegram-bot-api');
const Database = require('better-sqlite3');
const path = require('path');

// --- Configuration ---
const SUBREDDITS = (process.env.SUBREDDITS || '').split(',').filter(Boolean);
const KEYWORDS = (process.env.KEYWORDS || '').split(',').filter(Boolean);
const MIN_SCORE = parseInt(process.env.MIN_RELEVANCE_SCORE || '6', 10);
const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL_HOURS || '8', 10) * 3600 * 1000;
const DATA_RETENTION_HOURS = 48; // Reddit data policy compliance

// --- Reddit client (read-only) ---
const reddit = new Snoowrap({
  userAgent: 'reddit-discussion-monitor/0.1.0',
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

// --- Telegram notifications ---
const telegram = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const chatId = process.env.TELEGRAM_CHAT_ID;

// --- Local database ---
const db = new Database(path.join(__dirname, 'data', 'discoveries.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS discoveries (
    id TEXT PRIMARY KEY,
    subreddit TEXT,
    title TEXT,
    url TEXT,
    score INTEGER,
    relevance INTEGER,
    discovered_at TEXT DEFAULT (datetime('now')),
    notified INTEGER DEFAULT 0
  )
`);

// Purge records older than 48 hours (Reddit data policy)
function purgeOldRecords() {
  db.prepare(`DELETE FROM discoveries WHERE discovered_at < datetime('now', '-${DATA_RETENTION_HOURS} hours')`).run();
}

// --- Relevance scoring (keyword match, simple heuristic) ---
function scoreRelevance(title, selftext) {
  const text = `${title} ${selftext}`.toLowerCase();
  let score = 0;
  for (const kw of KEYWORDS) {
    if (text.includes(kw.toLowerCase())) score += 3;
  }
  // Bonus for question-like posts
  if (text.includes('?') || text.includes('how to') || text.includes('looking for') || text.includes('recommend')) {
    score += 2;
  }
  return Math.min(score, 10);
}

// --- Search subreddits ---
async function searchSubreddits() {
  const results = [];

  for (const sub of SUBREDDITS) {
    for (const keyword of KEYWORDS) {
      try {
        const posts = await reddit.getSubreddit(sub).search({
          query: keyword,
          sort: 'new',
          time: 'day',
          limit: 10,
        });

        for (const post of posts) {
          const relevance = scoreRelevance(post.title, post.selftext || '');
          if (relevance >= MIN_SCORE) {
            results.push({
              id: post.id,
              subreddit: sub,
              title: post.title,
              url: `https://reddit.com${post.permalink}`,
              score: post.score,
              relevance,
            });
          }
        }
      } catch (err) {
        console.error(`Error searching r/${sub} for "${keyword}":`, err.message);
      }
    }
  }

  return results;
}

// --- Store and deduplicate ---
function storeResults(results) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO discoveries (id, subreddit, title, url, score, relevance)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let newCount = 0;
  for (const r of results) {
    const info = insert.run(r.id, r.subreddit, r.title, r.url, r.score, r.relevance);
    if (info.changes > 0) newCount++;
  }
  return newCount;
}

// --- Send Telegram digest ---
async function sendDigest(newCount) {
  const pending = db.prepare(`
    SELECT * FROM discoveries WHERE notified = 0 ORDER BY relevance DESC LIMIT 20
  `).all();

  if (pending.length === 0) {
    console.log('No new discoveries to notify.');
    return;
  }

  let message = `📋 *Reddit Monitor Digest*\n${newCount} new discoveries\n\n`;
  for (const p of pending) {
    message += `• [${p.relevance}/10] r/${p.subreddit}\n  ${p.title}\n  ${p.url}\n\n`;
  }

  await telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  const markNotified = db.prepare('UPDATE discoveries SET notified = 1 WHERE id = ?');
  for (const p of pending) {
    markNotified.run(p.id);
  }
}

// --- Main ---
async function run() {
  console.log(`[${new Date().toISOString()}] Starting scan...`);

  purgeOldRecords();
  const results = await searchSubreddits();
  const newCount = storeResults(results);

  console.log(`Found ${results.length} relevant posts, ${newCount} new.`);

  if (newCount > 0) {
    await sendDigest(newCount);
  }
}

// Run once or on interval
const once = process.argv.includes('--once');
if (once) {
  run().catch(console.error);
} else {
  run().catch(console.error);
  setInterval(() => run().catch(console.error), SCAN_INTERVAL);
  console.log(`Monitor running. Scanning every ${SCAN_INTERVAL / 3600000} hours.`);
}

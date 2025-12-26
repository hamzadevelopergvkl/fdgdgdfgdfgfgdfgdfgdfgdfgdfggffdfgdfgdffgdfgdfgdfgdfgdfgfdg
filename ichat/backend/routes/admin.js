const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// GLOBAL WIPE - RESETS ENTIRE APP
router.post('/reset', async (req, res) => {
  const db = getDB();
  try {
    await db.exec('DELETE FROM users');
    await db.exec('DELETE FROM chats');
    await db.exec('DELETE FROM chat_participants');
    await db.exec('DELETE FROM messages');
    await db.exec('DELETE FROM posts');
    await db.exec('DELETE FROM post_likes');
    await db.exec('DELETE FROM post_comments');
    await db.exec('DELETE FROM saved_posts');
    await db.exec('DELETE FROM follows');
    await db.exec('DELETE FROM notifications');
    
    // Reset sequences
    await db.exec('DELETE FROM sqlite_sequence');
    
    res.json({ msg: 'Application reset successfully. All data deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error during wipe');
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../database');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  const { username, email, password, displayName, publicKey } = req.body;
  const db = getDB();

  try {
    // Check if user exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser) return res.status(400).json({ msg: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
    
    const result = await db.run(
      `INSERT INTO users (username, email, password, display_name, avatar_url, public_key) VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, displayName, avatarUrl, publicKey]
    );

    const userId = result.lastID;
    const payload = { user: { id: userId } };
    
    jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ 
        token, 
        user: { 
            id: String(userId), 
            username, 
            displayName, 
            avatarUrl, 
            publicKey, 
            settings: { timezone: 'UTC', language: 'English' } // Defaults
        } 
      });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = getDB();

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      
      const settings = {
          isPrivate: Boolean(user.is_private),
          language: user.language,
          autoTranslate: Boolean(user.auto_translate),
          timezone: user.timezone,
          themeColor: user.theme_color,
          highContrast: Boolean(user.high_contrast),
          dataSaver: Boolean(user.data_saver),
          fontSize: user.font_size,
          pushLikes: Boolean(user.push_likes),
          pushComments: Boolean(user.push_comments),
          pushFollowers: Boolean(user.push_followers)
      };

      res.json({ 
        token, 
        user: { 
          id: String(user.id), 
          username: user.username, 
          displayName: user.display_name, 
          avatarUrl: user.avatar_url,
          publicKey: user.public_key,
          settings: settings
        } 
      });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update Public Key
router.put('/key', auth, async (req, res) => {
    const { publicKey } = req.body;
    const db = getDB();
    try {
        await db.run('UPDATE users SET public_key = ? WHERE id = ?', [publicKey, req.user.id]);
        res.json({ msg: 'Public key updated' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update Profile & Settings
router.put('/me', auth, async (req, res) => {
    const { 
        displayName, avatarUrl, bio, website,
        isPrivate, language, autoTranslate, timezone, 
        highContrast, dataSaver, fontSize, 
        pushLikes, pushComments, pushFollowers 
    } = req.body;

    const db = getDB();
    try {
        await db.run(`
            UPDATE users SET 
            display_name = ?, avatar_url = ?, bio = ?, website = ?,
            is_private = ?, language = ?, auto_translate = ?, timezone = ?,
            high_contrast = ?, data_saver = ?, font_size = ?,
            push_likes = ?, push_comments = ?, push_followers = ?
            WHERE id = ?`, 
            [
                displayName, avatarUrl, bio, website,
                isPrivate, language, autoTranslate, timezone,
                highContrast, dataSaver, fontSize,
                pushLikes, pushComments, pushFollowers,
                req.user.id
            ]);
        
        const u = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
        
        const settings = {
            isPrivate: Boolean(u.is_private),
            language: u.language,
            autoTranslate: Boolean(u.auto_translate),
            timezone: u.timezone,
            themeColor: u.theme_color,
            highContrast: Boolean(u.high_contrast),
            dataSaver: Boolean(u.data_saver),
            fontSize: u.font_size,
            pushLikes: Boolean(u.push_likes),
            pushComments: Boolean(u.push_comments),
            pushFollowers: Boolean(u.push_followers)
        };

        res.json({
            id: String(u.id),
            username: u.username,
            displayName: u.display_name,
            avatarUrl: u.avatar_url,
            publicKey: u.public_key,
            isOnline: Boolean(u.is_online),
            settings
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get Current User
router.get('/me', auth, async (req, res) => {
  const db = getDB();
  try {
    const u = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!u) return res.status(404).json({ msg: 'User not found' });
    
    const settings = {
        isPrivate: Boolean(u.is_private),
        language: u.language,
        autoTranslate: Boolean(u.auto_translate),
        timezone: u.timezone,
        themeColor: u.theme_color,
        highContrast: Boolean(u.high_contrast),
        dataSaver: Boolean(u.data_saver),
        fontSize: u.font_size,
        pushLikes: Boolean(u.push_likes),
        pushComments: Boolean(u.push_comments),
        pushFollowers: Boolean(u.push_followers)
    };

    const formattedUser = {
      id: String(u.id),
      username: u.username,
      email: u.email,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      publicKey: u.public_key,
      isOnline: Boolean(u.is_online),
      lastSeen: u.last_seen,
      settings
    };
    
    res.json(formattedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
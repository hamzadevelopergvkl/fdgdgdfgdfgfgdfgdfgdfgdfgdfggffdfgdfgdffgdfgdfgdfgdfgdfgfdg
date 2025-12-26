const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDB } = require('../database');

// Get all chats for user
router.get('/', auth, async (req, res) => {
  const db = getDB();
  const userId = req.user.id;

  try {
    const chats = await db.all(`
    SELECT c.id, c.type, c.name, c.is_request, c.updated_at
    FROM chats c
    JOIN chat_participants cp ON c.id = cp.chat_id
    WHERE cp.user_id = ?
    ORDER BY c.updated_at DESC
    `, [userId]);

    const formattedChats = [];
    const nowISO = new Date().toISOString();

    for (let chat of chats) {
      const participants = await db.all(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, u.public_key, u.is_online, u.last_seen, u.timezone
      FROM users u
      JOIN chat_participants cp ON u.id = cp.user_id
      WHERE cp.chat_id = ?
      `, [chat.id]);

      const lastMessage = await db.get(`
      SELECT * FROM messages 
      WHERE chat_id = ? 
      AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY created_at DESC LIMIT 1
      `, [chat.id, nowISO]);

      const unread = await db.get(`
        SELECT count(*) as count FROM messages 
        WHERE chat_id = ? AND sender_id != ? AND status != 'read'
      `, [chat.id, userId]);

      formattedChats.push({
        id: String(chat.id),
        type: chat.type,
        name: chat.name,
        isRequest: Boolean(chat.is_request),
        participants: participants.map(p => ({
          id: String(p.id),
          username: p.username,
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
          publicKey: p.public_key,
          timezone: p.timezone,
          isOnline: Boolean(p.is_online),
          lastSeen: p.last_seen
        })),
        lastMessage: lastMessage ? {
          id: String(lastMessage.id),
          content: lastMessage.content,
          type: lastMessage.type,
          status: lastMessage.status,
          timestamp: lastMessage.created_at,
          senderId: String(lastMessage.sender_id)
        } : null,
        unreadCount: unread ? unread.count : 0 
      });
    }

    res.json(formattedChats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create or Get Direct Chat
router.post('/direct', auth, async (req, res) => {
  const { recipientId } = req.body;
  const db = getDB();
  const myId = req.user.id;

  try {
    let existingChat = await db.get(`
      SELECT c.id FROM chats c
      JOIN chat_participants cp1 ON c.id = cp1.chat_id
      JOIN chat_participants cp2 ON c.id = cp2.chat_id
      WHERE c.type = 'direct'
      AND cp1.user_id = ?
      AND cp2.user_id = ?
    `, [myId, recipientId]);

    let chatId;

    if (existingChat) {
      chatId = existingChat.id;
    } else {
        const result = await db.run(`INSERT INTO chats (type, is_request) VALUES ('direct', 1)`);
        chatId = result.lastID;
        await db.run(`INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)`, [chatId, myId]);
        await db.run(`INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)`, [chatId, recipientId]);
    }

    const participants = await db.all(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.public_key, u.is_online, u.timezone
    FROM users u
    JOIN chat_participants cp ON u.id = cp.user_id
    WHERE cp.chat_id = ?
    `, [chatId]);

    res.json({
      id: String(chatId),
      type: 'direct',
      participants: participants.map(p => ({
        id: String(p.id),
        username: p.username,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        publicKey: p.public_key,
        timezone: p.timezone,
        isOnline: Boolean(p.is_online)
      })),
      isRequest: !existingChat
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Accept Chat Request
router.put('/:chatId/accept', auth, async (req, res) => {
  const db = getDB();
  try {
    const participant = await db.get('SELECT * FROM chat_participants WHERE chat_id = ? AND user_id = ?', [req.params.chatId, req.user.id]);
    if (!participant) return res.status(403).json({ msg: 'Not authorized' });

    await db.run('UPDATE chats SET is_request = 0 WHERE id = ?', [req.params.chatId]);
    res.json({ msg: 'Chat accepted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete Chat
router.delete('/:chatId', auth, async (req, res) => {
  const db = getDB();
  try {
    await db.run('DELETE FROM chat_participants WHERE chat_id = ? AND user_id = ?', [req.params.chatId, req.user.id]);
    const remaining = await db.get('SELECT count(*) as count FROM chat_participants WHERE chat_id = ?', [req.params.chatId]);
    if (remaining.count === 0) {
        await db.run('DELETE FROM chats WHERE id = ?', [req.params.chatId]);
    }
    res.json({ msg: 'Chat deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Mark Messages as Read
router.put('/:chatId/read', auth, async (req, res) => {
    const db = getDB();
    const userId = req.user.id;
    try {
        await db.run(
            `UPDATE messages SET status = 'read' WHERE chat_id = ? AND sender_id != ? AND status != 'read'`,
            [req.params.chatId, userId]
        );
        res.json({ msg: 'Messages marked as read' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get Messages for a Chat
router.get('/:chatId/messages', auth, async (req, res) => {
  const db = getDB();
  try {
    const nowISO = new Date().toISOString();
    await db.run(`DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at <= ?`, [nowISO]);

    const messages = await db.all(`
    SELECT * FROM messages 
    WHERE chat_id = ? 
    ORDER BY created_at ASC
    `, [req.params.chatId]);

    const formattedMessages = messages.map(m => {
        let reactions = {};
        try {
            reactions = JSON.parse(m.reactions || '{}');
        } catch(e) {}

        return {
            id: String(m.id),
            chatId: String(m.chat_id),
            senderId: String(m.sender_id),
            content: m.content,
            type: m.type,
            status: m.status,
            timestamp: m.created_at,
            expiresAt: m.expires_at,
            reactions: reactions
        };
    });

    res.json(formattedMessages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Send Message
router.post('/:chatId/messages', auth, async (req, res) => {
  const { content, type, expiresAt } = req.body;
  const db = getDB();
  const userId = req.user.id;
  const chatId = req.params.chatId;

  try {
    let expiration = null;
    if (expiresAt) {
        expiration = new Date(expiresAt).toISOString();
    }

    const chat = await db.get("SELECT type FROM chats WHERE id = ?", [chatId]);
    
    const result = await db.run(`
    INSERT INTO messages (chat_id, sender_id, content, type, status, expires_at)
    VALUES (?, ?, ?, ?, 'sent', ?)
    `, [chatId, userId, content, type, expiration]);

    const newMessageId = result.lastID;
    await db.run(`UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [chatId]);
    const msg = await db.get(`SELECT * FROM messages WHERE id = ?`, [newMessageId]);

    res.json({
      id: String(msg.id),
      chatId: String(msg.chat_id),
      senderId: String(msg.sender_id),
      content: msg.content,
      type: msg.type,
      status: msg.status,
      timestamp: msg.created_at,
      expiresAt: msg.expires_at,
      reactions: {}
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// React to Message
router.post('/messages/:messageId/react', auth, async (req, res) => {
    const { emoji } = req.body;
    const db = getDB();
    const userId = String(req.user.id);

    try {
        const msg = await db.get('SELECT * FROM messages WHERE id = ?', [req.params.messageId]);
        if (!msg) return res.status(404).json({ msg: 'Message not found' });

        let reactions = {};
        try {
            reactions = JSON.parse(msg.reactions || '{}');
        } catch(e) {}

        if (reactions[userId] === emoji) {
            delete reactions[userId];
        } else {
            reactions[userId] = emoji;
        }

        const jsonReactions = JSON.stringify(reactions);
        await db.run('UPDATE messages SET reactions = ? WHERE id = ?', [jsonReactions, req.params.messageId]);

        res.json({
            id: String(msg.id),
            chatId: String(msg.chat_id),
            reactions: reactions
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
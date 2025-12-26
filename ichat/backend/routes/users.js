const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDB } = require('../database');

// Search Users
router.get('/search', auth, async (req, res) => {
  const db = getDB();
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const searchQuery = `%${q}%`;
    const users = await db.all(
      `SELECT id, username, display_name, avatar_url, is_online FROM users 
       WHERE (username LIKE ? OR display_name LIKE ?) AND id != ? 
       LIMIT 10`,
      [searchQuery, searchQuery, req.user.id]
    );

    const formattedUsers = users.map(u => ({
      id: String(u.id),
      username: u.username,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      isOnline: Boolean(u.is_online)
    }));

    res.json(formattedUsers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Follow User
router.post('/:id/follow', auth, async (req, res) => {
    const db = getDB();
    const targetId = req.params.id;
    const currentId = req.user.id;

    if (String(targetId) === String(currentId)) return res.status(400).json({ msg: "Cannot follow yourself" });

    try {
        await db.run("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)", [currentId, targetId]);
        
        // Create Notification
        const exists = await db.get("SELECT id FROM notifications WHERE user_id = ? AND type = 'follow' AND actor_id = ?", [targetId, currentId]);
        if (!exists) {
            await db.run("INSERT INTO notifications (user_id, type, actor_id) VALUES (?, 'follow', ?)", [targetId, currentId]);
        }
        
        res.json({ msg: "Followed" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Unfollow User
router.delete('/:id/follow', auth, async (req, res) => {
    const db = getDB();
    const targetId = req.params.id;
    const currentId = req.user.id;

    try {
        await db.run("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [currentId, targetId]);
        res.json({ msg: "Unfollowed" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Get User Profile by ID (Public info + stats)
router.get('/:id/profile', auth, async (req, res) => {
    const db = getDB();
    const targetUserId = req.params.id;
    const currentUserId = req.user.id;

    try {
        const user = await db.get("SELECT id, username, display_name, avatar_url, bio, website, is_online, is_private FROM users WHERE id = ?", [targetUserId]);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const postsCount = await db.get("SELECT count(*) as count FROM posts WHERE user_id = ?", [targetUserId]);
        const followersCount = await db.get("SELECT count(*) as count FROM follows WHERE following_id = ?", [targetUserId]);
        const followingCount = await db.get("SELECT count(*) as count FROM follows WHERE follower_id = ?", [targetUserId]);
        
        const isFollowing = await db.get("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?", [currentUserId, targetUserId]);

        res.json({
            id: String(user.id),
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            bio: user.bio,
            website: user.website,
            isPrivate: Boolean(user.is_private),
            stats: {
                posts: postsCount.count,
                followers: followersCount.count,
                following: followingCount.count
            },
            isFollowing: !!isFollowing,
            isMe: String(currentUserId) === String(targetUserId)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get Notifications
router.get('/notifications', auth, async (req, res) => {
    const db = getDB();
    try {
        const notifs = await db.all(`
            SELECT n.*, u.username, u.avatar_url, p.image_url as post_image
            FROM notifications n
            JOIN users u ON n.actor_id = u.id
            LEFT JOIN posts p ON n.post_id = p.id
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
            LIMIT 50
        `, [req.user.id]);

        const formatted = notifs.map(n => ({
            id: String(n.id),
            type: n.type,
            actor: {
                username: n.username,
                avatarUrl: n.avatar_url
            },
            postImage: n.post_image,
            read: Boolean(n.read),
            createdAt: n.created_at
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDB } = require('../database');

// Get Main Feed (Images only)
router.get('/', auth, async (req, res) => {
  const db = getDB();
  const userId = req.user.id;
  try {
    const posts = await db.all(`
      SELECT p.*, u.username, u.avatar_url 
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.type = 'image'
      ORDER BY p.created_at DESC
      LIMIT 50
    `);

    const formattedPosts = [];
    for (const p of posts) {
        const like = await db.get("SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?", [userId, p.id]);
        const saved = await db.get("SELECT * FROM saved_posts WHERE user_id = ? AND post_id = ?", [userId, p.id]);
        const isFollowing = await db.get("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?", [userId, p.user_id]);
        const commentsCount = await db.get("SELECT count(*) as count FROM post_comments WHERE post_id = ?", [p.id]);

        const comments = await db.all(`
            SELECT c.id, c.content, u.username, u.avatar_url, c.user_id, c.created_at
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at DESC
            LIMIT 2
        `, [p.id]);

        formattedPosts.push({
            id: String(p.id),
            imageUrl: p.image_url,
            caption: p.caption,
            location: p.location,
            filterClass: p.filter_class,
            type: p.type,
            likesCount: p.likes_count,
            commentsCount: commentsCount.count,
            timestamp: p.created_at,
            user: {
                id: String(p.user_id),
                username: p.username,
                avatarUrl: p.avatar_url,
                isFollowing: !!isFollowing
            },
            hasLiked: !!like,
            isSaved: !!saved,
            comments: comments.map(c => ({
                id: String(c.id),
                username: c.username,
                content: c.content,
                avatarUrl: c.avatar_url,
                userId: String(c.user_id),
                createdAt: c.created_at
            }))
        });
    }

    res.json(formattedPosts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all comments for a post
router.get('/:id/comments', auth, async (req, res) => {
    const db = getDB();
    const userId = req.user.id;
    try {
        const comments = await db.all(`
            SELECT c.id, c.content, c.created_at, u.username, u.avatar_url, u.id as user_id
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [req.params.id]);

        const formatted = [];
        for (const c of comments) {
            const hasLiked = await db.get("SELECT 1 FROM comment_likes WHERE user_id = ? AND comment_id = ?", [userId, c.id]);
            formatted.push({
                id: String(c.id),
                content: c.content,
                createdAt: c.created_at,
                username: c.username,
                avatarUrl: c.avatar_url,
                userId: String(c.user_id),
                hasLiked: !!hasLiked
            });
        }
        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Get Saved Posts for current user
router.get('/saved', auth, async (req, res) => {
    const db = getDB();
    const userId = req.user.id;
    try {
        const posts = await db.all(`
            SELECT p.*, u.username, u.avatar_url 
            FROM posts p
            JOIN saved_posts s ON p.id = s.post_id
            JOIN users u ON p.user_id = u.id
            WHERE s.user_id = ?
            ORDER BY p.created_at DESC
        `, [userId]);

        const formatted = [];
        for (const p of posts) {
            const commentsCount = await db.get("SELECT count(*) as count FROM post_comments WHERE post_id = ?", [p.id]);
            const like = await db.get("SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?", [userId, p.id]);
            
            formatted.push({
                id: String(p.id),
                imageUrl: p.image_url,
                likesCount: p.likes_count,
                commentsCount: commentsCount.count,
                filterClass: p.filter_class,
                type: p.type,
                hasLiked: !!like,
                isSaved: true,
                user: {
                    id: String(p.user_id),
                    username: p.username,
                    avatarUrl: p.avatar_url
                }
            });
        }
        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Get Paginated Reels with Advanced Algorithm (Followers -> Interests -> Random)
router.get('/reels', auth, async (req, res) => {
    const db = getDB();
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 3;
    const offset = parseInt(req.query.offset) || 0;
    const interests = req.query.interests ? req.query.interests.split(',') : [];

    try {
      // Build interest condition
      let interestScore = "0";
      if (interests.length > 0) {
          const conditions = interests.map(interest => `p.caption LIKE '%${interest}%'`).join(' OR ');
          interestScore = `(CASE WHEN ${conditions} THEN 1 ELSE 0 END)`;
      }

      // Tiered Algorithm Logic:
      // 1. Is the creator someone the user follows? (Score 2)
      // 2. Does it match user interests? (Score 1)
      // 3. Random noise to keep it fresh
      const posts = await db.all(`
        SELECT p.*, u.username, u.avatar_url,
        (CASE WHEN f.follower_id IS NOT NULL THEN 2 ELSE 0 END) + ${interestScore} as relevance_score
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN follows f ON f.following_id = p.user_id AND f.follower_id = ?
        WHERE p.type = 'reel'
        ORDER BY relevance_score DESC, RANDOM()
        LIMIT ? OFFSET ?
      `, [userId, limit, offset]);
  
      const formattedPosts = [];
      for (const p of posts) {
          const like = await db.get("SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?", [userId, p.id]);
          const saved = await db.get("SELECT * FROM saved_posts WHERE user_id = ? AND post_id = ?", [userId, p.id]);
          const commentsCount = await db.get("SELECT count(*) as count FROM post_comments WHERE post_id = ?", [p.id]);
          const isFollowing = await db.get("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?", [userId, p.user_id]);
  
          formattedPosts.push({
              id: String(p.id),
              imageUrl: p.image_url, 
              caption: p.caption,
              location: p.location,
              type: 'reel',
              likesCount: p.likes_count,
              commentsCount: commentsCount.count,
              timestamp: p.created_at,
              user: {
                  id: String(p.user_id),
                  username: p.username,
                  avatarUrl: p.avatar_url,
                  isFollowing: !!isFollowing
              },
              hasLiked: !!like,
              isSaved: !!saved,
              relevanceScore: p.relevance_score
          });
      }
  
      res.json(formattedPosts);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  });

// Get User Specific Posts (Profile Grid)
router.get('/user/:userId', auth, async (req, res) => {
    const db = getDB();
    const targetUserId = req.params.userId;

    try {
        const posts = await db.all(`
            SELECT id, image_url, likes_count, filter_class, type
            FROM posts 
            WHERE user_id = ? AND type = 'image'
            ORDER BY created_at DESC
        `, [targetUserId]);

        const formattedPosts = [];
        for (const p of posts) {
            const commentsCount = await db.get("SELECT count(*) as count FROM post_comments WHERE post_id = ?", [p.id]);
            
            formattedPosts.push({
                id: String(p.id),
                imageUrl: p.image_url,
                likesCount: p.likes_count,
                commentsCount: commentsCount.count,
                filterClass: p.filter_class,
                type: p.type
            });
        }
        res.json(formattedPosts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Upload Post
router.post('/', auth, async (req, res) => {
    const { imageUrl, caption, location, filterClass, type } = req.body;
    const db = getDB();
    const userId = req.user.id;

    try {
        if (!imageUrl) return res.status(400).json({ msg: 'Content is required' });

        const result = await db.run(
            `INSERT INTO posts (user_id, image_url, caption, location, filter_class, type, likes_count) VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [userId, imageUrl, caption, location, filterClass || '', type || 'image']
        );

        res.json({ msg: 'Post created', postId: result.lastID });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Like/Unlike a post
router.post('/:id/like', auth, async (req, res) => {
    const db = getDB();
    const userId = req.user.id;
    const postId = req.params.id;

    try {
        const existingLike = await db.get("SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?", [userId, postId]);
        
        if (existingLike) {
            await db.run("DELETE FROM post_likes WHERE user_id = ? AND post_id = ?", [userId, postId]);
            await db.run("UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?", [postId]);
            res.json({ liked: false });
        } else {
            await db.run("INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)", [userId, postId]);
            await db.run("UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?", [postId]);
            
            const post = await db.get("SELECT user_id FROM posts WHERE id = ?", [postId]);
            if (post && post.user_id !== userId) {
                await db.run("INSERT INTO notifications (user_id, type, actor_id, post_id) VALUES (?, 'like', ?, ?)", 
                    [post.user_id, userId, postId]);
            }

            res.json({ liked: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Comment on a post
router.post('/:id/comments', auth, async (req, res) => {
    const db = getDB();
    const userId = req.user.id;
    const postId = req.params.id;
    const { content } = req.body;

    if (!content) return res.status(400).json({msg: 'Content required'});

    try {
        const resRun = await db.run("INSERT INTO post_comments (user_id, post_id, content) VALUES (?, ?, ?)", [userId, postId, content]);
        
        const post = await db.get("SELECT user_id FROM posts WHERE id = ?", [postId]);
        if (post && post.user_id !== userId) {
            await db.run("INSERT INTO notifications (user_id, type, actor_id, post_id) VALUES (?, 'comment', ?, ?)", 
                [post.user_id, userId, postId]);
        }

        const user = await db.get("SELECT username, avatar_url FROM users WHERE id = ?", [userId]);

        res.json({ 
            id: String(resRun.lastID), 
            content, 
            username: user.username,
            avatarUrl: user.avatar_url,
            userId: String(userId),
            createdAt: new Date().toISOString(),
            hasLiked: false
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Save/Unsave a post
router.post('/:id/save', auth, async (req, res) => {
    const db = getDB();
    const userId = req.user.id;
    const postId = req.params.id;

    try {
        const existing = await db.get("SELECT * FROM saved_posts WHERE user_id = ? AND post_id = ?", [userId, postId]);
        
        if (existing) {
            await db.run("DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?", [userId, postId]);
            res.json({ saved: false });
        } else {
            await db.run("INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)", [userId, postId]);
            res.json({ saved: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
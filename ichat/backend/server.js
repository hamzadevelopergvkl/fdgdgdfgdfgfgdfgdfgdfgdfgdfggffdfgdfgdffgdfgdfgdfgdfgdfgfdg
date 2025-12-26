const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { initDB, getDB } = require('./database');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/users');
const feedRoutes = require('./routes/feed');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: '*', 
  allowedHeaders: ['Content-Type', 'x-auth-token']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize SQLite Database
initDB().catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io Real-time Logic
io.on('connection', (socket) => {
  let currentUserId = null;

  socket.on('join_user', async (userId) => {
    if (!userId) return;
    currentUserId = String(userId);
    socket.join(currentUserId);
    console.log(`User online: ${currentUserId}`);
    
    try {
        const db = getDB();
        const user = await db.get("SELECT id FROM users WHERE id = ?", [currentUserId]);
        if (user) {
            await db.run("UPDATE users SET is_online = 1 WHERE id = ?", [currentUserId]);
            io.emit('user_status', { userId: currentUserId, isOnline: true });
        }
    } catch (e) {
        console.error("Error setting online status:", e);
    }
  });

  socket.on('join_chat', (chatId) => {
    if (chatId) socket.join(String(chatId));
  });

  socket.on('send_message', (messageData) => {
    if (messageData && messageData.chatId) {
        io.to(String(messageData.chatId)).emit('receive_message', messageData);
    }
  });

  socket.on('mark_read', (data) => {
      if (data && data.chatId) {
        io.to(String(data.chatId)).emit('messages_read', { chatId: data.chatId, userId: data.userId });
      }
  });

  socket.on('disconnect', async () => {
    if (currentUserId) {
        console.log(`User offline: ${currentUserId}`);
        try {
            const db = getDB();
            const now = new Date().toISOString();
            await db.run("UPDATE users SET is_online = 0, last_seen = ? WHERE id = ?", [now, currentUserId]);
            io.emit('user_status', { userId: currentUserId, isOnline: false, lastSeen: now });
        } catch (e) {
            console.error("Error setting offline status:", e);
        }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
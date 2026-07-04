require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const { initializeDatabase } = require('../database/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;
app.set('io', io);

// Uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/properties',    require('./routes/properties'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/locations',     require('./routes/locations'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/export',        require('./routes/export'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/bookmarks',     require('./routes/bookmarks'));
app.use('/api/similar',       require('./routes/similar'));
app.use('/api/reviews',       require('./routes/reviews'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/users',          require('./routes/auth')); // برای پروفایل عمومی /api/users/:id

// WebSocket
const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('user:join', (userId) => {
    if (userId) {
      onlineUsers.set(parseInt(userId), socket.id);
      socket.userId = parseInt(userId);
      socket.join(`user:${userId}`);
      io.emit('online:count', onlineUsers.size);
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('online:count', onlineUsers.size);
    }
  });

  socket.on('message:read', (data) => {
    const { senderId } = data;
    if (senderId && onlineUsers.has(parseInt(senderId))) {
      io.to(`user:${senderId}`).emit('message:seen', { by: socket.userId });
    }
  });
});

module.exports.io = io;
module.exports.onlineUsers = onlineUsers;

function emitToUser(userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
}
function emitToAll(event, data) {
  io.emit(event, data);
}
module.exports.emitToUser = emitToUser;
module.exports.emitToAll  = emitToAll;

// Health check - بعد از تعریف onlineUsers
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'سرور در حال اجراست', online: onlineUsers.size, time: new Date().toISOString() });
});

// Frontend fallback
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/pages/index.html');
  const notFoundPath = path.join(__dirname, '../frontend/pages/404.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else if (fs.existsSync(notFoundPath)) res.status(404).sendFile(notFoundPath);
  else res.status(404).json({ success: false, message: 'صفحه یافت نشد' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'حجم فایل بیش از ۵ مگابایت است' });
  res.status(500).json({ success: false, message: 'خطای داخلی سرور' });
});

// Start
initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log('');
    console.log('=====================================');
    console.log('   🏠 املاک میرحاج - در حال اجرا   ');
    console.log('=====================================');
    console.log(`   آدرس:     http://localhost:${PORT}`);
    console.log(`   WebSocket: فعال ✅`);
    console.log('=====================================');
    console.log('');
  });
}).catch(err => {
  console.error('❌ خطا در دیتابیس:', err.message);
  process.exit(1);
});

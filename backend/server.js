require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { initializeDatabase, get } = require('../database/db');

const app = express();
const server = http.createServer(app);

const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);
const originAllowed = (origin, callback) => {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(new Error('Origin not allowed by CORS'));
};

const io = new Server(server, {
  cors: { origin: originAllowed, methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
app.set('io', io);
app.disable('x-powered-by');

io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) {
    socket.userId = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = get('SELECT id, active FROM users WHERE id = ?', [decoded.id]);
    if (!user || !user.active) return next(new Error('Unauthorized'));
    socket.userId = user.id;
    return next();
  } catch {
    return next(new Error('Unauthorized'));
  }
});

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors({ origin: originAllowed, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 1000 }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

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
app.use('/api/users',          require('./routes/auth'));

const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('user:join', (userId) => {
    const requestedId = Number.parseInt(userId, 10);
    if (!socket.userId || !Number.isSafeInteger(requestedId) || requestedId !== socket.userId) return;

    onlineUsers.set(socket.userId, socket.id);
    socket.join(`user:${socket.userId}`);
    io.emit('online:count', onlineUsers.size);
  });

  socket.on('disconnect', () => {
    if (socket.userId && onlineUsers.get(socket.userId) === socket.id) {
      onlineUsers.delete(socket.userId);
      io.emit('online:count', onlineUsers.size);
    }
  });

  socket.on('message:read', (data = {}) => {
    if (!socket.userId) return;
    const senderId = Number.parseInt(data.senderId, 10);
    if (!Number.isSafeInteger(senderId) || senderId < 1 || !onlineUsers.has(senderId)) return;

    const readMessage = get(
      'SELECT id FROM messages WHERE sender_id = ? AND receiver_id = ? AND is_read = 1 LIMIT 1',
      [senderId, socket.userId]
    );
    if (readMessage) io.to(`user:${senderId}`).emit('message:seen', { by: socket.userId });
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

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'سرور در حال اجراست', online: onlineUsers.size, time: new Date().toISOString() });
});

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/pages/index.html');
  const notFoundPath = path.join(__dirname, '../frontend/pages/404.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else if (fs.existsSync(notFoundPath)) res.status(404).sendFile(notFoundPath);
  else res.status(404).json({ success: false, message: 'صفحه یافت نشد' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'حجم فایل بیش از ۵ مگابایت است' });
  if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ success: false, message: 'فقط یک فایل در هر درخواست مجاز است' });
  if (err.message === 'Origin not allowed by CORS') return res.status(403).json({ success: false, message: 'مبدأ درخواست مجاز نیست' });
  if (err.type === 'entity.too.large') return res.status(413).json({ success: false, message: 'حجم درخواست بیش از حد مجاز است' });
  res.status(500).json({ success: false, message: 'خطای داخلی سرور' });
});

initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log('');
    console.log('=====================================');
    console.log('   🏠 املاک میرحاج - در حال اجرا   ');
    console.log('=====================================');
    console.log(`   آدرس:     http://localhost:${PORT}`);
    console.log('   WebSocket: فعال');
    console.log('=====================================');
    console.log('');
  });
}).catch(err => {
  console.error('❌ خطا در دیتابیس:', err.message);
  process.exit(1);
});

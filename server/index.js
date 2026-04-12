const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const dotenv     = require('dotenv');
const mongoose   = require('mongoose');
const rateLimit  = require('express-rate-limit');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const path       = require('path');
const Document   = require('./models/Document');

dotenv.config();

const app    = express();
const server = http.createServer(app);

// ── Security & logging ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', '*'],
      connectSrc: ["'self'", 'http://localhost:5000', 'https://localhost:5000', 'ws://localhost:5000', 'wss://localhost:5000'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// ── Rate limiting ─────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static uploads ────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, require('./routes/auth'));
app.use('/api/docs',     require('./routes/docs'));
app.use('/api/versions', require('./routes/versions'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/share',    require('./routes/share'));
app.use('/api/upload',   require('./routes/upload'));
app.use('/api/ai',       require('./routes/ai'));
app.use('/api/export',   require('./routes/export'));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Socket.IO ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

// Auth middleware for sockets
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId   = String(decoded.id);
    socket.userName = decoded.name || 'User';
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

const USER_COLORS = ['#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12','#1abc9c','#e67e22','#34495e','#e91e63','#00bcd4'];
const docRooms = new Map(); // docId → Map<socketId, userInfo>
const normalizeDocId = (payload) => {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload.docId === 'string') return payload.docId;
  return null;
};

io.on('connection', (socket) => {
  socket.on('join-doc', (payload) => {
    const docId = normalizeDocId(payload);
    if (!docId) return;
    socket.currentDoc = docId;
    socket.join(`doc:${docId}`);

    if (!docRooms.has(docId)) docRooms.set(docId, new Map());
    const room = docRooms.get(docId);
    const color = USER_COLORS[room.size % USER_COLORS.length];
    const userInfo = { userId: socket.userId, userName: socket.userName, color, socketId: socket.id };
    room.set(socket.id, userInfo);

    socket.to(`doc:${docId}`).emit('user-joined', userInfo);
    socket.emit('room-users', Array.from(room.values()));
  });

  socket.on('doc-update', ({ docId, content }) => {
    socket.to(`doc:${docId}`).emit('doc-updated', { content, userId: socket.userId });
  });

  socket.on('cursor-update', ({ docId, position }) => {
    socket.to(`doc:${docId}`).emit('cursor-updated', {
      position, userId: socket.userId, userName: socket.userName,
    });
  });

  socket.on('leave-doc', (payload) => {
    const docId = normalizeDocId(payload);
    if (docId) leave(socket, docId);
  });
  socket.on('disconnect', () => { if (socket.currentDoc) leave(socket, socket.currentDoc); });

  function leave(socket, docId) {
    socket.leave(`doc:${docId}`);
    if (docRooms.has(docId)) {
      docRooms.get(docId).delete(socket.id);
      if (docRooms.get(docId).size === 0) docRooms.delete(docId);
    }
    socket.to(`doc:${docId}`).emit('user-left', { socketId: socket.id, userId: socket.userId });
  }
});

// ── Database + start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not set in .env');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');

    setInterval(async () => {
      try {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await Document.deleteMany({ deleted: true, deletedAt: { $lt: cutoff } });
      } catch (err) {
        console.error('Trash purge failed:', err.message);
      }
    }, 24 * 60 * 60 * 1000);

    server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

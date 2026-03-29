console.log('=== SERVER STARTING v2 ===');


  
// ── Crash handler — MUST be first so ALL errors are visible in logs ──────────
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION:', err.message);
  console.error(err.stack);
  process.exit(1);
});

// ── Create logs directory if it doesn't exist ─────────────────────────────────
const fs   = require('fs');
const path = require('path');
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  fs.mkdirSync(path.join(__dirname, 'logs'));
}

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const session    = require('express-session');
const MongoStore = require('connect-mongo');        // ✅ persistent sessions
const passport   = require('./config/passport');
const connectDB  = require('./config/database');
const logger     = require('./utils/logger');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/authRoutes');
const facultyRoutes      = require('./routes/facultyRoutes');
const studentRoutes      = require('./routes/studentRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const statsRoutes        = require('./routes/statsRoutes');
const storageRoutes      = require('./routes/storageRoutes');
const feedbackRoutes     = require('./routes/feedbackRoutes');
const announcementRoutes = require('./routes/announcementRoutes');

const app = express();

// Trust proxy — critical for Render load balancer (secure cookies over HTTPS)
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session ───────────────────────────────────────────────────────────────────
// Sessions stored in MongoDB — survive Render restarts & cold starts.
// Cookie lives 6 months so users stay logged in permanently.
const SIX_MONTHS_MS  = 6 * 30 * 24 * 60 * 60 * 1000;  // ms
const SIX_MONTHS_SEC = 6 * 30 * 24 * 60 * 60;          // seconds

console.log('⏳ Connecting session store to MongoDB...');

app.use(session({
  secret:            process.env.SESSION_SECRET || 'csms-session-secret',
  resave:            false,
  saveUninitialized: false,
  proxy:             true,
  store: MongoStore.create({
    mongoUrl:   process.env.MONGO_URI,
    ttl:        SIX_MONTHS_SEC,   // session document TTL in MongoDB
    autoRemove: 'native',         // MongoDB TTL index handles cleanup
    touchAfter: 24 * 3600,        // re-save at most once per 24 h
  }),
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:   SIX_MONTHS_MS,      // ✅ 6-month cookie
  },
}));

console.log('✅ Session store configured');

app.use(passport.initialize());
app.use(passport.session());

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ── Visit tracker ─────────────────────────────────────────────────────────────
const Visit = require('./models/Visit');
app.use(async (req, res, next) => {
  if (req.path === '/' && req.method === 'GET') {
    Visit.create({ ip: req.ip, userAgent: req.headers['user-agent'] }).catch(() => {});
  }
  next();
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/faculty',       facultyRoutes);
app.use('/api/student',       studentRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/stats',         statsRoutes);
app.use('/api/storage',       storageRoutes);
app.use('/api/feedback',      feedbackRoutes);
app.use('/api/announcements', announcementRoutes);

// ── 404 & error handlers ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀  Server running on port ${PORT}`);
  console.log(`❤️   Health: http://localhost:${PORT}/health\n`);
});

// Render load balancer has a 30 s idle timeout — keepAlive must exceed it
server.keepAliveTimeout = 65000;
server.headersTimeout   = 70000;

// ── Keep Render free tier awake (self-ping every 14 min) ──────────────────────
if (process.env.NODE_ENV === 'production' && process.env.BACKEND_URL) {
  const PING_URL = `${process.env.BACKEND_URL}/health`;
  setInterval(() => {
    fetch(PING_URL)
      .then(() => logger.info('Keep-alive ping OK'))
      .catch((e)  => logger.warn(`Keep-alive ping failed: ${e.message}`));
  }, 14 * 60 * 1000);
  logger.info(`Keep-alive started → ${PING_URL}`);
}

module.exports = app;

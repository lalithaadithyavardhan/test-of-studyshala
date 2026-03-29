// ── Create logs directory if it doesn't exist ──────────────────────────────
const fs = require('fs');
const path = require('path');
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  fs.mkdirSync(path.join(__dirname, 'logs'));
}

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const session    = require('express-session');
const MongoStore = require('connect-mongo');   // ✅ persistent sessions
const passport   = require('./config/passport');
const connectDB  = require('./config/database');
const logger     = require('./utils/logger');

// Routes
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

// ── CORS ─────────────────────────────────────────────────────────────────────
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
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session ───────────────────────────────────────────────────────────────────
// Sessions are stored in MongoDB so they survive Render free-tier restarts and
// cold starts. Cookie lives for 6 months — users stay logged in permanently.
const SIX_MONTHS_MS  = 6 * 30 * 24 * 60 * 60 * 1000;   // ~180 days in ms
const SIX_MONTHS_SEC = 6 * 30 * 24 * 60 * 60;           // ~180 days in seconds

app.use(session({
  secret:            process.env.SESSION_SECRET || 'csms-session-secret',
  resave:            false,
  saveUninitialized: false,
  proxy:             true,
  // ✅ Store sessions in MongoDB — survives restarts, cold starts, redeploys
  store: MongoStore.create({
    mongoUrl:         process.env.MONGO_URI,
    ttl:              SIX_MONTHS_SEC,   // session lives 6 months in DB
    autoRemove:       'native',          // let MongoDB TTL index clean up expired sessions
    touchAfter:       24 * 3600,         // only re-save session once per 24h to reduce DB writes
  }),
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:   SIX_MONTHS_MS,            // ✅ 6-month cookie — user stays logged in
  }
}));

app.use(passport.initialize());
app.use(passport.session());

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

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth',          authRoutes);
app.use('/api/faculty',       facultyRoutes);
app.use('/api/student',       studentRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/stats',         statsRoutes);
app.use('/api/storage',       storageRoutes);
app.use('/api/feedback',      feedbackRoutes);
app.use('/api/announcements', announcementRoutes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀  Server running at http://localhost:${PORT}`);
  console.log(`❤️   Health check:  http://localhost:${PORT}/health\n`);
});

// ── Keep-alive fix for Render free tier ──────────────────────────────────────
// Render's load balancer has a 30s idle timeout. Without these settings,
// long-running requests (Drive file uploads) get cut mid-transfer.
// keepAliveTimeout must be > Render's 30s. headersTimeout must be > keepAliveTimeout.
server.keepAliveTimeout = 65000;   // 65s — above Render's 30s idle timeout
server.headersTimeout   = 70000;   // 70s — must be > keepAliveTimeout

// ── Keep Render free tier awake ───────────────────────────────────────────────
// Render spins down free services after 15 min of inactivity.
// This self-ping fires every 14 minutes to prevent that cold start.
// Set BACKEND_URL in your Render environment variables.
if (process.env.NODE_ENV === 'production' && process.env.BACKEND_URL) {
  const PING_URL = `${process.env.BACKEND_URL}/health`;
  setInterval(() => {
    fetch(PING_URL)
      .then(() => logger.info('Keep-alive ping OK'))
      .catch((err) => logger.warn(`Keep-alive ping failed: ${err.message}`));
  }, 14 * 60 * 1000); // every 14 minutes
  logger.info(`Keep-alive started → ${PING_URL}`);
}

process.on('unhandledRejection', (err) => logger.error(`Unhandled Rejection: ${err.message}`));
process.on('uncaughtException',  (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;

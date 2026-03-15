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

const feedbackRoutes = require('./routes/feedbackRoutes');

const passport   = require('./config/passport');
const connectDB  = require('./config/database');
const logger     = require('./utils/logger');

// Routes
const authRoutes    = require('./routes/authRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes    = require('./routes/adminRoutes');
const statsRoutes    = require('./routes/statsRoutes');
const storageRoutes  = require('./routes/storageRoutes');

app.use('/api/feedback', feedbackRoutes);


const app = express();

/**
 * 1. TRUST PROXY (CRITICAL FOR RENDER)
 * This allows Express to trust the headers set by Render's load balancer.
 * Without this, 'secure' cookies will not be sent over HTTPS.
 */
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// ── Middleware ──────────────────────────────────────────────────────────────

/**
 * 2. UPDATED CORS
 * Accepts multiple frontend origins: custom domain, Render preview URL, localhost.
 * Add any new domains to the FRONTEND_URL env var as comma-separated values.
 * Example: FRONTEND_URL=https://www.studyshala.dev,https://studyshala.dev,https://test-of-studyshala-1.onrender.com
 */
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * 3. UPDATED SESSION CONFIGURATION
 * Optimized for production deployment on Render.
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'csms-session-secret',
  resave: false,
  saveUninitialized: false,
  proxy: true, 
  cookie: {
    // secure: true is required for HTTPS on Render
    secure: process.env.NODE_ENV === 'production',
    // sameSite: 'none' is often required for cross-domain OAuth redirects
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});


// ── Visit tracker (for landing page stats) ─────────────────────────────────
const Visit = require('./models/Visit');
app.use(async (req, res, next) => {
  // Only track GET / (homepage hits) to avoid database bloat
  if (req.path === '/' && req.method === 'GET') {
    Visit.create({ ip: req.ip, userAgent: req.headers['user-agent'] }).catch(() => {});
  }
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth',    authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/stats',   statsRoutes);
app.use('/api/storage', storageRoutes);

// ── Error handling ──────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀  Server running at http://localhost:${PORT}`);
  console.log(`❤️   Health check:  http://localhost:${PORT}/health\n`);
});

process.on('unhandledRejection', (err) => logger.error(`Unhandled Rejection: ${err.message}`));
process.on('uncaughtException',  (err) => { 
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;

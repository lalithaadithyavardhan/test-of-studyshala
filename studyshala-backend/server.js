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
const passport   = require('./config/passport');
const connectDB  = require('./config/database');
const logger     = require('./utils/logger');

// Routes
const authRoutes    = require('./routes/authRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes   = require('./routes/adminRoutes');

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
 * Uses your environment variable and allows credentials.
 */
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// ── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth',    authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin',   adminRoutes);

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

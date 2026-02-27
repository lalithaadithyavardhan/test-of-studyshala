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
const rateLimit  = require('express-rate-limit');
const crypto     = require('crypto');
const MongoStore = require('connect-mongo'); // Added for production sessions

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

// ── Security & Middleware ───────────────────────────────────────────────────

/**
 * Rate Limiting
 * Protects the API routes from brute force and denial-of-service (DoS) attacks.
 * Limits each IP to 200 requests per 15-minute window.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

/**
 * 2. UPDATED CORS (Multi-Origin Support)
 * Safely accepts requests from local dev, your main domain, and your www domain.
 */
const allowedOrigins = [
  'http://localhost:3000',
  'https://studyshala.dev',
  'https://www.studyshala.dev'
];

// Add the environment variable if it exists and isn't already in the list
if (process.env.FRONTEND_URL) {
  const envUrl = process.env.FRONTEND_URL.replace(/\/$/, ''); // removes trailing slash if present
  if (!allowedOrigins.includes(envUrl)) {
    allowedOrigins.push(envUrl);
  }
}

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation: origin ' + origin + ' is not allowed'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * 3. UPDATED SESSION CONFIGURATION (Render Friendly)
 * Uses MongoDB to store sessions so users don't get logged out on server restart!
 */
let sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    logger.error('FATAL ERROR: SESSION_SECRET is missing in production environment variables.');
    process.exit(1); // Fail securely instead of allowing easily forgeable cookies
  } else {
    sessionSecret = crypto.randomBytes(32).toString('hex');
    logger.warn('SESSION_SECRET is missing. Auto-generating a temporary secure string for local dev.');
  }
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  proxy: true, 
  // Store sessions in MongoDB
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // Sessions expire in 24 hours
  }),
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
  logger.error(err.message || 'An unknown error occurred');
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  // Environment-aware console logs
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://test-of-studyshala.onrender.com' 
    : `http://localhost:${PORT}`;

  console.log(`\n🚀  Server running at ${baseUrl}`);
  console.log(`❤️   Health check:  ${baseUrl}/health\n`);
});

process.on('unhandledRejection', (err) => logger.error(`Unhandled Rejection: ${err.message}`));
process.on('uncaughtException',  (err) => { 
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;

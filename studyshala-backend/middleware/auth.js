const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Get user from database
    const user = await User.findById(decoded.id).select('-__v');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.active) {
      return res.status(403).json({ message: 'Account has been deactivated' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// Check if user is faculty
const isFaculty = (req, res, next) => {
  if (req.user.role !== 'faculty') {
    return res.status(403).json({ message: 'Access denied. Faculty only.' });
  }
  next();
};

// Check if user is student
const isStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Access denied. Student only.' });
  }
  next();
};

// Check if user is faculty or admin
const isFacultyOrAdmin = (req, res, next) => {
  if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Faculty or Admin only.' });
  }
  next();
};

module.exports = {
  authenticate,
  isAdmin,
  isFaculty,
  isStudent,
  isFacultyOrAdmin
};

const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    name: user.name
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
};

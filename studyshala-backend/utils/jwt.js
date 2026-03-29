const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    name: user.name
  };

  // 6-month expiry — matches cookie and session lifetime
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '180d' });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };

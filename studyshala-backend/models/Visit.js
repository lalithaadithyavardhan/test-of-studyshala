const mongoose = require('mongoose');
const visitSchema = new mongoose.Schema({
  ip:        { type: String },
  userAgent: { type: String },
  visitedAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Visit', visitSchema);

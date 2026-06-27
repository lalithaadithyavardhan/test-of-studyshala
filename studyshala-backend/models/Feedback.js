const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  message:  { type: String, required: true, maxlength: 60, trim: true },
  name:     { type: String, required: true, trim: true },
  role:     { type: String, enum: ['student', 'faculty'], required: true },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approved: { type: Boolean, default: true },   // set false if you want manual moderation
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);

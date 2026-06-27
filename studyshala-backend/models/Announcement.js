const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true, maxlength: 100 },
  message:   { type: String, required: true, trim: true, maxlength: 1000 },
  audience:  { type: String, enum: ['all', 'student', 'faculty'], default: 'all' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  active:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);

const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true   // Every log entry must be tied to a user
  },
  action: {
    type: String,
    required: true,
    // Known action types for reference:
    // ACCESS_MATERIAL, SAVE_MATERIAL, REMOVE_SAVED_MATERIAL,
    // DOWNLOAD_FILE, CREATE_FOLDER, UPLOAD_FILES, DELETE_FILE,
    // DELETE_FOLDER
    index: true
  },
  resource: {
    type: String
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: Object,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true   // provides createdAt (used as accessedAt) and updatedAt
});

// Compound index for fetching a user's full access history efficiently
logSchema.index({ userId: 1, action: 1, createdAt: -1 });

// Index for admin-level queries across all actions over time
logSchema.index({ action: 1, createdAt: -1 });

// Index to look up all logs for a specific resource (e.g. a Folder)
logSchema.index({ resourceId: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('Log', logSchema);

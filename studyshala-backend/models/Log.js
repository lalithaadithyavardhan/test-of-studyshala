/**
 * Log model — v2  (auto-expires after 30 days, no userAgent)
 * ===========================================================
 * BEFORE: Unlimited growth, userAgent strings ~120-200 bytes each.
 *   1000 actions/month = ~350KB/month = 4MB/year just in logs.
 *
 * AFTER:
 *   - TTL index: MongoDB auto-deletes logs older than 30 days.
 *   - userAgent field removed (biggest single field, never useful for admin).
 *   - ipAddress shortened (kept for security auditing).
 *
 * Core feature protection: access codes live in Folder model, not logs.
 * Deleting old logs does NOT affect code validation — ever.
 */
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action:     { type: String, required: true },
  resource:   { type: String },
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  details:    { type: Object },      // keep for admin audit visibility
  ipAddress:  { type: String },
  // userAgent REMOVED — was ~120-200 bytes per log, never actually used
}, {
  timestamps: true   // createdAt is used by the TTL index
});

// TTL index — MongoDB auto-deletes logs older than 30 days.
// This is server-side, zero maintenance, zero app code needed.
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Keep query indexes
logSchema.index({ userId: 1, createdAt: -1 });
logSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('Log', logSchema);

/**
 * Visit model — v2  (counter-only, minimal storage)
 * ==================================================
 * BEFORE: One document per visit (~160 bytes each).
 *   100 visits/day = 5.6 MB/year just for this collection.
 *
 * AFTER: ONE singleton document with a running counter.
 *   Storage: ~60 bytes total, forever.
 *
 * The stats controller increments totalCount atomically.
 * No individual visit records are stored — just the number.
 */
const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  _singleton: { type: String, default: 'visits', unique: true },
  totalCount: { type: Number, default: 0 },
}, { timestamps: false });

module.exports = mongoose.model('Visit', visitSchema);

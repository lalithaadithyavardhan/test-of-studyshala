/**
 * statsController.js
 * ==================
 * Public stats for the landing page — no auth required.
 *
 * WHY IN-MEMORY CACHE:
 *   Render free tier spins down after 15 min of inactivity.
 *   The very first request after a cold start takes 30-60s to wake the
 *   server + re-connect to MongoDB.  Without a cache, every page load
 *   hits MongoDB directly and the first visitor always sees stale fallback
 *   numbers on the frontend.
 *
 *   With a cache:
 *   - Server stores the last known real counts in memory.
 *   - Cache refreshes every 5 minutes in the background (setInterval).
 *   - Cold-start first request: returns the cache immediately (populated
 *     at server startup), then refreshes in background.
 *   - Subsequent requests: instant response from memory, no DB round-trip.
 *   - Even if MongoDB is temporarily unavailable, last known counts are
 *     returned rather than an error.
 */

const User   = require('../models/User');
const Folder = require('../models/Folder');
const Visit  = require('../models/Visit');
const logger = require('../utils/logger');

/* ── In-memory cache ─────────────────────────────────────────────────── */
let cache = {
  totalStudents:  0,
  totalFaculty:   0,
  totalMaterials: 0,
  totalVisits:    0,
  lastUpdated:    null,   // null = never fetched yet
  fetching:       false,  // prevent concurrent refreshes
};

const CACHE_TTL_MS = 5 * 60 * 1000; // refresh every 5 minutes

async function refreshCache() {
  if (cache.fetching) return;
  cache.fetching = true;
  try {
    const [totalStudents, totalFaculty, totalMaterials, totalVisits] = await Promise.all([
      User.countDocuments({ role: 'student', active: { $ne: false } }),
      User.countDocuments({ role: 'faculty', active: { $ne: false } }),
      Folder.countDocuments({ active: true }),
      Visit.countDocuments(),
    ]);
    cache.totalStudents  = totalStudents;
    cache.totalFaculty   = totalFaculty;
    cache.totalMaterials = totalMaterials;
    cache.totalVisits    = totalVisits;
    cache.lastUpdated    = Date.now();
    logger.info(`Stats cache refreshed — students:${totalStudents} faculty:${totalFaculty} materials:${totalMaterials} visits:${totalVisits}`);
  } catch (err) {
    logger.error(`Stats cache refresh failed: ${err.message}`);
    // Keep whatever was in cache before — don't reset to zeros
  } finally {
    cache.fetching = false;
  }
}

/* Populate cache at server startup, then refresh every 5 minutes */
setTimeout(refreshCache, 2000); // 2s delay gives DB connection time to establish
setInterval(refreshCache, CACHE_TTL_MS);

/* ── GET /api/stats ──────────────────────────────────────────────────── */
exports.getStats = async (req, res) => {
  // If cache was never populated (fresh cold start), populate it now and wait
  if (!cache.lastUpdated) {
    await refreshCache();
  }

  res.json({
    totalStudents:  cache.totalStudents,
    totalFaculty:   cache.totalFaculty,
    totalMaterials: cache.totalMaterials,
    totalVisits:    cache.totalVisits,
    cachedAt:       cache.lastUpdated,
  });
};

/* ── POST /api/stats/visit ───────────────────────────────────────────── */
// Called by the frontend login page on every load.
// This is how we count real website visits (frontend is on a separate host,
// so the old GET / tracker on the backend never fires for real visitors).
exports.recordVisit = async (req, res) => {
  try {
    await Visit.create({
      ip:        req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || '',
    });
    // Increment cached count immediately so next stats call reflects it
    cache.totalVisits += 1;
    res.json({ ok: true });
  } catch (err) {
    // Non-critical — don't error the client
    logger.error(`recordVisit: ${err.message}`);
    res.json({ ok: false });
  }
};

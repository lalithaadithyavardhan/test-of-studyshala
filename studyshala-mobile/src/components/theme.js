/**
 * theme.js — StudyShala Dark Theme
 * Matches the HTML reference: dark backgrounds, #e87c3a accent, muted surfaces.
 * Import this in every screen for consistent tokens.
 */

export const C = {
  // ── Backgrounds ──────────────────────────────────
  bg:         '#0f0f0f',   // phone / page base
  surface:    '#1a1a1a',   // cards, tab bar, header
  elevated:   '#2a2a2a',   // avatar bg, icon box bg
  border:     '#2e2e2e',   // all borders

  // ── Accent ───────────────────────────────────────
  accent:     '#e87c3a',   // primary CTA, active tab, dot, badges
  accentBg:   'rgba(232,124,58,0.12)',  // active sidebar link bg
  accentBg2:  'rgba(232,124,58,0.18)', // avatar border glow

  // ── Text ─────────────────────────────────────────
  textPrimary:   '#f0f0f0',
  textSecondary: '#888888',
  textMuted:     '#555555',

  // ── Semantic ─────────────────────────────────────
  danger:     '#e05c5c',
  success:    '#4caf7d',
  warning:    '#e8a23a',

  // ── Misc ─────────────────────────────────────────
  white:      '#ffffff',
  overlay:    'rgba(0,0,0,0.55)',
};

export const R = {
  // border radius
  xs:   8,
  sm:   10,
  md:   14,
  lg:   18,
  xl:   20,
  pill: 999,
};

export const T = {
  // font sizes
  xs:   11,
  sm:   12,
  base: 13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
};

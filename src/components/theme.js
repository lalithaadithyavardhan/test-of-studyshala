/**
 * theme.js — StudyShala Merged Dark Theme
 * 
 * Combines your existing theme + enhanced HTML design system.
 * All existing keys are preserved — other screens won't break.
 * New enhanced keys are added for the dashboards.
 * 
 * Import C, R, T across all screens for consistent tokens.
 */

import { Platform, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
export const IS_SMALL = width < 375;

// ════════════════════════════════════════════════════════════════════════════
// COLORS (C) — Merged: existing + enhanced
// ════════════════════════════════════════════════════════════════════════════
export const C = {
  // ── Existing backgrounds (backward compatible) ──────────────────────────
  bg:         '#0a0a0f',   // phone / page base (enhanced: was #0f0f0f)
  surface:    '#13131a',   // cards, tab bar, header (enhanced: was #1a1a1a)
  elevated:    '#22222e',   // avatar bg, icon box bg (enhanced: was #2a2a2a)
  surface2:    '#1a1a24',   // [NEW] secondary panels, nested surfaces
  border:     '#2a2a38',   // all borders (enhanced: was #2e2e2e)
  borderSubtle: '#1e1e2a', // [NEW] barely-visible dividers

  // ── Existing accent (unchanged) ─────────────────────────────────────────
  accent:     '#e87c3a',   // primary CTA, active tab, dot, badges
  accentBg:   'rgba(232,124,58,0.12)',  // active sidebar link bg
  accentBg2:  'rgba(232,124,58,0.18)',   // avatar border glow
  // [NEW] enhanced accent variants
  accentLight:  '#ff9a5c',
  accentDark:    '#c96a2d',
  accentBgStrong: 'rgba(232,124,58,0.25)',
  accentBorder:  'rgba(232,124,58,0.2)',

  // ── Existing text (enhanced) ─────────────────────────────────────────────
  textPrimary:   '#f0f0f5',  // enhanced: was #f0f0f0
  textSecondary: '#9090a8',  // enhanced: was #888888
  textMuted:     '#55556a',  // enhanced: was #555555
  textDim:       '#3a3a4a',  // [NEW] very dim text, dividers

  // ── Existing semantic (enhanced) ──────────────────────────────────────────
  danger:     '#ef4444',  // enhanced: was #e05c5c
  success:    '#34d399',  // enhanced: was #4caf7d
  warning:    '#fbbf24',  // enhanced: was #e8a23a
  info:       '#60a5fa',  // [NEW]

  // ── [NEW] Student & Faculty role colors ─────────────────────────────────
  student:    '#60a5fa',
  studentBg:  'rgba(96,165,250,0.12)',
  studentBorder: 'rgba(96,165,250,0.2)',
  faculty:    '#a78bfa',
  facultyBg:  'rgba(167,139,250,0.12)',
  facultyBorder: 'rgba(167,139,250,0.2)',

  // ── Existing misc (unchanged) ────────────────────────────────────────────
  white:      '#ffffff',
  overlay:    'rgba(0,0,0,0.55)',
  black:      '#000000',
  transparent: 'rgba(0,0,0,0)',
};

// ════════════════════════════════════════════════════════════════════════════
// BORDER RADIUS (R) — Merged
// ════════════════════════════════════════════════════════════════════════════
export const R = {
  // Existing (backward compatible)
  xs:   8,
  sm:   10,
  md:   14,
  lg:   18,
  xl:   20,
  pill: 999,
  // [NEW] enhanced radius variants
  full:  9999,
  xxl:  24,
};

// ════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY (T) — Merged
// ════════════════════════════════════════════════════════════════════════════
export const T = {
  // Existing (backward compatible)
  xs:   11,
  sm:   12,
  base: 13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  // [NEW] enhanced size variants
  '2xl': 28,
  '3xl': 34,
};

// ════════════════════════════════════════════════════════════════════════════
// SHADOWS — [NEW]
// ════════════════════════════════════════════════════════════════════════════
export const SHADOW = Platform.OS === 'ios'
  ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    }
  : { elevation: 8 };

export const SHADOW_SM = Platform.OS === 'ios'
  ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    }
  : { elevation: 4 };

export const SHADOW_LG = Platform.OS === 'ios'
  ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
    }
  : { elevation: 16 };

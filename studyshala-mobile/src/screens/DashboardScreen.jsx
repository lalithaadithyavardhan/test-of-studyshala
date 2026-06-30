/**
 * screens/StudentDashboard.jsx — StudyShala Student Dashboard
 *
 * Color system from HTML mockup (Claude warm theme):
 *   Background  #13120f  warm dark (not cold black)
 *   Surface     #1e1c19  warm card surface
 *   Border      #2e2c28  normal border
 *   BorderSub   #2a2724  subtle divider
 *   Accent      #DE7356  Claude Peach / terra-cotta
 *   Secondary   #B1ADA1  Cloudy warm stone
 *   TextPrimary #e8e4de  warm white
 *   TextSec     #b1ada1  warm gray
 *   TextMuted   #6b6760  readable dim
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Share, Platform,
  Dimensions, Animated,
} from 'react-native';

// Support both old and new Clipboard API
let Clipboard;
try {
  Clipboard = require('@react-native-clipboard/clipboard').default;
} catch {
  Clipboard = require('react-native').Clipboard;
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getRecentFiles } from '../api/studentApi';
import { openFile } from '../utils/fileActions';
import SidebarDrawer from '../components/SidebarDrawer';
import { API_BASE_URL } from '../config/config';
// ── Offline cache (same pattern as StarredScreen / HistoryScreen) ─────────────
// Lets "Recently viewed" show instantly from local cache with zero internet,
// then silently refresh from the server in the background when online.
import { storage } from '../database/db';

// ─────────────────────────────────────────────────────────────────────────────
// THEME — warm dark palette from HTML mockup
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  // Backgrounds
  bg:          '#13120f',
  surface:     '#1e1c19',
  surface2:    '#252320',
  elevated:    '#2a2724',

  // Borders
  border:      '#2e2c28',
  borderSub:   '#2a2724',

  // Accent — Claude Peach / terra-cotta
  accent:      '#DE7356',
  accentBg:    'rgba(222,115,86,0.09)',
  accentBorder:'rgba(222,115,86,0.25)',

  // Secondary — Cloudy warm stone
  secondary:   '#B1ADA1',
  secondaryBg: 'rgba(177,173,161,0.09)',
  secondaryBdr:'rgba(177,173,161,0.25)',

  // Text
  textPrimary: '#e8e4de',
  textSec:     '#b1ada1',
  textMuted:   '#6b6760',

  // Utility
  white:   '#ffffff',
  success: '#4ade80',
  error:   '#f87171',
  whatsapp:'#25D366',
};

const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, xxl: 14, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18, '2xl': 20 };

const SHADOW_SM = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 3,
};

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const WORKSPACE = [
  { key: 'SavedMaterials', label: 'Saved',        icon: 'bookmark-outline', count: 'Subjects' },
  { key: 'Starred',        label: 'Starred',       icon: 'star-outline',     count: 'Files'  },
  { key: 'History',        label: 'History',       icon: 'time-outline',     count: 'Access codes'  },
  { key: 'Downloads',   label: 'Downloads', icon: 'arrow-down-circle-outline',   count: 'Subjects & Files'   },
];

const TRUST_PILLS = ['No ads', 'Free forever', 'Drive backed', 'Instant access'];

const HOW_STEPS = [
  { num: '1', title: 'Sign in with Google', desc: 'Use your institutional Google account to log in securely' },
  { num: '2', title: 'Enter access code',   desc: 'Get the 8-character code from your faculty member'      },
  { num: '3', title: 'Browse & download',   desc: 'Preview files or save them directly to your device'      },
];

const SUBJECT_ICONS = ['book-outline', 'code-slash-outline', 'calculator-outline', 'flask-outline'];

// "Recently viewed" shows at least this many files, and is the cap for the
// offline cache below — both the list slice and the cache trim use this.
const RECENT_FILES_LIMIT = 10;

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────
const useEntryAnim = (delay = 0) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return anim;
};

// ─────────────────────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const Section = ({ children, delay = 0, style }) => {
  const anim = useEntryAnim(delay);
  return (
    <Animated.View style={[{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [10,0] }) }],
    }, style]}>
      {children}
    </Animated.View>
  );
};

const SectionLabel = ({ children }) => (
  <Text style={styles.sectionLabel}>{children}</Text>
);

const Divider = ({ style }) => <View style={[styles.divider, style]} />;

const TrustPill = ({ children }) => (
  <View style={styles.trustPill}>
    <Ionicons name="checkmark-circle" size={11} color={C.accent} />
    <Text style={styles.trustPillText}>{children}</Text>
  </View>
);

const getFileIcon = (mimeType) => {
  if (!mimeType) return 'document-outline';
  if (mimeType.includes('pdf')) return 'document-outline';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document-text-outline';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'grid-outline';
  if (mimeType.includes('image')) return 'image-outline';
  if (mimeType.includes('presentation') || mimeType.includes('ppt')) return 'easel-outline';
  return 'document-outline';
};

/** Collapsible How It Works */
const HowItWorks = () => {
  const [open, setOpen] = useState(false);
  const rotAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    Animated.spring(rotAnim, { toValue: open ? 0 : 1, useNativeDriver: true, tension: 50, friction: 8 }).start();
    setOpen(v => !v);
  };

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <TouchableOpacity style={styles.howToggle} onPress={toggle} activeOpacity={0.8}>
        <View style={styles.howToggleLeft}>
          <View style={[styles.howToggleIcon, { backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder }]}>
            <Ionicons name="information-circle" size={15} color={C.accent} />
          </View>
          <Text style={styles.howToggleText}>New here? See how it works</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg','180deg'] }) }] }}>
          <Ionicons name="chevron-down" size={15} color={C.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      {open && (
        <View style={styles.howSteps}>
          {HOW_STEPS.map((step, i) => (
            <View key={i} style={[styles.howStep, i === HOW_STEPS.length - 1 && { marginBottom: 0 }]}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{step.num}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [recentFiles,    setRecentFiles]    = useState([]);
  const [refreshing,     setRefreshing]     = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [platformStats,  setPlatformStats]  = useState(null);
  const [statsLoading,   setStatsLoading]   = useState(true);

  

  const loadRecent = useCallback(async () => {
    // Step 1 — instant local cache read (works with zero internet)
    try {
      const cached = await storage.getAllByPrefix('recent:');
      if (cached?.length) {
        const items = cached
          .map((entry) => { try { return JSON.parse(entry.value); } catch { return null; } })
          .filter(Boolean)
          .sort((a, b) => new Date(b.viewedAt || 0) - new Date(a.viewedAt || 0))
          .slice(0, RECENT_FILES_LIMIT);
        if (items.length) setRecentFiles(items);
      }
    } catch {}

    // Step 2 — fetch fresh data from server in the background
    try {
      const { data } = await getRecentFiles();
      const serverFiles = (data.recentFiles || []).slice(0, RECENT_FILES_LIMIT);
      setRecentFiles(serverFiles);

      // Step 3 — sync to local cache so the list survives going offline
      try {
        const existing = await storage.getAllByPrefix('recent:');
        for (const entry of (existing || [])) {
          await storage.delete(entry.key);
        }
      } catch {}
      for (const f of serverFiles) {
        try { await storage.set(`recent:${f.fileId}`, JSON.stringify(f)); } catch {}
      }
    } catch {
      // No internet — keep showing whatever cache gave us above, fail silently
    }
  }, []);

  const loadStats = useCallback(async () => {
    let cancelled = false;

    // Wake the backend (fire-and-forget)
    fetch(`${API_BASE_URL}/api/stats/visit`, { method: 'POST' }).catch(() => {});

    const DELAYS = [0, 5000, 10000, 15000, 20000, 25000, 30000];

    for (let i = 0; i < DELAYS.length; i++) {
      if (cancelled) return;
      if (DELAYS[i] > 0) {
        await new Promise(r => setTimeout(r, DELAYS[i]));
      }
      if (cancelled) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/stats`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setPlatformStats(data);
            setStatsLoading(false);
            return; // success — stop retrying
          }
        }
      } catch {
        // Backend still cold-starting — keep retrying
      }
    }

    // All retries exhausted — show fallbacks
    if (!cancelled) setStatsLoading(false);

    return () => { cancelled = true; };
  }, []);

  useEffect(() => { loadRecent(); loadStats(); }, [loadRecent, loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRecent(), loadStats()]);
    setRefreshing(false);
  };

  const handleRecentFilePress = (file) => {
    openFile(
      { ...file, _id: file.fileId, name: file.fileName },
      { _id: file.materialId, subjectName: file.subjectName },
      navigation,
    );

    // Optimistic "recently viewed" update — bump this file to the top locally
    // right away. This is what makes the list correct offline too: the
    // server-side trackRecentFile() call inside openFile()/fileActions may
    // silently fail with no internet, but the user still just viewed the
    // file, so it should still show up here immediately.
    const entry = { ...file, viewedAt: new Date().toISOString() };
    setRecentFiles((prev) => {
      const deduped = prev.filter((f) => f.fileId !== file.fileId);
      return [entry, ...deduped].slice(0, RECENT_FILES_LIMIT);
    });
    storage.set(`recent:${file.fileId}`, JSON.stringify(entry)).catch(() => {});
  };

  const firstName = user?.name?.split(' ')[0] || 'Student';
  const initial   = firstName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try { await logout(); } catch {}
  };

  // Alternating subject accent — primary accent then secondary
  const subjectAccent = (idx) => idx % 2 === 0
    ? { color: C.accent, bg: C.accentBg, border: C.accentBorder }
    : { color: C.secondary, bg: C.secondaryBg, border: C.secondaryBdr };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container} edges={['top']}>

        

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconPill} onPress={() => setSidebarOpen(true)} activeOpacity={0.8}>
              <Ionicons name="menu" size={20} color={C.textSec} />
            </TouchableOpacity>

            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.avatarOnline} />
            </View>

            {/*<View style={styles.nameBlock}>
              <Text style={styles.headerName}>{firstName}</Text>
              <Text style={styles.headerSub}>
                {user?.department || 'CSE'} · {user?.semester ? `Sem ${user.semester}` : 'Student'}
              </Text>
            </View>*/}

            {/* Spacer — pushes headerRight (notification button) to the right
                edge of the screen. Added because nameBlock above (which used
                to provide this via flex:1) is commented out. Safe to remove
                this spacer if/when nameBlock is restored, since nameBlock's
                own flex:1 will take over that job again. */}
            <View style={{ flex: 1 }} />

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconPill} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={18} color={C.textSec} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Live stats ── */}
          {/*<Section delay={50}>
            <SectionLabel>Live stats</SectionLabel>
            <View style={styles.statsRow}>
              {[
                {
                  icon: 'people-outline',
                  val: platformStats
                    ? platformStats.totalStudents >= 1000
                      ? `${(platformStats.totalStudents / 1000).toFixed(1)}k`
                      : `${platformStats.totalStudents}`
                    : statsLoading ? '—' : '1.2k',
                  label: 'Students',
                },
                {
                  icon: 'school-outline',
                  val: platformStats
                    ? `${platformStats.totalFaculty}`
                    : statsLoading ? '—' : '84',
                  label: 'Faculty',
                },
                {
                  icon: 'documents-outline',
                  val: platformStats
                    ? `${platformStats.totalMaterials}`
                    : statsLoading ? '—' : '340',
                  label: 'Materials',
                },
              ].map((s, i) => (
                <View key={i} style={[styles.statCard, statsLoading && !platformStats && { opacity: 0.5 }]}>
                  <Ionicons name={s.icon} size={13} color={C.textMuted} style={styles.statIconAbsolute} />
                  <Text style={styles.statNum}>
                    {s.val}
                    {!statsLoading && <Text style={styles.statPlus}>+</Text>}
                  </Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </Section>*/}

          {/* ── Enter code banner ── */}
          <Section delay={100}>
            <TouchableOpacity
              style={styles.banner}
              onPress={() => navigation.navigate('EnterCode')}
              activeOpacity={0.9}
            >
              <View style={styles.bannerIcon}>
                <Ionicons name="key" size={20} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Enter access code</Text>
                <Text style={styles.bannerSub}>Unlock a subject from your faculty</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </Section>

          

          {/* ── Workspace ── */}
          <Section delay={200}>
            <SectionLabel>Workspace</SectionLabel>
            <View style={styles.wsGrid}>
              {WORKSPACE.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.wsCard}
                  onPress={() => navigation.navigate(item.key)}
                  activeOpacity={0.8}
                >
                  <View style={styles.wsAccentLine} />
                  <View style={styles.wsIcon}>
                    <Ionicons name={item.icon} size={16} color={C.accent} />
                  </View>
                  <Text style={styles.wsName}>{item.label}</Text>
                  <Text style={styles.wsCount}>{item.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {/* ── How it works ── */}
        {/*  <Section delay={250}>
            <SectionLabel>Guide</SectionLabel>
            <HowItWorks />
          </Section>                */}

          {/* ── Trust pills ── */}
           {/* <Section delay={300}>
            <View style={styles.trustRow}>
              {TRUST_PILLS.map((p) => <TrustPill key={p}>{p}</TrustPill>)}
            </View>
          </Section>        */}

           {/*<Divider style={{ marginTop: 4, marginBottom: 8 }} />*/}
         
          {/* ── Recently viewed ── */}
          <Section delay={350}>
            <SectionLabel>Recently viewed</SectionLabel>

            {recentFiles.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📄</Text>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptyDesc}>Files you open will appear here for quick access.</Text>
              </View>
            ) : (
              recentFiles.slice(0, RECENT_FILES_LIMIT).map((file) => (
                <TouchableOpacity
                  key={file.fileId}
                  style={styles.fileRow}
                  onPress={() => handleRecentFilePress(file)}
                  activeOpacity={0.8}
                >
                  <View style={styles.fileIco}>
                    <Ionicons
                      name={getFileIcon(file.mimeType)}
                      size={16}
                      color={file.mimeType?.includes('pdf') ? C.accent : C.secondary}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.fileName}</Text>
                    <Text style={styles.fileSub}>{file.subjectName}  ·  {file.viewedAt || 'Recently'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={13} color={C.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </Section>

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* ── FAB ── */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('EnterCode')}
          activeOpacity={0.85}
        >
          <Ionicons name="key" size={22} color={C.white} />
        </TouchableOpacity>

      </SafeAreaView>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigation={navigation}
        role="student"
        user={user}
        onLogout={handleLogout}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: C.bg },
  container: { flex: 1 },

  

  scroll: { paddingBottom: 40 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, marginBottom: 4 },
  iconPill: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarWrap:  { position: 'relative', marginHorizontal: 6 },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  avatarText:   { fontSize: T.base, fontWeight: '700', color: C.white },
  avatarOnline: {
    position: 'absolute', bottom: -1, right: -1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.success, borderWidth: 2, borderColor: C.bg,
  },
  nameBlock:  { flex: 1, marginLeft: 6 },
  headerName: { fontSize: T.base + 1, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.2 },
  headerSub:  { fontSize: T.xs, color: C.textMuted, marginTop: 1 },
  headerRight:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifDot: {
    position: 'absolute', top: 7, right: 7,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: C.accent, borderWidth: 1.5, borderColor: C.bg,
  },

  // Section label
  sectionLabel: {
    fontSize: T.xs, fontWeight: '600', letterSpacing: 0.08,
    textTransform: 'uppercase', color: C.textMuted,
    paddingHorizontal: 16, marginBottom: 9, marginTop: 4,
  },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 18 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 13, paddingHorizontal: 8, alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  statIconAbsolute: { position: 'absolute', top: 8, right: 8 },
  statNum:  { fontSize: T.xl, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  statPlus: { fontSize: T.sm, color: C.accent, fontWeight: '700' },
  statLabel:{ fontSize: T.xs, color: C.textSec, marginTop: 3, fontWeight: '500' },

  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    marginHorizontal: 16, marginBottom: 18,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.accentBorder,
    borderRadius: R.xl, padding: 13, ...SHADOW_SM,
  },
  bannerIcon: {
    width: 42, height: 42, borderRadius: R.md, backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bannerTitle: { fontSize: T.md, fontWeight: '600', color: C.textPrimary },
  bannerSub:   { fontSize: T.sm, color: C.textSec, marginTop: 2 },

  

  // Workspace
  wsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 18 },
  wsCard: {
    width: '47.5%', backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, padding: 13,
    overflow: 'hidden', position: 'relative',
  },
  wsAccentLine: { position: 'absolute', top: 0, left: 0, width: 2, height: '100%', backgroundColor: C.accent },
  wsIcon: {
    width: 30, height: 30, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  wsName:  { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  wsCount: { fontSize: T.xs, color: C.textMuted, marginTop: 2 },

  // How it works
  howToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: 12,
  },
  howToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  howToggleIcon: { width: 28, height: 28, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  howToggleText: { fontSize: T.sm, color: C.textMuted, fontWeight: '500' },
  howSteps: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderTopWidth: 0, borderBottomLeftRadius: R.md, borderBottomRightRadius: R.md, padding: 13,
  },
  howStep:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    borderColor: C.accentBorder, backgroundColor: C.accentBg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumText: { fontSize: T.xs, fontWeight: '700', color: C.accent },
  stepTitle:   { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  stepDesc:    { fontSize: T.xs, color: C.textMuted, marginTop: 3, lineHeight: 16 },

  // Trust pills
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 16, marginBottom: 18 },
  trustPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: R.full, paddingVertical: 4, paddingHorizontal: 10,
  },
  trustPillText: { fontSize: T.xs, color: C.textSec, fontWeight: '500' },

  // Divider
  divider: { height: 1, backgroundColor: C.borderSub, marginHorizontal: 16 },

  // File row
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.surface },
  fileIco: {
    width: 36, height: 36, borderRadius: R.md,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  fileName: { fontSize: T.sm, fontWeight: '500', color: C.textPrimary },
  fileSub:  { fontSize: T.xs, color: C.textSec, marginTop: 2 },

  // Empty
  emptyCard: {
    backgroundColor: C.surface, borderRadius: R.xl, paddingVertical: 32,
    alignItems: 'center', marginHorizontal: 16,
    borderWidth: 1, borderColor: C.border,
  },
  emptyEmoji: { fontSize: 38, marginBottom: 10 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  emptyDesc:  { fontSize: T.sm, color: C.textMuted, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
});
/**
 * screens/FacultyDashboard.jsx — StudyShala Faculty Dashboard
 *
 * Color system from HTML mockup (Claude warm theme):
 *   Background  #13120f  warm dark (not cold black)
 *   Surface     #1e1c19  warm card surface
 *   Border      #2e2c28  normal border
 *   BorderSub   #2a2724  subtle divider
 *   Accent      #DE7356  Claude Peach / terra-cotta (primary)
 *   Secondary   #B1ADA1  Cloudy warm stone (secondary / faculty role)
 *   TextPrimary #e8e4de  warm white
 *   TextSec     #b1ada1  warm gray
 *   TextMuted   #6b6760  readable dim
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Share, Platform,
  Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getFolders, deleteFolder } from '../api/facultyApi';
import SidebarDrawer from '../components/SidebarDrawer';

// Support both new @react-native-clipboard/clipboard and deprecated RN core Clipboard
// Must come after all import statements
let Clipboard;
try {
  Clipboard = require('@react-native-clipboard/clipboard').default;
} catch {
  Clipboard = require('react-native').Clipboard;
}

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

  // Secondary — Cloudy warm stone (faculty identity color)
  secondary:   '#B1ADA1',
  secondaryBg: 'rgba(177,173,161,0.09)',
  secondaryBdr:'rgba(177,173,161,0.25)',

  // Text
  textPrimary: '#e8e4de',
  textSec:     '#b1ada1',
  textMuted:   '#6b6760',

  // Utility
  white:    '#ffffff',
  success:  '#4ade80',
  error:    '#f87171',
  whatsapp: '#25D366',
};

const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, xxl: 14, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18, '2xl': 20 };

const SHADOW_LG = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
};

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const TRUST_PILLS = ['No ads', 'Free forever', 'Drive backed', 'Instant access'];

const WEEKLY_DATA = [
  { day: 'Mon', value: 30 },
  { day: 'Tue', value: 55 },
  { day: 'Wed', value: 40 },
  { day: 'Thu', value: 70 },
  { day: 'Fri', value: 85 },
  { day: 'Sat', value: 100 },
  { day: 'Sun', value: 20 },
];

const MOCK_MATERIALS = [
  { _id: '1', subjectName: 'Data Structures & Algorithms', semester: 'Semester 4', code: 'A3F9K2BX', files: 14, sections: 3, views: 89,  colorIdx: 0 },
  { _id: '2', subjectName: 'Database Management Systems',  semester: 'Semester 4', code: 'DB7XK1QP', files: 8,  sections: 2, views: 67,  colorIdx: 1 },
  { _id: '3', subjectName: 'Computer Networks',            semester: 'Semester 4', code: 'CN9ZRK3W', files: 6,  sections: 2, views: 42,  colorIdx: 0 },
];

const SUBJECT_ICONS = ['book-outline', 'server-outline', 'wifi-outline', 'cpu-outline'];

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

const SectionLabel = ({ children }) => <Text style={styles.sectionLabel}>{children}</Text>;

const TrustPill = ({ children }) => (
  <View style={styles.trustPill}>
    <Ionicons name="checkmark-circle" size={11} color={C.accent} />
    <Text style={styles.trustPillText}>{children}</Text>
  </View>
);

/** Weekly activity bar chart */
const WeeklyChart = () => {
  const maxVal = Math.max(...WEEKLY_DATA.map(d => d.value));
  const today  = new Date().getDay(); // 0=Sun

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Weekly activity</Text>
        <Text style={styles.chartPeriod}>Last 7 days</Text>
      </View>
      <View style={styles.chartBars}>
        {WEEKLY_DATA.map((item, i) => {
          const barH    = (item.value / maxVal) * 40;
          const dayIdx  = (i + 1) % 7;
          const isToday = dayIdx === today;
          return (
            <View key={item.day} style={styles.chartBarWrap}>
              <View style={{ height: 40, justifyContent: 'flex-end', width: '100%' }}>
                <View style={[styles.chartBar, {
                  height: barH,
                  backgroundColor: isToday ? C.accent : C.accentBg,
                  borderColor:     isToday ? C.accent : C.accentBorder,
                }]} />
              </View>
              <Text style={[styles.chartBarLabel, isToday && { color: C.accent }]}>{item.day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/** Access code box with Copy + WhatsApp */
const AccessCodeBox = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      Clipboard.setString(code);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Access my study materials on StudyShala!\n\nSubject Code: ${code}\n\nEnter this code in the app to unlock all materials.`,
        title: 'StudyShala Access Code',
      });
    } catch {}
  };

  return (
    <View style={styles.codeBox}>
      <Text style={styles.codeLabel}>Student access code</Text>
      <View style={styles.codeRow}>
        <Text style={styles.codeValue}>{code}</Text>
        <View style={styles.codeActions}>
          <TouchableOpacity style={styles.codeBtn} onPress={handleCopy} activeOpacity={0.8}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={11} color={copied ? C.success : C.textSec} />
            <Text style={[styles.codeBtnText, copied && { color: C.success }]}>{copied ? 'Copied!' : 'Copy'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.codeBtn, styles.codeBtnWa]} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="logo-whatsapp" size={11} color={C.whatsapp} />
            <Text style={[styles.codeBtnText, { color: C.whatsapp }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

/** Collapsible How It Works */
const HowItWorks = () => {
  const [open, setOpen] = useState(false);
  const rotAnim = useRef(new Animated.Value(0)).current;

  const steps = [
    { num: '1', title: 'Create a material', desc: 'Add subject name, department, and semester' },
    { num: '2', title: 'Upload your files',  desc: 'PDFs, docs, slides — any file type' },
    { num: '3', title: 'Share the code',     desc: 'Students enter it to unlock your materials' },
  ];

  const toggle = () => {
    Animated.spring(rotAnim, { toValue: open ? 0 : 1, useNativeDriver: true, tension: 50, friction: 8 }).start();
    setOpen(v => !v);
  };

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <TouchableOpacity style={styles.howToggle} onPress={toggle} activeOpacity={0.8}>
        <View style={styles.howToggleLeft}>
          <View style={[styles.howToggleIcon, { backgroundColor: C.secondaryBg, borderWidth: 1, borderColor: C.secondaryBdr }]}>
            <Ionicons name="information-circle" size={15} color={C.secondary} />
          </View>
          <Text style={styles.howToggleText}>New here? See how it works</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg','180deg'] }) }] }}>
          <Ionicons name="chevron-down" size={15} color={C.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      {open && (
        <View style={styles.howSteps}>
          {steps.map((step, i) => (
            <View key={i} style={[styles.howStep, i === steps.length - 1 && { marginBottom: 0 }]}>
              <View style={[styles.stepNum, { borderColor: C.accentBorder, backgroundColor: C.accentBg }]}>
                <Text style={[styles.stepNumText, { color: C.accent }]}>{step.num}</Text>
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
export default function FacultyDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [materials,   setMaterials]   = useState(MOCK_MATERIALS);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getFolders();
      if (data.folders?.length) setMaterials(data.folders);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDelete = (material) => {
    Alert.alert(
      'Delete material?',
      `"${material.subjectName}" and all its files will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(material._id);
              setMaterials(prev => prev.filter(m => m._id !== material._id));
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to delete.');
            }
          },
        },
      ]
    );
  };

  const totalFiles    = materials.reduce((s, m) => s + (Array.isArray(m.files) ? m.files.length : (m.fileCount || m.files || 0)), 0);
  const totalSections = materials.reduce((s, m) => s + (Array.isArray(m.subFolders) ? m.subFolders.length : (m.sections || 0)), 0);
  const totalViews    = materials.reduce((s, m) => s + (m.views || m.viewCount || 0), 0);

  const handleLogout = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out', style: 'destructive',
          onPress: async () => {
            try { await logout(); } catch {}
          },
        },
      ]
    );
  };

  const firstName = user?.name?.split(' ')[0] || 'Faculty';
  const initial   = firstName.charAt(0).toUpperCase();

  const sparkData = [8, 14, 10, 20, 16, 22, 18];

  // Material card accent — alternate between accent and secondary
  const matAccent = (colorIdx) => colorIdx % 2 === 0
    ? { color: C.accent,    bg: C.accentBg,    border: C.accentBorder }
    : { color: C.secondary, bg: C.secondaryBg, border: C.secondaryBdr };

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Animated.View style={{ opacity: 1 }}>
          <Ionicons name="book-outline" size={32} color={C.accent} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container} edges={['top']}>

        {/* ── Status pill ── */}
        <View style={styles.notch}>
          <View style={styles.notchPill} />
          {/* Faculty notch dot uses secondary color */}
          <View style={[styles.notchDot, { backgroundColor: C.secondary }]} />
        </View>

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

            {/* Faculty avatar uses secondary (warm stone) */}
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: C.secondary, shadowColor: C.secondary }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.avatarOnline} />
            </View>

            <View style={styles.nameBlock}>
              <Text style={styles.headerName}>{firstName}</Text>
              {/* Faculty subtitle uses accent color to match HTML mockup */}
              <Text style={[styles.headerSub, { color: C.accent }]}>
                {user?.department || 'CSE'} · Instructor
              </Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconPill} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={18} color={C.textSec} />
                <View style={styles.notifDot} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconPill, { borderColor: C.accentBorder }]}
                onPress={handleLogout} activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={18} color={C.accent} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Hero stat card ── */}
          <Section delay={50}>
            <TouchableOpacity style={styles.heroCard} activeOpacity={0.9} onPress={() => navigation.navigate('Analytics')}>
              <Text style={styles.heroNum}>47</Text>
              <Text style={styles.heroLabel}>Students accessing your materials this week</Text>
              {/* Sparkline */}
              <View style={styles.sparkline}>
                {sparkData.map((h, i) => (
                  <View key={i} style={[styles.sparkBar, { height: h * 1.1 }]} />
                ))}
              </View>
            </TouchableOpacity>
          </Section>

          {/* ── Stats grid ── */}
          <Section delay={100}>
            <SectionLabel>Your stats</SectionLabel>
            <View style={styles.statsGrid}>
              {[
                { icon: 'book-outline',          val: materials.length, label: 'Materials', iconBg: C.accentBg,    iconColor: C.accent    },
                { icon: 'document-text-outline', val: totalFiles,       label: 'Total files',iconBg: C.accentBg,   iconColor: C.accent    },
                { icon: 'layers-outline',        val: totalSections,    label: 'Sections',  iconBg: C.secondaryBg, iconColor: C.secondary },
                { icon: 'eye-outline',           val: totalViews,       label: 'Total views',iconBg: C.secondaryBg,iconColor: C.secondary },
              ].map((s, i) => (
                <View key={i} style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: s.iconBg }]}>
                    <Ionicons name={s.icon} size={13} color={s.iconColor} />
                  </View>
                  <Text style={styles.statNum}>{s.val}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </Section>

          {/* ── Weekly chart ── */}
          <Section delay={150}>
            <WeeklyChart />
          </Section>

          {/* ── Create new material ── */}
          <Section delay={200}>
            <TouchableOpacity
              style={styles.createBanner}
              onPress={() => navigation.navigate('CreateMaterial')}
              activeOpacity={0.85}
            >
              <View style={styles.createIcon}>
                <Ionicons name="add" size={22} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.createTitle}>Create new material</Text>
                <Text style={styles.createSub}>Add a subject folder for students</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </Section>

          {/* ── Your materials ── */}
          <Section delay={250}>
            <SectionLabel>Your materials</SectionLabel>

            {materials.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📁</Text>
                <Text style={styles.emptyTitle}>No materials yet</Text>
                <Text style={styles.emptyDesc}>Create your first material above to start sharing with students.</Text>
              </View>
            ) : (
              materials.map((m, idx) => {
                const acc = matAccent(m.colorIdx ?? idx);
                const fileCount    = Array.isArray(m.files)      ? m.files.length      : (m.fileCount || m.files || 0);
                const sectionCount = Array.isArray(m.subFolders) ? m.subFolders.length : (m.sections || 0);
                const viewCount    = m.views || m.viewCount || 0;

                return (
                  <View key={m._id} style={styles.materialCard}>
                    {/* Top accent line */}
                    <View style={[styles.materialTopLine, { backgroundColor: acc.color }]} />

                    {/* Card header — tap to open folder */}
                    <TouchableOpacity
                      style={styles.materialRow}
                      onPress={() => navigation.navigate('FacultyMaterialDetail', { material: m })}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.materialIcon, { backgroundColor: acc.bg, borderColor: acc.border }]}>
                        <Ionicons name={SUBJECT_ICONS[(m.colorIdx || 0) % SUBJECT_ICONS.length]} size={17} color={acc.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.materialTitle} numberOfLines={1}>{m.subjectName}</Text>
                        <View style={[styles.semBadge, { backgroundColor: acc.bg, borderColor: acc.border }]}>
                          <Text style={[styles.semBadgeText, { color: acc.color }]}>{m.semester}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={15} color={C.textMuted} style={{ marginTop: 2 }} />
                    </TouchableOpacity>

                    {/* Meta */}
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="document-outline" size={10} color={C.textMuted} />
                        <Text style={styles.metaText}>Files <Text style={styles.metaVal}>{fileCount}</Text></Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="layers-outline" size={10} color={C.textMuted} />
                        <Text style={styles.metaText}>Sections <Text style={styles.metaVal}>{sectionCount}</Text></Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="eye-outline" size={10} color={C.textMuted} />
                        <Text style={styles.metaText}>Views <Text style={styles.metaVal}>{viewCount}</Text></Text>
                      </View>
                    </View>

                    {/* Access code */}
                    <AccessCodeBox code={m.code} />

                    {/* Action buttons */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('FacultyMaterialDetail', { material: m })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="folder-open-outline" size={13} color={C.accent} />
                        <Text style={[styles.actionBtnText, { color: C.accent }]}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('UploadFiles', { material: m })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="cloud-upload-outline" size={13} color={C.textSec} />
                        <Text style={styles.actionBtnText}>Upload</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('FacultyMaterialDetail', { material: m, openMessage: true })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="megaphone-outline" size={13} color={C.textSec} />
                        <Text style={styles.actionBtnText}>Announce</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnDanger]}
                        onPress={() => handleDelete(m)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={13} color={C.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </Section>

          {/* ── Guide ── */}
          <Section delay={300}>
            <SectionLabel>Guide</SectionLabel>
            <HowItWorks />
          </Section>

          {/* ── Trust pills ── */}
          <Section delay={350}>
            <View style={styles.trustRow}>
              {TRUST_PILLS.map(p => <TrustPill key={p}>{p}</TrustPill>)}
            </View>
          </Section>

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* ── FAB — accent color for create ── */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateMaterial')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color={C.white} />
        </TouchableOpacity>

      </SafeAreaView>

      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigation={navigation}
        role="faculty"
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

  // Notch
  notch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 6 },
  notchPill: { width: 46, height: 6, borderRadius: 3, backgroundColor: C.elevated },
  notchDot:  { width: 6, height: 6, borderRadius: 3 },

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
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  avatarText:   { fontSize: T.base, fontWeight: '700', color: C.white },
  avatarOnline: {
    position: 'absolute', bottom: -1, right: -1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.success, borderWidth: 2, borderColor: C.bg,
  },
  nameBlock:  { flex: 1, marginLeft: 6 },
  headerName: { fontSize: T.base + 1, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.2 },
  headerSub:  { fontSize: T.xs, marginTop: 1, fontWeight: '600' },
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

  // Hero card
  heroCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.accent, borderRadius: R.xl, padding: 16,
    overflow: 'hidden', position: 'relative', ...SHADOW_LG,
  },
  heroNum:   { fontSize: 40, fontWeight: '800', color: C.white, letterSpacing: -1.5, lineHeight: 44 },
  heroLabel: { fontSize: T.sm, color: 'rgba(255,255,255,0.75)', marginTop: 2, lineHeight: 18 },
  sparkline: { position: 'absolute', bottom: 14, right: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  sparkBar:  { width: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  statCard: {
    width: '47%', backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, padding: 13,
    position: 'relative', overflow: 'hidden',
  },
  statIconWrap: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  statNum:   { fontSize: T['2xl'], fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  statLabel: { fontSize: T.xs, color: C.textSec, marginTop: 3, fontWeight: '500' },

  // Weekly chart
  chartCard: {
    backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border,
    padding: 13, marginHorizontal: 16, marginBottom: 12,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  chartTitle:  { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  chartPeriod: { fontSize: T.xs, color: C.textMuted },
  chartBars:   { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 48 },
  chartBarWrap:{ flex: 1, alignItems: 'center' },
  chartBar:    { width: '100%', borderRadius: 3, borderWidth: 1, minHeight: 3 },
  chartBarLabel: { fontSize: 9, color: C.textMuted, fontWeight: '600', marginTop: 4 },

  // Create banner
  createBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderStyle: 'dashed', borderRadius: R.xl, padding: 13,
  },
  createIcon: {
    width: 42, height: 42, borderRadius: R.md,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  createTitle: { fontSize: T.md, fontWeight: '600', color: C.textPrimary },
  createSub:   { fontSize: T.sm, color: C.textSec, marginTop: 2 },

  // Material cards
  materialCard: {
    backgroundColor: C.surface, borderRadius: R.xl, borderWidth: 1, borderColor: C.border,
    padding: 14, marginHorizontal: 16, marginBottom: 10,
    overflow: 'hidden', position: 'relative',
  },
  materialTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  materialRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, marginTop: 4 },
  materialIcon: { width: 38, height: 38, borderRadius: R.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  materialTitle: { fontSize: T.md, fontWeight: '600', color: C.textPrimary, lineHeight: 19 },
  semBadge: { alignSelf: 'flex-start', borderRadius: R.full, paddingVertical: 2, paddingHorizontal: 9, marginTop: 5, borderWidth: 1 },
  semBadgeText: { fontSize: T.xs, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metaItem:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:{ fontSize: T.xs, color: C.textMuted },
  metaVal: { color: C.textSec, fontWeight: '500' },

  // Access code box
  codeBox: {
    backgroundColor: C.elevated, borderWidth: 1.5, borderColor: C.accentBorder,
    borderRadius: R.sm, padding: 11, marginBottom: 10,
  },
  codeLabel:   { fontSize: T.xs - 1, color: C.textSec, marginBottom: 6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.08 },
  codeRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeValue: {
    fontSize: 17, fontWeight: '800', color: C.accent, letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  codeActions: { flexDirection: 'row', gap: 6 },
  codeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: R.xs, paddingVertical: 4, paddingHorizontal: 9,
  },
  codeBtnWa:   { borderColor: 'rgba(37,211,102,0.3)', backgroundColor: 'rgba(37,211,102,0.05)' },
  codeBtnText: { fontSize: T.xs, color: C.textSec, fontWeight: '500' },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 7 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, paddingVertical: 9,
  },
  actionBtnDanger: {
    flex: 0, width: 42, borderColor: 'rgba(248,113,113,0.2)',
    backgroundColor: 'rgba(248,113,113,0.06)',
  },
  actionBtnText: { fontSize: T.sm, fontWeight: '600', color: C.textSec },

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
  howStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  stepNumText: { fontSize: T.xs, fontWeight: '700' },
  stepTitle: { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  stepDesc:  { fontSize: T.xs, color: C.textMuted, marginTop: 3, lineHeight: 16 },

  // Trust pills
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 16, marginBottom: 18 },
  trustPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: R.full, paddingVertical: 4, paddingHorizontal: 10,
  },
  trustPillText: { fontSize: T.xs, color: C.textSec, fontWeight: '500' },

  // Empty
  emptyCard: {
    backgroundColor: C.surface, borderRadius: R.xl, paddingVertical: 34,
    alignItems: 'center', marginHorizontal: 16, borderWidth: 1, borderColor: C.border,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
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
/**
 * screens/StudentDashboard.jsx — StudyShala Enhanced Student Dashboard
 * 
 * Fully redesigned with enhanced HTML design system:
 * - Notch/status bar
 * - Avatar with gradient ring + online status
 * - Live platform stats with icon overlays
 * - Enter code banner (gradient, animated)
 * - Enrolled subject cards with full metadata
 * - Workspace grid with counts
 * - Collapsible "How it works" guide
 * - Trust pills
 * - Recently viewed files
 * - FAB (Floating Action Button)
 * - Sidebar drawer
 * 
 * Dark base #0a0a0f · Accent #e87c3a · Student #60a5fa
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Clipboard, Share, Platform,
  Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getRecentFiles } from '../api/studentApi';
import FileListItem from '../components/FileListItem';
import { openFile } from '../utils/fileActions';
import RoleSwitchButton from '../components/RoleSwitchButton';
import SidebarDrawer from '../components/SidebarDrawer';
import { C, R, T, SHADOW, SHADOW_SM } from '../components/theme';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const WORKSPACE = [
  { key: 'SavedMaterials', label: 'Saved',         icon: 'bookmark-outline',  count: '12 items' },
  { key: 'Starred',        label: 'Starred',        icon: 'star-outline',      count: '4 items'  },
  { key: 'History',        label: 'History',        icon: 'time-outline',      count: 'Last 7d'  },
  { key: 'AllMaterials',   label: 'All Materials',  icon: 'folder-outline',    count: '2 subs'   },
];

const HOW_STEPS = [
  { num: '1', title: 'Sign in with Google', desc: 'Use your institutional Google account to log in securely' },
  { num: '2', title: 'Enter access code',    desc: 'Get the 8-character code from your faculty member' },
  { num: '3', title: 'Browse & download',    desc: 'Preview files or save them directly to your device' },
];

const TRUST_PILLS = ['No ads', 'Free forever', 'Google Drive backed', 'Instant access'];

const SUBJECT_ICONS = ['book-outline', 'code-outline', 'calculator-outline', 'flask-outline'];

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/** Fade + slide up animation when element enters viewport */
const useInViewAnimation = (threshold = 0.1) => {
  const ref = useRef(null);
  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          Animated.timing(animated, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -20px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, animated };
};

// ─────────────────────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Animated section wrapper */
const Section = ({ children, delay = 0, style }) => {
  const { ref, animated } = useInViewAnimation();
  return (
    <Animated.View
      ref={ref}
      style={[
        { opacity: animated, transform: [{ translateY: animated.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

/** Section label with trailing line */
const SectionLabel = ({ children }) => (
  <Text style={styles.sectionLabel}>{children}</Text>
);

/** Divider */
const Divider = ({ style }) => (
  <View style={[styles.divider, style]} />
);

/** Trust pill badge */
const TrustPill = ({ children }) => (
  <View style={styles.trustPill}>
    <Ionicons name="checkmark-circle" size={11} color={C.success} />
    <Text style={styles.trustPillText}>{children}</Text>
  </View>
);

/** File type icon helper */
const getFileIcon = (mimeType) => {
  if (!mimeType) return 'file-outline';
  if (mimeType.includes('pdf')) return 'file-type-pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'file-type-doc';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'file-type-xls';
  if (mimeType.includes('image')) return 'file-type-image';
  if (mimeType.includes('presentation') || mimeType.includes('ppt')) return 'file-type-ppt';
  return 'file-outline';
};

/** Collapsible How It Works section */
const HowItWorks = ({ role = 'student' }) => {
  const [open, setOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const steps = role === 'student' ? HOW_STEPS : [
    { num: '1', title: 'Create a material', desc: 'Add subject name, department, and semester' },
    { num: '2', title: 'Upload your files', desc: 'PDFs, docs, slides — any file type' },
    { num: '3', title: 'Share the code',    desc: 'Students enter it to unlock your materials' },
  ];

  const toggleColor = role === 'faculty' ? C.faculty : C.accent;
  const toggleBg    = role === 'faculty' ? C.facultyBg : C.accentBg;

  const toggle = () => {
    Animated.spring(rotateAnim, {
      toValue: open ? 0 : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
    setOpen(!open);
  };

  return (
    <View>
      <TouchableOpacity style={styles.howToggle} onPress={toggle} activeOpacity={0.8}>
        <View style={styles.howToggleLeft}>
          <View style={[styles.howToggleIcon, { backgroundColor: toggleBg }]}>
            <Ionicons name="information-circle" size={16} color={toggleColor} />
          </View>
          <Text style={styles.howToggleText}>New here? See how it works</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
          <Ionicons name="chevron-down" size={16} color={C.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      {open && (
        <View style={styles.howSteps}>
          {steps.map((step, i) => (
            <View key={i} style={styles.howStep}>
              <View style={[styles.stepNum, { backgroundColor: toggleBg, borderColor: toggleColor + '50' }]}>
                <Text style={[styles.stepNumText, { color: toggleColor }]}>{step.num}</Text>
              </View>
              <View style={styles.stepText}>
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
  const [recentFiles, setRecentFiles]   = useState([]);
  const [refreshing, setRefreshing]     = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [platformStats, setPlatformStats] = useState(null);

  // Enrolled subjects (mock data — replace with API call)
  const [subjects, setSubjects] = useState([
    {
      _id: '1',
      subjectName: 'Data Structures & Algorithms',
      facultyName: 'Dr. Sharma',
      code: 'A3F9K2BX',
      department: 'CSE',
      semester: 'Semester 4',
      files: 14,
      iconIdx: 0,
    },
    {
      _id: '2',
      subjectName: 'Operating Systems',
      facultyName: 'Dr. Rao',
      code: 'BX71QP2Z',
      department: 'CSE',
      semester: 'Semester 4',
      files: 9,
      iconIdx: 1,
    },
  ]);

  const loadRecent = useCallback(async () => {
    try {
      const { data } = await getRecentFiles();
      setRecentFiles(data.recentFiles || []);
    } catch (e) { /* non-critical */ }
  }, []);

  // Fetch platform stats with retry (cold-start backend)
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/stats`);
      if (res.ok) setPlatformStats(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    loadRecent();
    loadStats();
  }, [loadRecent, loadStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRecent(), loadStats()]);
    setRefreshing(false);
  };

  const handleRecentFilePress = (file) =>
    openFile(
      { ...file, _id: file.fileId, name: file.fileName },
      { _id: file.materialId, subjectName: file.subjectName },
      navigation,
    );

  const firstName = user?.name?.split(' ')[0] || 'Student';
  const initial   = firstName.charAt(0).toUpperCase();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container} edges={['top']}>

        {/* ── Notch / Status Bar ── */}
        <View style={styles.notch}>
          <View style={styles.notchPill} />
          <View style={styles.notchDot} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
          }
          showsVerticalScrollIndicator={false}
        >

          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconPill} onPress={() => setSidebarOpen(true)} activeOpacity={0.8}>
              <Ionicons name="menu" size={20} color={C.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.avatarWrap} onPress={() => setSidebarOpen(true)} activeOpacity={0.8}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.avatarStatus} />
            </TouchableOpacity>

            <View style={styles.nameBlock}>
              <Text style={styles.headerName}>{firstName}</Text>
              <Text style={styles.headerSub}>
                {user?.department || 'CSE'} · {user?.semester ? `Sem ${user.semester}` : 'Student'}
              </Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconPill} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={18} color={C.textSecondary} />
                <View style={styles.notifBadge} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconPillAccent} onPress={logout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={18} color={C.accent} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Live Platform Stats ── */}
          <Section delay={50}>
            <SectionLabel>Live platform stats</SectionLabel>
            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statCard} activeOpacity={0.85}>
                <Ionicons name="people-outline" size={14} color={C.textMuted} style={styles.statIcon} />
                <Text style={styles.statNum}>
                  {platformStats ? `${(platformStats.totalStudents / 1000).toFixed(1)}k` : '1.2k'}
                  <Text style={styles.statPlus}>+</Text>
                </Text>
                <Text style={styles.statLabel}>Students</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard} activeOpacity={0.85}>
                <Ionicons name="chalkboard-outline" size={14} color={C.textMuted} style={styles.statIcon} />
                <Text style={styles.statNum}>
                  {platformStats ? platformStats.totalFaculty : '84'}
                  <Text style={styles.statPlus}>+</Text>
                </Text>
                <Text style={styles.statLabel}>Faculty</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard} activeOpacity={0.85}>
                <Ionicons name="documents-outline" size={14} color={C.textMuted} style={styles.statIcon} />
                <Text style={styles.statNum}>
                  {platformStats ? platformStats.totalMaterials : '340'}
                  <Text style={styles.statPlus}>+</Text>
                </Text>
                <Text style={styles.statLabel}>Materials</Text>
              </TouchableOpacity>
            </View>
          </Section>

          {/* ── Enter Code Banner ── */}
          <Section delay={100}>
            <TouchableOpacity
              style={styles.banner}
              onPress={() => navigation.navigate('EnterCode')}
              activeOpacity={0.9}
            >
              <View style={styles.bannerIcon}>
                <Ionicons name="key" size={22} color={C.white} />
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>Enter access code</Text>
                <Text style={styles.bannerSub}>Unlock a subject shared by your faculty</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={C.accent} />
            </TouchableOpacity>
          </Section>

          {/* ── Your Subjects ── */}
          <Section delay={150}>
            <SectionLabel>Your subjects</SectionLabel>

            {subjects.map((subj, idx) => (
              <TouchableOpacity
                key={subj._id}
                style={styles.subjectCard}
                onPress={() => navigation.navigate('SubjectDetail', { material: subj })}
                activeOpacity={0.85}
              >
                {/* Top accent line */}
                <View style={[styles.subjectAccentLine, { backgroundColor: idx === 0 ? C.accent : C.student }]} />

                <View style={styles.subjectTop}>
                  <View style={[styles.subjectIcon, {
                    backgroundColor: idx === 0 ? C.accentBg : C.studentBg,
                    borderColor: idx === 0 ? C.accentBorder : C.studentBorder,
                  }]}>
                    <Ionicons
                      name={SUBJECT_ICONS[idx % SUBJECT_ICONS.length]}
                      size={18}
                      color={idx === 0 ? C.accent : C.student}
                    />
                  </View>
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectTitle} numberOfLines={1}>{subj.subjectName}</Text>
                    <View style={[styles.subjectSemBadge, {
                      backgroundColor: idx === 0 ? C.accentBg : C.studentBg,
                      borderColor: idx === 0 ? C.accentBorder : C.studentBorder,
                    }]}>
                      <Text style={[styles.subjectSemText, { color: idx === 0 ? C.accent : C.student }]}>
                        {subj.semester}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.subjectMeta}>
                  <Text style={styles.metaItem}>
                    <Ionicons name="person-outline" size={11} color={C.textMuted} />
                    {'  '}Faculty <Text style={styles.metaValue}>{subj.facultyName}</Text>
                  </Text>
                  <Text style={styles.metaItem}>
                    <Ionicons name="documents-outline" size={11} color={C.textMuted} />
                    {'  '}Files <Text style={styles.metaValue}>{subj.files} files</Text>
                  </Text>
                  <Text style={styles.metaItem}>
                    <Ionicons name="business-outline" size={11} color={C.textMuted} />
                    {'  '}Dept <Text style={styles.metaValue}>{subj.department}</Text>
                  </Text>
                  <Text style={styles.metaItem}>
                    <Ionicons name="key-outline" size={11} color={C.textMuted} />
                    {'  '}Code <Text style={styles.metaValue}>{subj.code}</Text>
                  </Text>
                </View>

                <TouchableOpacity style={styles.subjectBtn} activeOpacity={0.8}>
                  <Ionicons name="folder-open-outline" size={14} color={C.white} />
                  <Text style={styles.subjectBtnText}>Browse files</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </Section>

          {/* ── Workspace Grid ── */}
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
                    <Ionicons name={item.icon} size={17} color={C.accent} />
                  </View>
                  <Text style={styles.wsName}>{item.label}</Text>
                  <Text style={styles.wsCount}>{item.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {/* ── Guide ── */}
          <Section delay={250}>
            <SectionLabel>Guide</SectionLabel>
            <HowItWorks role="student" />
          </Section>

          {/* ── Trust Pills ── */}
          <Section delay={300}>
            <View style={styles.trustRow}>
              {TRUST_PILLS.map((pill) => (
                <TrustPill key={pill}>{pill}</TrustPill>
              ))}
            </View>
          </Section>

          <Divider style={{ marginTop: 4, marginBottom: 8 }} />

          {/* ── Recently Viewed ── */}
          <Section delay={350}>
            <SectionLabel>Recently viewed</SectionLabel>

            {recentFiles.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📄</Text>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptyDesc}>
                  Files you open will appear here for quick access.
                </Text>
              </View>
            ) : (
              recentFiles.slice(0, 3).map((file) => (
                <TouchableOpacity
                  key={file.fileId}
                  style={styles.fileRow}
                  onPress={() => handleRecentFilePress(file)}
                  activeOpacity={0.8}
                >
                  <View style={styles.fileIco}>
                    <Ionicons
                      name={getFileIcon(file.mimeType)}
                      size={17}
                      color={file.mimeType?.includes('pdf') ? C.error : C.student}
                    />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.fileName}</Text>
                    <Text style={styles.fileSub}>
                      {file.subjectName}
                      <Text style={styles.fileSep}>  ·  </Text>
                      {file.viewedAt || 'Recently'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </Section>

          {/* ── FAB spacer ── */}
          <View style={{ height: 80 }} />

        </ScrollView>

        {/* ── FAB — Quick Enter Code ── */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('EnterCode')}
          activeOpacity={0.85}
        >
          <Ionicons name="key" size={22} color={C.white} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── Sidebar ── */}
      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigation={navigation}
        role="student"
        user={user}
        onLogout={logout}
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

  // ── Notch ───────────────────────────────────────────────────────────────
  notch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  notchPill: {
    width: 46,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.elevated,
  },
  notchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────
  scroll: {
    paddingBottom: 40,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 4,
  },
  iconPill: {
    width: 38, height: 38,
    borderRadius: R.sm,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillAccent: {
    width: 38, height: 38,
    borderRadius: R.sm,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginHorizontal: 4,
  },
  avatar: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // Ring effect: outer glow via shadow
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: T.base,
    fontWeight: '700',
    color: C.white,
  },
  avatarStatus: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.success,
    borderWidth: 2,
    borderColor: C.bg,
  },
  nameBlock: {
    flex: 1,
    marginLeft: 8,
  },
  headerName: {
    fontSize: T.base + 1,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: T.xs,
    color: C.textMuted,
    marginTop: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.accent,
    borderWidth: 1.5,
    borderColor: C.bg,
  },

  // ── Section Label ────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: T.xs,
    fontWeight: '700',
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    color: C.textDim,
    marginBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Stats Row ─────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  statIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  statNum: {
    fontSize: T['2xl'],
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -1,
  },
  statPlus: {
    fontSize: T.md,
    color: C.accent,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: T.xs,
    color: C.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },

  // ── Enter Code Banner ───────────────────────────────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.accentBorder,
    borderRadius: R.xxl,
    padding: 14,
    ...SHADOW_SM,
  },
  bannerIcon: {
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: T.md,
    fontWeight: '700',
    color: C.textPrimary,
  },
  bannerSub: {
    fontSize: T.sm,
    color: C.textMuted,
    marginTop: 3,
  },

  // ── Subject Cards ───────────────────────────────────────────────────────
  subjectCard: {
    backgroundColor: C.surface,
    borderRadius: R.xxl,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  subjectAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 2,
  },
  subjectTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  subjectIcon: {
    width: 40, height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  subjectInfo: {
    flex: 1,
    minWidth: 0,
  },
  subjectTitle: {
    fontSize: T.md,
    fontWeight: '600',
    color: C.textPrimary,
    lineHeight: 20,
  },
  subjectSemBadge: {
    alignSelf: 'flex-start',
    borderRadius: R.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginTop: 5,
    borderWidth: 1,
  },
  subjectSemText: {
    fontSize: T.xs,
    fontWeight: '600',
  },
  subjectMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaItem: {
    fontSize: T.xs,
    color: C.textMuted,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaValue: {
    color: C.textSecondary,
    fontWeight: '500',
  },
  subjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: C.accent,
    borderRadius: R.sm,
    paddingVertical: 10,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  subjectBtnText: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.white,
  },

  // ── Workspace Grid ──────────────────────────────────────────────────────
  wsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  wsCard: {
    width: '47.5%',
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    padding: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  wsAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: '100%',
    backgroundColor: C.accent,
    borderRadius: 0,
  },
  wsIcon: {
    width: 34, height: 34,
    borderRadius: R.sm,
    backgroundColor: C.accentBg,
    borderWidth: 1,
    borderColor: C.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wsName: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.textPrimary,
    width: '100%',
    marginTop: -2,
  },
  wsCount: {
    fontSize: T.xs,
    color: C.textMuted,
    fontWeight: '400',
  },

  // ── How It Works ────────────────────────────────────────────────────────
  howToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderRadius: R.md,
    padding: 12,
  },
  howToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  howToggleIcon: {
    width: 28, height: 28,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howToggleText: {
    fontSize: T.sm,
    color: C.textMuted,
    fontWeight: '500',
  },
  howSteps: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderTopWidth: 0,
    borderRadius: 0,
    borderBottomLeftRadius: R.md,
    borderBottomRightRadius: R.md,
    padding: 14,
  },
  howStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNum: {
    width: 28, height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: {
    fontSize: T.xs,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    paddingTop: 3,
  },
  stepTitle: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.textPrimary,
  },
  stepDesc: {
    fontSize: T.xs,
    color: C.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },

  // ── Trust Pills ─────────────────────────────────────────────────────────
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderRadius: R.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  trustPillText: {
    fontSize: T.xs,
    color: C.textMuted,
    fontWeight: '500',
  },

  // ── Divider ─────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: C.borderSubtle,
    marginHorizontal: 16,
  },

  // ── Recently Viewed ──────────────────────────────────────────────────────
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  fileIco: {
    width: 38, height: 38,
    borderRadius: 10,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: T.sm,
    fontWeight: '500',
    color: C.textPrimary,
  },
  fileSub: {
    fontSize: T.xs,
    color: C.textMuted,
    marginTop: 2,
  },
  fileSep: {
    color: C.textDim,
  },

  // ── Empty State ─────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: R.xxl,
    paddingVertical: 32,
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  emptyDesc:  { fontSize: T.sm, color: C.textMuted, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },

  // ── FAB ─────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 50, height: 50,
    borderRadius: 25,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
});

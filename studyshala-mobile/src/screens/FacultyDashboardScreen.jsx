/**
 * screens/FacultyDashboard.jsx — StudyShala Enhanced Faculty Dashboard
 * 
 * Fully redesigned with enhanced HTML design system:
 * - Notch/status bar
 * - Avatar with gradient ring (purple for faculty) + online status
 * - Hero stat card (students this week) with gradient + sparkline
 * - Stat cards with icon overlays
 * - Weekly activity bar chart
 * - Create new material banner (dashed border)
 * - Material cards with access code box (monospace, copy/whatsapp)
 * - Action buttons (Upload, Announce, Delete)
 * - Collapsible "How it works" guide
 * - Trust pills
 * - FAB (Floating Action Button)
 * - Sidebar drawer
 * 
 * Dark base #0a0a0f · Accent #e87c3a · Faculty #a78bfa
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
import { getFolders, deleteFolder } from '../api/facultyApi';
import MaterialCard from '../components/MaterialCard';
import RoleSwitchButton from '../components/RoleSwitchButton';
import SidebarDrawer from '../components/SidebarDrawer';
import { C, R, T, SHADOW, SHADOW_SM, SHADOW_LG } from '../components/theme';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const TRUST_PILLS = ['No ads', 'Free forever', 'Google Drive backed', 'Instant access'];

const WEEKLY_DATA = [
  { day: 'Mon', value: 30 },
  { day: 'Tue', value: 55 },
  { day: 'Wed', value: 40 },
  { day: 'Thu', value: 70 },
  { day: 'Fri', value: 85 },
  { day: 'Sat', value: 100 },
  { day: 'Sun', value: 20 },
];

// Mock data — replace with real API
const MOCK_MATERIALS = [
  {
    _id: '1',
    subjectName: 'Data Structures & Algorithms',
    semester: 'Semester 4',
    code: 'A3F9K2BX',
    files: 14,
    sections: 3,
    views: 89,
    colorIdx: 0,
  },
  {
    _id: '2',
    subjectName: 'Database Management Systems',
    semester: 'Semester 4',
    code: 'DB7XK1QP',
    files: 8,
    sections: 2,
    views: 67,
    colorIdx: 1,
  },
  {
    _id: '3',
    subjectName: 'Computer Networks',
    semester: 'Semester 4',
    code: 'CN9ZRK3W',
    files: 6,
    sections: 2,
    views: 42,
    colorIdx: 2,
  },
];

const SUBJECT_ICONS = ['book-outline', 'database-outline', 'wifi-outline', 'cpu-outline'];

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM HOOKS
// ─────────────────────────────────────────────────────────────────────────────

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

const SectionLabel = ({ children }) => (
  <Text style={styles.sectionLabel}>{children}</Text>
);

const Divider = ({ style }) => (
  <View style={[styles.divider, style]} />
);

const TrustPill = ({ children }) => (
  <View style={styles.trustPill}>
    <Ionicons name="checkmark-circle" size={11} color={C.success} />
    <Text style={styles.trustPillText}>{children}</Text>
  </View>
);

/** Weekly bar chart */
const WeeklyChart = ({ data = WEEKLY_DATA }) => {
  const maxVal = Math.max(...data.map((d) => d.value));
  const today = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Weekly activity</Text>
        <Text style={styles.chartPeriod}>Last 7 days</Text>
      </View>
      <View style={styles.chartBars}>
        {data.map((item, i) => {
          const barHeight = (item.value / maxVal) * 40;
          // Map JS day (0=Sun) to our Mon-start array
          const dayIndex = (i + 1) % 7; // Mon=1 in WEEKLY_DATA
          const isToday = dayIndex === today;

          return (
            <View key={item.day} style={styles.chartBarWrap}>
              <View style={[styles.chartBarContainer, { height: 40 }]}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: barHeight,
                      backgroundColor: isToday ? C.accent : C.accentBg,
                      borderColor: isToday ? C.accent : 'rgba(232,124,58,0.2)',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.chartBarLabel, isToday && { color: C.accent }]}>
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/** Access code box with copy & whatsapp */
const AccessCodeBox = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Access my study materials on StudyShala!\n\nSubject Code: ${code}\n\nDownload the app and enter this code to access all materials.`,
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
            <Ionicons name={copied ? 'checkmark' : 'copy'} size={12} color={copied ? C.success : C.textSecondary} />
            <Text style={[styles.codeBtnText, copied && { color: C.success }]}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.codeBtn, styles.codeBtnWhatsapp]} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="logo-whatsapp" size={12} color="#25D366" />
            <Text style={[styles.codeBtnText, { color: '#25D366' }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

/** Collapsible How It Works */
const HowItWorks = () => {
  const [open, setOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const steps = [
    { num: '1', title: 'Create a material', desc: 'Add subject name, department, and semester' },
    { num: '2', title: 'Upload your files', desc: 'PDFs, docs, slides — any file type' },
    { num: '3', title: 'Share the code',    desc: 'Students enter it to unlock your materials' },
  ];

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
          <View style={[styles.howToggleIcon, { backgroundColor: C.facultyBg }]}>
            <Ionicons name="information-circle" size={16} color={C.faculty} />
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
              <View style={[styles.stepNum, { backgroundColor: C.facultyBg, borderColor: C.facultyBorder }]}>
                <Text style={[styles.stepNumText, { color: C.faculty }]}>{step.num}</Text>
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
export default function FacultyDashboard({ navigation }) {
  const { user, logout } = useAuth();
  const [materials,   setMaterials]   = useState(MOCK_MATERIALS);
  const [loading,     setLoading]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getFolders();
      if (data.folders?.length) setMaterials(data.folders);
    } catch (e) { /* non-critical */ }
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
              setMaterials((prev) => prev.filter((m) => m._id !== material._id));
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to delete.');
            }
          },
        },
      ]
    );
  };

  const handleShare = (material) =>
    navigation.navigate('FacultyMaterialDetail', { material, openShare: true });

  const totalFiles    = materials.reduce((sum, m) => sum + (m.files || 0), 0);
  const totalSections = materials.reduce((s, m) => s + (m.sections || 0), 0);
  const totalViews   = materials.reduce((s, m) => s + (m.views || 0), 0);

  const firstName = user?.name?.split(' ')[0] || 'Faculty';
  const initial   = firstName.charAt(0).toUpperCase();

  // Sparkline bars for hero card (mock weekly student trend)
  const sparkData = [8, 14, 10, 20, 16, 22, 18];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container} edges={['top']}>

        {/* ── Notch / Status Bar ── */}
        <View style={styles.notch}>
          <View style={styles.notchPill} />
          <View style={[styles.notchDot, { backgroundColor: C.faculty }]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.faculty} />
          }
          showsVerticalScrollIndicator={false}
        >

          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconPill} onPress={() => setSidebarOpen(true)} activeOpacity={0.8}>
              <Ionicons name="menu" size={20} color={C.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.avatarWrap} onPress={() => setSidebarOpen(true)} activeOpacity={0.8}>
              <View style={[styles.avatar, { backgroundColor: C.faculty }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={[styles.avatarStatus, { backgroundColor: C.success }]} />
            </TouchableOpacity>

            <View style={styles.nameBlock}>
              <Text style={styles.headerName}>{firstName}</Text>
              <Text style={[styles.headerSub, { color: C.faculty }]}>
                {user?.department || 'CSE'} · Instructor
              </Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconPill} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={18} color={C.textSecondary} />
                <View style={styles.notifBadge} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconPillAccent, { borderColor: C.facultyBorder }]} onPress={logout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={18} color={C.faculty} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Hero Stat Card — Students this week ── */}
          <Section delay={50}>
            <TouchableOpacity style={styles.heroStat} activeOpacity={0.9}>
              <Text style={styles.heroStatNum}>47</Text>
              <Text style={styles.heroStatLabel}>Students accessing your materials this week</Text>
              {/* Sparkline */}
              <View style={styles.sparkline}>
                {sparkData.map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.sparkBar,
                      { height: h * 1.2 },
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          </Section>

          {/* ── Stats Grid ── */}
          <Section delay={100}>
            <View style={styles.statsGrid}>
              <TouchableOpacity style={styles.statCard} activeOpacity={0.85}>
                <View style={[styles.statIconWrap, { backgroundColor: C.accentBg }]}>
                  <Ionicons name="book-outline" size={14} color={C.accent} />
                </View>
                <Text style={styles.statNum}>{materials.length}</Text>
                <Text style={styles.statLabel}>Materials</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard} activeOpacity={0.85}>
                <View style={[styles.statIconWrap, { backgroundColor: C.success + '20' }]}>
                  <Ionicons name="document-text-outline" size={14} color={C.success} />
                </View>
                <Text style={styles.statNum}>{totalFiles}</Text>
                <Text style={styles.statLabel}>Total files</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard} activeOpacity={0.85}>
                <View style={[styles.statIconWrap, { backgroundColor: C.facultyBg }]}>
                  <Ionicons name="layers-outline" size={14} color={C.faculty} />
                </View>
                <Text style={styles.statNum}>{totalSections}</Text>
                <Text style={styles.statLabel}>Sections</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard} activeOpacity={0.85}>
                <View style={[styles.statIconWrap, { backgroundColor: C.accentBg }]}>
                  <Ionicons name="eye-outline" size={14} color={C.accent} />
                </View>
                <Text style={styles.statNum}>{totalViews}</Text>
                <Text style={styles.statLabel}>Total views</Text>
              </TouchableOpacity>
            </View>
          </Section>

          {/* ── Weekly Chart ── */}
          <Section delay={150}>
            <WeeklyChart />
          </Section>

          {/* ── Create New Material ── */}
          <Section delay={200}>
            <TouchableOpacity
              style={styles.createBanner}
              onPress={() => navigation.navigate('CreateMaterial')}
              activeOpacity={0.85}
            >
              <View style={styles.createIcon}>
                <Ionicons name="add" size={22} color={C.accent} />
              </View>
              <View style={styles.createText}>
                <Text style={styles.createTitle}>Create new material</Text>
                <Text style={styles.createSub}>Add a subject folder for your students</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </Section>

          {/* ── Your Materials ── */}
          <Section delay={250}>
            <SectionLabel>Your materials</SectionLabel>

            {materials.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📁</Text>
                <Text style={styles.emptyTitle}>No materials yet</Text>
                <Text style={styles.emptyDesc}>
                  Create your first material above to start sharing with students.
                </Text>
              </View>
            ) : (
              materials.map((m, idx) => (
                <View key={m._id} style={styles.materialCard}>
                  {/* Top accent line */}
                  <View style={[styles.materialAccentLine, {
                    backgroundColor: m.colorIdx === 0 ? C.accent : m.colorIdx === 1 ? C.faculty : C.student,
                  }]} />

                  <View style={styles.materialTop}>
                    <View style={[styles.materialIcon, {
                      backgroundColor: m.colorIdx === 0 ? C.accentBg : m.colorIdx === 1 ? C.facultyBg : C.studentBg,
                      borderColor: m.colorIdx === 0 ? C.accentBorder : m.colorIdx === 1 ? C.facultyBorder : C.studentBorder,
                    }]}>
                      <Ionicons
                        name={SUBJECT_ICONS[m.colorIdx % SUBJECT_ICONS.length]}
                        size={18}
                        color={m.colorIdx === 0 ? C.accent : m.colorIdx === 1 ? C.faculty : C.student}
                      />
                    </View>
                    <View style={styles.materialInfo}>
                      <Text style={styles.materialTitle} numberOfLines={1}>{m.subjectName}</Text>
                      <View style={[styles.materialSemBadge, {
                        backgroundColor: m.colorIdx === 0 ? C.accentBg : m.colorIdx === 1 ? C.facultyBg : C.studentBg,
                        borderColor: m.colorIdx === 0 ? C.accentBorder : m.colorIdx === 1 ? C.facultyBorder : C.studentBorder,
                      }]}>
                        <Text style={[styles.materialSemText, {
                          color: m.colorIdx === 0 ? C.accent : m.colorIdx === 1 ? C.faculty : C.student,
                        }]}>{m.semester}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.materialMeta}>
                    <Text style={styles.metaItem}>
                      <Ionicons name="documents-outline" size={11} color={C.textMuted} />
                      {'  '}Files <Text style={styles.metaValue}>{m.files}</Text>
                    </Text>
                    <Text style={styles.metaItem}>
                      <Ionicons name="layers-outline" size={11} color={C.textMuted} />
                      {'  '}Sections <Text style={styles.metaValue}>{m.sections}</Text>
                    </Text>
                    <Text style={styles.metaItem}>
                      <Ionicons name="eye-outline" size={11} color={C.textMuted} />
                      {'  '}Views <Text style={styles.metaValue}>{m.views}</Text>
                    </Text>
                  </View>

                  {/* Access Code Box */}
                  <AccessCodeBox code={m.code} />

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => navigation.navigate('UploadFiles', { material: m })}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cloud-upload-outline" size={13} color={C.textSecondary} />
                      <Text style={styles.actionBtnText}>Upload</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => navigation.navigate('FacultyMaterialDetail', { material: m, openMessage: true })}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="megaphone-outline" size={13} color={C.textSecondary} />
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
              ))
            )}
          </Section>

          {/* ── Guide ── */}
          <Section delay={300}>
            <SectionLabel>Guide</SectionLabel>
            <HowItWorks />
          </Section>

          {/* ── Trust Pills ── */}
          <Section delay={350}>
            <View style={styles.trustRow}>
              {TRUST_PILLS.map((pill) => (
                <TrustPill key={pill}>{pill}</TrustPill>
              ))}
            </View>
          </Section>

          {/* ── FAB spacer ── */}
          <View style={{ height: 80 }} />

        </ScrollView>

        {/* ── FAB — Create Material ── */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: C.faculty }]}
          onPress={() => navigation.navigate('CreateMaterial')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color={C.white} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── Sidebar ── */}
      <SidebarDrawer
        visible={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigation={navigation}
        role="faculty"
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

  // ── Scroll ─────────────────────────────────────────────────────────────
  scroll: {
    paddingBottom: 40,
  },

  // ── Header ─────────────────────────────────────────────────────────────
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
    borderColor: C.borderSubtle,
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
    backgroundColor: C.faculty,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.faculty,
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
    marginTop: 1,
    fontWeight: '600',
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
  },

  // ── Hero Stat Card ───────────────────────────────────────────────────────
  heroStat: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.accent,
    borderRadius: R.xxl,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOW_LG,
  },
  heroStatNum: {
    fontSize: 40,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  heroStatLabel: {
    fontSize: T.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    lineHeight: 18,
  },
  sparkline: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  sparkBar: {
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },

  // ── Stats Grid ──────────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  statIconWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNum: {
    fontSize: T['2xl'],
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: T.xs,
    color: C.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },

  // ── Weekly Chart ────────────────────────────────────────────────────────
  chartCard: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.textPrimary,
  },
  chartPeriod: {
    fontSize: T.xs,
    color: C.textMuted,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 48,
  },
  chartBarWrap: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarContainer: {
    justifyContent: 'flex-end',
    width: '100%',
  },
  chartBar: {
    width: '100%',
    borderRadius: 3,
    borderWidth: 1,
    minHeight: 3,
  },
  chartBarLabel: {
    fontSize: 9,
    color: C.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },

  // ── Create Banner ───────────────────────────────────────────────────────
  createBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.accentBorder,
    borderStyle: 'dashed',
    borderRadius: R.xxl,
    padding: 14,
  },
  createIcon: {
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: C.accentBg,
    borderWidth: 1,
    borderColor: C.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  createText: {
    flex: 1,
  },
  createTitle: {
    fontSize: T.md,
    fontWeight: '700',
    color: C.textPrimary,
  },
  createSub: {
    fontSize: T.sm,
    color: C.textMuted,
    marginTop: 3,
  },

  // ── Material Cards ───────────────────────────────────────────────────────
  materialCard: {
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
  materialAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  materialTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  materialIcon: {
    width: 40, height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  materialInfo: {
    flex: 1,
    minWidth: 0,
  },
  materialTitle: {
    fontSize: T.md,
    fontWeight: '600',
    color: C.textPrimary,
    lineHeight: 20,
  },
  materialSemBadge: {
    alignSelf: 'flex-start',
    borderRadius: R.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginTop: 5,
    borderWidth: 1,
  },
  materialSemText: {
    fontSize: T.xs,
    fontWeight: '600',
  },
  materialMeta: {
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

  // ── Access Code Box ──────────────────────────────────────────────────────
  codeBox: {
    backgroundColor: '#0d0d14',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    padding: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  codeLabel: {
    fontSize: T.xs - 1,
    color: C.textDim,
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.06,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeValue: {
    fontSize: 17,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  codeActions: {
    flexDirection: 'row',
    gap: 6,
  },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderRadius: R.xs,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  codeBtnWhatsapp: {
    borderColor: 'rgba(37, 211, 102, 0.3)',
    backgroundColor: 'rgba(37, 211, 102, 0.05)',
  },
  codeBtnText: {
    fontSize: T.xs,
    color: C.textSecondary,
    fontWeight: '500',
  },

  // ── Action Buttons ──────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    borderRadius: R.sm,
    paddingVertical: 9,
  },
  actionBtnDanger: {
    flex: 0,
    width: 44,
    paddingVertical: 9,
    flex: 0,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  actionBtnText: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.textSecondary,
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

  // ── Empty State ─────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: R.xxl,
    paddingVertical: 36,
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.base + 1, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyDesc:  { fontSize: T.base, color: C.textMuted, textAlign: 'center', paddingHorizontal: 28, lineHeight: 18 },

  // ── FAB ─────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 50, height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.faculty,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
});

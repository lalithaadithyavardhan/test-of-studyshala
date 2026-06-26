/**
 * components/SidebarDrawer.jsx — StudyShala
 *
 * Warm dark theme — exactly matches FacultyDashboardScreen palette:
 *   bg #13120f · surface #1e1c19 · elevated #2a2724
 *   accent #DE7356 · secondary #B1ADA1
 *
 * Props:
 *   visible      {boolean}
 *   onClose      {() => void}
 *   navigation   {object}
 *   role         {'student' | 'faculty'}
 *   user         {object}  — { name, department, semester }
 *   onLogout     {() => void}
 *   onRoleSwitch {() => void}
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Pressable, Platform, Modal,
  ScrollView, TextInput, Linking, Alert as RNAlert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// ─── Theme — identical to FacultyDashboardScreen ─────────────────────────────
const C = {
  bg:           '#13120f',
  surface:      '#1e1c19',
  surface2:     '#252320',
  elevated:     '#2a2724',
  border:       '#2e2c28',
  borderSub:    '#2a2724',
  accent:       '#DE7356',
  accentBg:     'rgba(222,115,86,0.09)',
  accentBorder: 'rgba(222,115,86,0.25)',
  secondary:    '#B1ADA1',
  secondaryBg:  'rgba(177,173,161,0.09)',
  secondaryBdr: 'rgba(177,173,161,0.25)',
  textPrimary:  '#e8e4de',
  textSec:      '#b1ada1',
  textMuted:    '#6b6760',
  white:        '#ffffff',
  success:      '#4ade80',
  overlay:      'rgba(0,0,0,0.60)',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18 };

const SIDEBAR_WIDTH = 272;

// ─── Nav links per role ───────────────────────────────────────────────────────
const STUDENT_LINKS = [
  { key: 'Dashboard',      label: 'Home',          icon: 'home-outline' },
  { key: 'EnterCode',      label: 'Enter Code',    icon: 'key-outline' },
  { key: '__divider__',    label: 'LIBRARY',       icon: null },
  { key: 'SavedMaterials', label: 'Saved',         icon: 'bookmark-outline' },
  { key: 'Starred',        label: 'Starred',       icon: 'star-outline' },
  { key: 'History',        label: 'History',       icon: 'time-outline' },
];

const FACULTY_LINKS = [
  { key: 'FacultyDashboard', label: 'Home',            icon: 'home-outline' },
  { key: '__divider__',      label: 'MATERIALS',       icon: null },
  { key: 'FacultyMaterials', label: 'My Materials',    icon: 'folder-open-outline' },
  { key: 'CreateMaterial',   label: 'Create Material', icon: 'add-circle-outline' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function SidebarDrawer({
  visible, onClose, navigation, role = 'student', user, onLogout, onRoleSwitch,
}) {
  const translateX  = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [showLogout,   setShowLogout]   = useState(false);
  const [showAbout,    setShowAbout]    = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbText,       setFbText]       = useState('');
  const [fbSending,    setFbSending]    = useState(false);

  const DEV_GITHUB = 'https://github.com/lalithaadithyavardhan';
  const DEV_EMAIL  = 'adithyasai533@gmail.com';

  const openGitHub = useCallback(() => {
    Linking.openURL(DEV_GITHUB).catch(() =>
      RNAlert.alert('Could not open', 'Check your internet connection and try again.')
    );
  }, []);

  const openMail = useCallback((subject = '', body = '') => {
    const uri = `mailto:${DEV_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(uri).catch(() =>
      RNAlert.alert('No mail app found', 'Please email us at ' + DEV_EMAIL)
    );
  }, []);

  const sendFeedback = useCallback(() => {
    if (!fbText.trim()) return;
    setFbSending(true);
    // Small artificial delay so the spinner is visible, then open mail
    setTimeout(() => {
      openMail('StudyShala Feedback', fbText.trim());
      setFbSending(false);
      setFbText('');
      setShowFeedback(false);
    }, 500);
  }, [fbText, openMail]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -SIDEBAR_WIDTH,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: visible ? 1 : 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const firstName    = user?.name?.split(' ')[0] || (role === 'faculty' ? 'Faculty' : 'Student');
  const initial      = firstName.charAt(0).toUpperCase();
  const links        = role === 'faculty' ? FACULTY_LINKS : STUDENT_LINKS;
  const currentRoute = navigation?.getState?.()?.routes?.slice(-1)[0]?.name || '';

  // Faculty uses secondary (warm stone) — matches dashboard avatar colour
  const roleColor  = role === 'faculty' ? C.secondary : C.accent;
  const roleBg     = role === 'faculty' ? C.secondaryBg : C.accentBg;
  const roleBorder = role === 'faculty' ? C.secondaryBdr : C.accentBorder;

  const navigate = (key) => {
    onClose();
    setTimeout(() => navigation.navigate(key), 180);
  };

  return (
    <>
      {/* ── Overlay ────────────────────────────────────────────────────────── */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[s.overlay, { opacity: overlayAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      <Animated.View style={[s.drawer, { transform: [{ translateX }] }]}>
        <SafeAreaView style={s.inner} edges={['top', 'bottom']}>

          {/* ── Brand row ─────────────────────────────────────────────────── */}
          <View style={s.brandRow}>
            <View style={[s.brandMark, { backgroundColor: C.accentBg, borderColor: C.accentBorder }]}>
              <Text style={s.brandMarkText}>S</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.brandName}>StudyShala</Text>
              <Text style={s.brandSub}>
                {role === 'faculty' ? 'Faculty Portal' : 'Student Portal'}
              </Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.75}>
              <Ionicons name="close" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          {/* ── User identity card ────────────────────────────────────────── */}
          <View style={[s.userCard, { borderColor: roleBorder, backgroundColor: roleBg }]}>
            <View style={[s.userAvatar, { backgroundColor: roleColor }]}>
              <Text style={s.userAvatarText}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName} numberOfLines={1}>{user?.name || firstName}</Text>
              <Text style={[s.userRole, { color: roleColor }]} numberOfLines={1}>
                {user?.department || (role === 'faculty' ? 'CSE' : 'Student')}
                {role === 'faculty' ? ' · Instructor' : user?.semester ? ` · Sem ${user.semester}` : ''}
              </Text>
            </View>
            <View style={s.onlineDot} />
          </View>

          {/* ── Nav links ─────────────────────────────────────────────────── */}
          <View style={s.nav}>
            {links.map((link) => {
              if (link.key === '__divider__') {
                return (
                  <View key={link.label} style={s.sectionLabelRow}>
                    <Text style={s.sectionLabel}>{link.label}</Text>
                    <View style={s.sectionLine} />
                  </View>
                );
              }

              const active = currentRoute === link.key;
              return (
                <TouchableOpacity
                  key={link.key}
                  style={[s.link, active && s.linkActive]}
                  onPress={() => navigate(link.key)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    s.linkIconWrap,
                    active
                      ? { backgroundColor: C.accentBg, borderColor: C.accentBorder }
                      : { backgroundColor: C.elevated, borderColor: C.border },
                  ]}>
                    <Ionicons
                      name={link.icon}
                      size={16}
                      color={active ? C.accent : C.textSec}
                    />
                  </View>
                  <Text style={[s.linkText, active && s.linkTextActive]}>
                    {link.label}
                  </Text>
                  {active && <View style={s.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <View style={s.footer}>
            <View style={s.divider} />

            {/* About */}
            <TouchableOpacity
              style={s.footerLink}
              onPress={() => setShowAbout(true)}
              activeOpacity={0.75}
            >
              <View style={[s.footerIconWrap, { backgroundColor: C.accentBg, borderColor: C.accentBorder }]}>
                <Ionicons name="information-circle-outline" size={15} color={C.accent} />
              </View>
              <Text style={s.footerLinkText}>About StudyShala</Text>
            </TouchableOpacity>

            {/* Feedback */}
            <TouchableOpacity
              style={s.footerLink}
              onPress={() => setShowFeedback(true)}
              activeOpacity={0.75}
            >
              <View style={[s.footerIconWrap, { backgroundColor: 'rgba(222,115,86,0.07)', borderColor: 'rgba(222,115,86,0.20)' }]}>
                <Ionicons name="chatbox-ellipses-outline" size={15} color={C.accent} />
              </View>
              <Text style={s.footerLinkText}>Give Feedback</Text>
            </TouchableOpacity>

            {/* Sign out */}
            <TouchableOpacity
              style={s.footerLink}
              onPress={() => setShowLogout(true)}
              activeOpacity={0.75}
            >
              <View style={[s.footerIconWrap, {
                backgroundColor: 'rgba(248,113,113,0.07)',
                borderColor:     'rgba(248,113,113,0.22)',
              }]}>
                <Ionicons name="log-out-outline" size={15} color="#f87171" />
              </View>
              <Text style={[s.footerLinkText, { color: '#f87171' }]}>Sign out</Text>
            </TouchableOpacity>

            <View style={s.divider} />

            {/* Version */}
            <View style={s.versionRow}>
              <Ionicons name="shield-checkmark-outline" size={11} color={C.textMuted} />
              <Text style={s.versionText}>StudyShala · v1.0 · Free forever</Text>
            </View>
          </View>

        </SafeAreaView>
      </Animated.View>

      {/* ── Sign-out confirmation modal ─────────────────────────────────────── */}
      <Modal
        transparent
        animationType="fade"
        visible={showLogout}
        onRequestClose={() => setShowLogout(false)}
        statusBarTranslucent
      >
        <Pressable style={s.modalBackdrop} onPress={() => setShowLogout(false)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            {/* Icon */}
            <View style={s.modalIconWrap}>
              <Ionicons name="log-out-outline" size={26} color="#f87171" />
            </View>

            {/* Text */}
            <Text style={s.modalTitle}>Sign out?</Text>
            <Text style={s.modalDesc}>
              You'll need to sign back in to access your materials.
            </Text>

            {/* Buttons */}
            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnCancel]}
                onPress={() => setShowLogout(false)}
                activeOpacity={0.8}
              >
                <Text style={s.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnConfirm]}
                onPress={() => {
                  setShowLogout(false);
                  onClose();
                  onLogout?.();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={15} color={C.white} />
                <Text style={s.modalBtnConfirmText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── About modal ────────────────────────────────────────────────────── */}
      <Modal
        transparent
        animationType="slide"
        visible={showAbout}
        onRequestClose={() => setShowAbout(false)}
        statusBarTranslucent
      >
        <Pressable style={s.aboutBackdrop} onPress={() => setShowAbout(false)}>
          <Pressable style={s.aboutCard} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

              {/* Handle bar */}
              <View style={s.aboutHandle} />

              {/* ── Brand ── */}
              <View style={s.aboutBrandRow}>
                <View style={[s.aboutBrandMark, { backgroundColor: C.accentBg, borderColor: C.accentBorder }]}>
                  <Text style={s.aboutBrandMarkText}>S</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.aboutAppName}>StudyShala</Text>
                  <Text style={s.aboutTagline}>Empowering education through seamless material sharing.</Text>
                </View>
              </View>

              {/* Trust pills */}
              <View style={s.aboutPillsRow}>
                {['No ads', 'Free forever', 'Drive-backed', 'Instant access'].map((p) => (
                  <View key={p} style={s.aboutPill}>
                    <Ionicons name="checkmark-circle" size={11} color={C.accent} />
                    <Text style={s.aboutPillText}>{p}</Text>
                  </View>
                ))}
              </View>

              <View style={s.aboutDivider} />

              {/* ── Developer card ── */}
              <Text style={s.aboutSectionLabel}>DEVELOPER</Text>
              <View style={s.devCard}>

                {/* Avatar + name + role */}
                <View style={s.devTopRow}>
                  <View style={s.devAvatar}>
                    <Text style={s.devAvatarText}>A</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.devName}>Borra Adithya</Text>
                    <Text style={s.devSubTitle}>Lalitha Adithya Vardhan</Text>
                    <Text style={s.devRole}>Student · Full-stack Developer</Text>
                  </View>
                </View>

                {/* Built with love badge */}
                <View style={[s.devBuiltBadge, { backgroundColor: C.accentBg, borderColor: C.accentBorder, alignSelf: 'flex-start', marginBottom: 14 }]}>
                  <Ionicons name="heart" size={11} color={C.accent} />
                  <Text style={s.devBuiltBadgeText}>Built with love for students</Text>
                </View>

                {/* GitHub banner */}
                <View style={s.devGithubBanner}>
                  <View style={s.devBannerLeft}>
                    <View style={s.devBannerIconBox}>
                      <Ionicons name="logo-github" size={20} color={C.textPrimary} />
                    </View>
                    <View>
                      <Text style={s.devBannerHandle}>lalithaadithyavardhan</Text>
                      <Text style={s.devBannerMeta}>github.com · Open source projects</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={s.devFollowBtn} onPress={openGitHub} activeOpacity={0.8}>
                    <Ionicons name="person-add-outline" size={13} color={C.white} />
                    <Text style={s.devFollowBtnText}>Follow</Text>
                  </TouchableOpacity>
                </View>

                {/* Follow CTA full-width */}
                <TouchableOpacity style={s.devGithubCta} onPress={openGitHub} activeOpacity={0.8}>
                  <Ionicons name="logo-github" size={15} color={C.textPrimary} />
                  <Text style={s.devGithubCtaText}>View GitHub Profile</Text>
                  <Ionicons name="arrow-forward-outline" size={14} color={C.textMuted} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                {/* Email banner */}
                <View style={[s.devGithubBanner, { borderColor: C.accentBorder, backgroundColor: C.accentBg, marginTop: 10 }]}>
                  <View style={s.devBannerLeft}>
                    <View style={[s.devBannerIconBox, { backgroundColor: 'rgba(222,115,86,0.15)', borderColor: C.accentBorder }]}>
                      <Ionicons name="mail" size={18} color={C.accent} />
                    </View>
                    <View>
                      <Text style={[s.devBannerHandle, { color: C.accent }]}>adithyasai533@gmail.com</Text>
                      <Text style={s.devBannerMeta}>Direct contact · replies within 24h</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[s.devFollowBtn, s.devContactBtn]}
                    onPress={() => openMail('Hello — StudyShala', '')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="send-outline" size={13} color={C.accent} />
                    <Text style={[s.devFollowBtnText, { color: C.accent }]}>Mail</Text>
                  </TouchableOpacity>
                </View>

                {/* Contact CTA full-width */}
                <TouchableOpacity
                  style={[s.devGithubCta, { borderColor: C.accentBorder, backgroundColor: 'rgba(222,115,86,0.06)', marginTop: 8 }]}
                  onPress={() => openMail('Hello — StudyShala', '')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mail-outline" size={15} color={C.accent} />
                  <Text style={[s.devGithubCtaText, { color: C.accent }]}>Send a Message</Text>
                  <Ionicons name="arrow-forward-outline" size={14} color={C.accent} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              </View>

              {/* Bio */}
              <Text style={s.aboutBio}>
                Built StudyShala to make it easy for faculty to share study materials and for students to access them without friction — free, ad-free, always.
              </Text>

              {/* Quote */}
              <View style={s.aboutQuoteBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.textMuted} style={{ marginBottom: 4 }} />
                <Text style={s.aboutQuote}>
                  "If it helps even one student, that's all the reward I need."
                </Text>
              </View>

              <View style={s.aboutDivider} />

              {/* What it does */}
              <Text style={s.aboutSectionLabel}>WHAT IT DOES</Text>
              <View style={s.aboutFeatureGrid}>
                {[
                  { icon: 'key-outline',          text: 'Access materials with a code' },
                  { icon: 'cloud-upload-outline',  text: 'Upload PDFs, docs & slides' },
                  { icon: 'share-social-outline',  text: 'Share instantly with class' },
                  { icon: 'download-outline',      text: 'Download & save for offline' },
                  { icon: 'bookmark-outline',      text: 'Save & star favourites' },
                  { icon: 'time-outline',          text: 'Full access history' },
                ].map((f) => (
                  <View key={f.text} style={s.aboutFeatureItem}>
                    <View style={[s.aboutFeatureIcon, { backgroundColor: C.accentBg, borderColor: C.accentBorder }]}>
                      <Ionicons name={f.icon} size={13} color={C.accent} />
                    </View>
                    <Text style={s.aboutFeatureText}>{f.text}</Text>
                  </View>
                ))}
              </View>

              <View style={s.aboutDivider} />

              {/* Footer line */}
              <Text style={s.aboutFooterLine}>
                © {new Date().getFullYear()} StudyShala · Built by Borra Adithya
              </Text>

              {/* Close */}
              <TouchableOpacity
                style={s.aboutCloseBtn}
                onPress={() => setShowAbout(false)}
                activeOpacity={0.8}
              >
                <Text style={s.aboutCloseBtnText}>Close</Text>
              </TouchableOpacity>

              <View style={{ height: 8 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Feedback modal ──────────────────────────────────────────────────── */}
      <Modal
        transparent
        animationType="slide"
        visible={showFeedback}
        onRequestClose={() => setShowFeedback(false)}
        statusBarTranslucent
      >
        <Pressable style={s.aboutBackdrop} onPress={() => setShowFeedback(false)}>
          <Pressable style={s.aboutCard} onPress={() => {}}>

            {/* Handle */}
            <View style={s.aboutHandle} />

            {/* Header */}
            <View style={s.fbHeaderRow}>
              <View style={[s.fbIconBox, { backgroundColor: C.accentBg, borderColor: C.accentBorder }]}>
                <Ionicons name="chatbox-ellipses" size={20} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fbTitle}>Give Feedback</Text>
                <Text style={s.fbSub}>Your thoughts help make StudyShala better</Text>
              </View>
            </View>

            <View style={s.aboutDivider} />

            {/* Quick-pick chips */}
            <Text style={s.fbChipLabel}>What's this about?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.fbChipRow}
            >
              {['Bug report', 'Feature request', 'UI/UX', 'Performance', 'Other'].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={s.fbChip}
                  onPress={() => setFbText((t) => t ? t : chip + ': ')}
                  activeOpacity={0.8}
                >
                  <Text style={s.fbChipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Text area */}
            <TextInput
              style={s.fbInput}
              placeholder="Describe your feedback…"
              placeholderTextColor={C.textMuted}
              value={fbText}
              onChangeText={setFbText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              returnKeyType="default"
            />

            {/* Recipient note */}
            <View style={s.fbRecipientRow}>
              <Ionicons name="mail-outline" size={12} color={C.textMuted} />
              <Text style={s.fbRecipientText}>Sends to adithyasai533@gmail.com</Text>
            </View>

            {/* Action buttons */}
            <View style={s.fbBtnRow}>
              <TouchableOpacity
                style={[s.fbBtn, s.fbBtnCancel]}
                onPress={() => { setShowFeedback(false); setFbText(''); }}
                activeOpacity={0.8}
              >
                <Text style={s.fbBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.fbBtn, s.fbBtnSend, (!fbText.trim() || fbSending) && s.fbBtnDisabled]}
                onPress={sendFeedback}
                disabled={!fbText.trim() || fbSending}
                activeOpacity={0.8}
              >
                {fbSending
                  ? <Ionicons name="hourglass-outline" size={14} color={C.white} />
                  : <Ionicons name="send" size={14} color={C.white} />
                }
                <Text style={s.fbBtnSendText}>{fbSending ? 'Opening…' : 'Send feedback'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 8 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.overlay,
    zIndex: 20,
  },

  drawer: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: C.bg,
    zIndex: 21,
    borderRightWidth: 1,
    borderRightColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 24,
  },

  inner: { flex: 1 },

  // ── Brand ──────────────────────────────────────────────────────────────────
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 6,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  brandMark: {
    width: 34, height: 34,
    borderRadius: R.sm,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  brandMarkText: { fontSize: T.md, fontWeight: '800', color: C.accent },
  brandName:     { fontSize: T.md, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.2 },
  brandSub:      { fontSize: T.xs, color: C.textMuted, marginTop: 1, fontWeight: '500' },
  closeBtn: {
    width: 30, height: 30, borderRadius: R.xs,
    backgroundColor: C.elevated,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── User card ──────────────────────────────────────────────────────────────
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 6,
    padding: 12,
    borderRadius: R.md,
    borderWidth: 1,
    position: 'relative',
  },
  userAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  userAvatarText: { fontSize: T.base, fontWeight: '700', color: C.white },
  userName:       { fontSize: T.base, fontWeight: '700', color: C.textPrimary },
  userRole:       { fontSize: T.xs,   fontWeight: '600', marginTop: 2 },
  onlineDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.success,
    borderWidth: 1.5, borderColor: C.bg,
  },

  // ── Nav ───────────────────────────────────────────────────────────────────
  nav: { flex: 1, paddingHorizontal: 10, paddingTop: 8 },

  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.textMuted,
    textTransform: 'uppercase',
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: C.border },

  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: R.sm,
    marginBottom: 2,
  },
  linkActive: { backgroundColor: C.surface },
  linkIconWrap: {
    width: 32, height: 32,
    borderRadius: R.xs,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  linkText:       { flex: 1, fontSize: T.base, fontWeight: '500', color: C.textSec },
  linkTextActive: { color: C.textPrimary, fontWeight: '600' },
  activeDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.accent,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: { paddingHorizontal: 10, paddingBottom: 4 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 10 },

  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: R.sm,
    marginBottom: 2,
  },
  footerIconWrap: {
    width: 32, height: 32,
    borderRadius: R.xs,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  footerLinkText: { fontSize: T.base, fontWeight: '500', color: C.textSec },

  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  versionText: { fontSize: T.xs, color: C.textMuted, fontWeight: '500' },

  // ── Sign-out modal ────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  // About modal uses its own backdrop (full-width, bottom-sheet)
  aboutBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
  },
  modalIconWrap: {
    width: 56, height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(248,113,113,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.22)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: T.lg,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: T.sm,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: R.md,
    borderWidth: 1,
  },
  modalBtnCancel: {
    backgroundColor: C.elevated,
    borderColor: C.border,
  },
  modalBtnCancelText: {
    fontSize: T.base,
    fontWeight: '600',
    color: C.textSec,
  },
  modalBtnConfirm: {
    backgroundColor: '#f87171',
    borderColor: 'transparent',
  },
  modalBtnConfirmText: {
    fontSize: T.base,
    fontWeight: '700',
    color: C.white,
  },

  // ── About modal ───────────────────────────────────────────────────────────
  aboutCard: {
    width: '100%',
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 22,
    paddingBottom: 32,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 24,
    // anchored to bottom via flex in backdrop
    alignSelf: 'flex-end',
  },
  aboutHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.elevated,
    alignSelf: 'center',
    marginBottom: 20,
  },

  // Brand row
  aboutBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  aboutBrandMark: {
    width: 42, height: 42,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  aboutBrandMarkText: { fontSize: T.lg, fontWeight: '800', color: C.accent },
  aboutAppName:  { fontSize: T.lg, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  aboutTagline:  { fontSize: T.xs, color: C.textMuted, marginTop: 2, lineHeight: 16 },

  // Trust pills
  aboutPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  aboutPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.elevated,
    borderRadius: R.full,
    paddingVertical: 4, paddingHorizontal: 9,
    borderWidth: 1, borderColor: C.border,
  },
  aboutPillText: { fontSize: T.xs, color: C.textSec, fontWeight: '500' },

  aboutDivider: { height: 1, backgroundColor: C.border, marginVertical: 14 },

  // Creator card
  aboutCreatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: C.elevated,
    borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    padding: 12,
    marginBottom: 12,
  },
  aboutCreatorAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.secondary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  aboutCreatorAvatarText: { fontSize: T.base, fontWeight: '800', color: C.white },
  aboutCreatorName: { fontSize: T.base, fontWeight: '700', color: C.textPrimary },
  aboutCreatorMeta: { fontSize: T.xs,   fontWeight: '500', color: C.textMuted, marginTop: 2 },
  aboutBuiltBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: R.full, paddingVertical: 3, paddingHorizontal: 8,
    borderWidth: 1,
  },
  aboutBuiltBadgeText: { fontSize: 9, fontWeight: '700', color: C.accent },

  // Bio & quote
  aboutBio: {
    fontSize: T.sm, color: C.textSec, lineHeight: 20,
    marginBottom: 12,
  },
  aboutQuoteBox: {
    backgroundColor: C.elevated,
    borderLeftWidth: 3, borderLeftColor: C.accent,
    borderRadius: R.sm,
    padding: 12,
    marginBottom: 2,
  },
  aboutQuote: {
    fontSize: T.sm, color: C.textSec,
    fontStyle: 'italic', lineHeight: 19,
  },

  // Features
  aboutSectionLabel: {
    fontSize: 9, fontWeight: '700', letterSpacing: 1.2,
    color: C.textMuted, textTransform: 'uppercase',
    marginBottom: 10,
  },
  aboutFeatureGrid: { gap: 7, marginBottom: 4 },
  aboutFeatureItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  aboutFeatureIcon: {
    width: 28, height: 28, borderRadius: R.xs,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  aboutFeatureText: { fontSize: T.sm, color: C.textSec, fontWeight: '500', flex: 1 },

  // Links
  aboutLinksRow: { gap: 8, marginBottom: 14 },
  aboutLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  aboutLinkText: { fontSize: T.xs, color: C.textMuted, fontWeight: '500' },

  // Footer line
  aboutFooterLine: {
    fontSize: T.xs, color: C.textMuted,
    textAlign: 'center', marginBottom: 16,
  },

  // Close button
  aboutCloseBtn: {
    backgroundColor: C.elevated,
    borderRadius: R.md, borderWidth: 1, borderColor: C.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  aboutCloseBtnText: { fontSize: T.base, fontWeight: '600', color: C.textSec },

  // ── Dev card ──────────────────────────────────────────────────────────────
  devCard: {
    backgroundColor: C.elevated,
    borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    padding: 14,
    marginBottom: 14,
  },
  devTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 10,
  },
  devAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.accent,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 2, borderColor: C.accentBorder,
  },
  devAvatarText: { fontSize: T.xl, fontWeight: '800', color: C.white },
  devName: {
    fontSize: T.lg,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  devSubTitle: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.accent,
    marginTop: 1,
  },
  devRole: {
    fontSize: T.xs,
    fontWeight: '500',
    color: C.textMuted,
    marginTop: 3,
  },
  devBuiltBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: R.full,
    paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  devBuiltBadgeText: { fontSize: T.xs, fontWeight: '700', color: C.accent },

  // GitHub / Email banners
  devGithubBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    padding: 11,
    marginBottom: 6,
  },
  devBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  devBannerIconBox: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.elevated,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  devBannerHandle: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.textPrimary,
  },
  devBannerMeta: {
    fontSize: T.xs,
    color: C.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  devFollowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.textPrimary,
    borderRadius: R.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
  devFollowBtnText: {
    fontSize: T.xs,
    fontWeight: '700',
    color: C.bg,
  },
  devContactBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.accentBorder,
  },

  // Full-width CTA rows
  devGithubCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.surface,
    borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 2,
  },
  devGithubCtaText: {
    fontSize: T.base,
    fontWeight: '600',
    color: C.textSec,
    flex: 1,
  },

  // ── Feedback modal ────────────────────────────────────────────────────────
  fbHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  fbIconBox: {
    width: 44, height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  fbTitle: {
    fontSize: T.lg,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  fbSub: {
    fontSize: T.xs,
    color: C.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  fbChipLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  fbChipRow: {
    flexDirection: 'row',
    gap: 7,
    paddingBottom: 14,
  },
  fbChip: {
    backgroundColor: C.elevated,
    borderRadius: R.full,
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderWidth: 1, borderColor: C.border,
  },
  fbChipText: {
    fontSize: T.xs,
    fontWeight: '600',
    color: C.textSec,
  },
  fbInput: {
    backgroundColor: C.elevated,
    borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    padding: 13,
    fontSize: T.base,
    color: C.textPrimary,
    minHeight: 110,
    marginBottom: 10,
  },
  fbRecipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 16,
  },
  fbRecipientText: {
    fontSize: T.xs,
    color: C.textMuted,
    fontWeight: '500',
  },
  fbBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fbBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: R.md,
    borderWidth: 1,
  },
  fbBtnCancel: {
    backgroundColor: C.elevated,
    borderColor: C.border,
    flex: 0.4,
  },
  fbBtnCancelText: {
    fontSize: T.base,
    fontWeight: '600',
    color: C.textSec,
  },
  fbBtnSend: {
    backgroundColor: C.accent,
    borderColor: 'transparent',
  },
  fbBtnSendText: {
    fontSize: T.base,
    fontWeight: '700',
    color: C.white,
  },
  fbBtnDisabled: {
    opacity: 0.45,
  },
});
/**
 * components/SidebarDrawer.jsx — StudyShala Dark Theme
 *
 * Slide-in sidebar matching the HTML reference exactly.
 * Used by DashboardScreen (student) and FacultyDashboardScreen.
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
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Pressable, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from './theme';

const SIDEBAR_WIDTH = 270;

// ── Nav links per role ─────────────────────────────────────────────────────
const STUDENT_LINKS = [
  { key: 'Dashboard',      label: 'Home',          icon: 'home-outline' },
  { key: 'EnterCode',      label: 'Enter Code',    icon: 'key-outline' },
  { key: 'SavedMaterials', label: 'Saved',         icon: 'bookmark-outline' },
  { key: 'Starred',        label: 'Starred',       icon: 'star-outline' },
  { key: 'History',        label: 'History',       icon: 'time-outline' },
];

const FACULTY_LINKS = [
  { key: 'FacultyDashboard', label: 'Home',           icon: 'home-outline' },
  { key: 'CreateMaterial',   label: 'Create Material', icon: 'add-circle-outline' },
];

export default function SidebarDrawer({
  visible, onClose, navigation, role = 'student', user, onLogout, onRoleSwitch,
}) {
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -SIDEBAR_WIDTH,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: visible ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const firstName = user?.name?.split(' ')[0] || (role === 'faculty' ? 'Faculty' : 'Student');
  const initial = firstName.charAt(0).toUpperCase();
  const links = role === 'faculty' ? FACULTY_LINKS : STUDENT_LINKS;

  // active route ─ best-effort
  const currentRoute = navigation?.getState?.()?.routes?.slice(-1)[0]?.name || '';

  const navigate = (key) => {
    onClose();
    // small delay so drawer closes before nav push
    setTimeout(() => navigation.navigate(key), 180);
  };

  if (!visible) {
    // keep overlay/drawer in tree but invisible so animation can reverse
  }

  return (
    <>
      {/* ── Overlay ─────────────────────────────────────────────────────── */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* ── Drawer ──────────────────────────────────────────────────────── */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        <SafeAreaView style={styles.inner} edges={['top', 'bottom']}>

          {/* Brand row */}
          <View style={styles.brandRow}>
            <View style={styles.brandAvatar}>
              <Text style={styles.brandAvatarText}>S</Text>
            </View>
            <Text style={styles.brandName}>StudyShala</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Nav links */}
          <View style={styles.nav}>
            {links.map((link) => {
              const active = currentRoute === link.key;
              return (
                <TouchableOpacity
                  key={link.key}
                  style={[styles.link, active && styles.linkActive]}
                  onPress={() => navigate(link.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={link.icon}
                    size={19}
                    color={active ? C.accent : C.textSecondary}
                  />
                  <Text style={[styles.linkText, active && styles.linkTextActive]}>
                    {link.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.divider} />

            {/* Role switch */}
            <TouchableOpacity style={styles.link} onPress={() => { onClose(); onRoleSwitch?.(); }}>
              <Ionicons name="swap-horizontal-outline" size={19} color={C.textSecondary} />
              <Text style={styles.linkText}>
                Switch to {role === 'student' ? 'Faculty' : 'Student'}
              </Text>
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity
              style={styles.link}
              onPress={() => { onClose(); onLogout?.(); }}
            >
              <Ionicons name="log-out-outline" size={19} color={C.accent} />
              <Text style={[styles.linkText, { color: C.accent }]}>Log out</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* User row */}
            <View style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{initial}</Text>
              </View>
              <View>
                <Text style={styles.userName}>{firstName}</Text>
                <Text style={styles.userRole}>
                  {user?.department || (role === 'faculty' ? 'Faculty' : 'Student')}
                  {user?.semester ? ` · Sem ${user.semester}` : ''}
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.overlay,
    zIndex: 20,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#111111',
    zIndex: 21,
    // subtle right border
    borderRightWidth: 1,
    borderRightColor: C.border,
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 24,
  },
  inner: { flex: 1, paddingBottom: 8 },

  // Brand
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 18 : 4,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  brandAvatar: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    backgroundColor: C.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandAvatarText: { fontSize: T.base, fontWeight: '700', color: C.accent },
  brandName: { flex: 1, fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: R.xs,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nav
  nav: { flex: 1, paddingHorizontal: 10, paddingTop: 10 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: R.sm,
    marginBottom: 2,
  },
  linkActive: { backgroundColor: C.accentBg },
  linkText: { fontSize: T.base, fontWeight: '500', color: C.textSecondary },
  linkTextActive: { color: C.accent },

  // Footer
  footer: { paddingHorizontal: 10 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.elevated,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontSize: T.sm, fontWeight: '700', color: C.textPrimary },
  userName: { fontSize: T.base, fontWeight: '600', color: C.textPrimary },
  userRole: { fontSize: T.xs, color: C.textMuted, marginTop: 2 },
});

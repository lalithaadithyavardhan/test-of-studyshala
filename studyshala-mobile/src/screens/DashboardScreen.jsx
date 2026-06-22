/**
 * screens/DashboardScreen.jsx — StudyShala Dark Theme
 * Student landing screen with sidebar replacing bottom tab nav.
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getRecentFiles } from '../api/studentApi';
import FileListItem from '../components/FileListItem';
import { openFile } from '../utils/fileActions';
import RoleSwitchButton from '../components/RoleSwitchButton';
import SidebarDrawer from '../components/SidebarDrawer';
import { C, R, T } from '../components/theme';

// Workspace quick-access grid — mirrors HTML reference nav-grid
const WORKSPACE = [
  { key: 'SavedMaterials', label: 'Saved',        icon: 'bookmark-outline',  count: null },
  { key: 'Starred',        label: 'Starred',       icon: 'star-outline',      count: null },
  { key: 'History',        label: 'History',       icon: 'time-outline',      count: null },
  { key: 'EnterCode',      label: 'All Materials', icon: 'folder-outline',    count: null },
];

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [recentFiles, setRecentFiles]   = useState([]);
  const [refreshing, setRefreshing]     = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const loadRecent = useCallback(async () => {
    try {
      const { data } = await getRecentFiles();
      setRecentFiles(data.recentFiles || []);
    } catch (e) { /* non-critical */ }
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecent();
    setRefreshing(false);
  };

  const handleRecentFilePress = (file) =>
    openFile(file, { _id: file.materialId, subjectName: file.subjectName });

  const firstName = user?.name?.split(' ')[0] || 'Student';
  const initial   = firstName.charAt(0).toUpperCase();

  return (
    <View style={s.root}>
      <SafeAreaView style={s.container} edges={['top']}>

        {/* ── Status-bar row (header) ── */}
        <View style={s.header}>
          {/* Left: hamburger + avatar + name */}
          <View style={s.headerLeft}>
            <TouchableOpacity style={s.iconPill} onPress={() => setSidebarOpen(true)}>
              <Ionicons name="menu" size={20} color={C.textSecondary} />
            </TouchableOpacity>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initial}</Text>
            </View>
            <View>
              <Text style={s.headerName}>{firstName}</Text>
              <Text style={s.headerSub}>
                {user?.department || 'Student'}
                {user?.semester ? ` · Sem ${user.semester}` : ''}
              </Text>
            </View>
          </View>

          {/* Right: notifications + logout */}
          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconPill}>
              <Ionicons name="notifications-outline" size={18} color={C.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconPill} onPress={logout}>
              <Ionicons name="log-out-outline" size={18} color={C.accent} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
          }
          showsVerticalScrollIndicator={false}
        >

          {/* ── Enter Code Banner ── */}
          <TouchableOpacity
            style={s.enterCode}
            onPress={() => navigation.navigate('EnterCode')}
            activeOpacity={0.85}
          >
            <View style={s.ecIcon}>
              <Ionicons name="key" size={22} color={C.white} />
            </View>
            <View style={s.ecText}>
              <Text style={s.ecTitle}>Enter access code</Text>
              <Text style={s.ecSub}>Unlock a subject from your faculty</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={C.textMuted} />
          </TouchableOpacity>

          {/* ── Workspace grid ── */}
          <Text style={s.label}>Workspace</Text>
          <View style={s.navGrid}>
            {WORKSPACE.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={s.navCard}
                onPress={() => navigation.navigate(item.key)}
                activeOpacity={0.8}
              >
                <View style={s.navCardIcon}>
                  <Ionicons name={item.icon} size={17} color={C.textSecondary} />
                </View>
                <View>
                  <Text style={s.navCardName}>{item.label}</Text>
                  {item.count !== null && (
                    <Text style={s.navCardCount}>{item.count}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Role switch ── */}
          <RoleSwitchButton targetRole="faculty" style={{ marginBottom: 22 }} />

          {/* ── Divider ── */}
          <View style={s.divider} />

          {/* ── Recently viewed ── */}
          <View style={s.recentHeader}>
            <Text style={s.label}>Recently viewed</Text>
            {recentFiles.length > 0 && (
              <Text style={s.seeAll}>See all</Text>
            )}
          </View>

          {recentFiles.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>📄</Text>
              <Text style={s.emptyTitle}>Nothing here yet</Text>
              <Text style={s.emptyDesc}>
                Files you open will appear here for quick access.
              </Text>
            </View>
          ) : (
            recentFiles.map((file) => (
              <FileListItem
                key={file.fileId}
                file={{ _id: file.fileId, name: file.fileName, mimeType: file.mimeType }}
                onPress={handleRecentFilePress}
                showStar={false}
                // dark-theme prop for FileListItem to adapt (add if your component supports it)
                dark
              />
            ))
          )}

        </ScrollView>
      </SafeAreaView>

      {/* ── Sidebar (absolute, sits above everything) ── */}
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

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: C.bg },
  container: { flex: 1 },

  // ── Header ──────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.elevated,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText:  { fontSize: T.base, fontWeight: '700', color: C.textPrimary },
  headerName:  { fontSize: T.base + 1, fontWeight: '700', color: C.textPrimary, lineHeight: 18 },
  headerSub:   { fontSize: T.xs, color: C.textSecondary, marginTop: 1, letterSpacing: 0.01 },

  scrollContent: { paddingHorizontal: 18, paddingBottom: 40 },

  // ── Enter Code ────────────────────────────────────
  enterCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.accent + '40',  // accent with 25% opacity
    borderRadius: R.xl,
    padding: 15,
    marginBottom: 24,
  },
  ecIcon: {
    width: 42,
    height: 42,
    borderRadius: R.sm,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ecText:  { flex: 1 },
  ecTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  ecSub:   { fontSize: T.sm, color: C.textSecondary, marginTop: 3 },

  // ── Section label ─────────────────────────────────
  label: {
    fontSize: T.xs,
    fontWeight: '700',
    letterSpacing: 0.09 * 10,
    textTransform: 'uppercase',
    color: C.textMuted,
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  // ── Workspace nav grid ───────────────────────────
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  navCard: {
    width: '47.5%',
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: 15,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  navCardIcon: {
    width: 34,
    height: 34,
    borderRadius: R.xs,
    backgroundColor: C.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCardName:  { fontSize: T.base, fontWeight: '700', color: C.textPrimary },
  navCardCount: { fontSize: T.xs, color: C.textMuted, marginTop: 1 },

  // ── Divider ──────────────────────────────────────
  divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },

  // ── Recently viewed ──────────────────────────────
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  seeAll: { fontSize: T.sm, color: C.accent, fontWeight: '500' },

  // ── Empty state ──────────────────────────────────
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingVertical: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  emptyDesc:  { fontSize: T.base, color: C.textMuted, textAlign: 'center', paddingHorizontal: 24 },
});

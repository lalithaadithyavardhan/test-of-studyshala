/**
 * screens/FacultyDashboardScreen.jsx — StudyShala Dark Theme
 * Faculty landing screen with sidebar drawer.
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getFolders, deleteFolder } from '../api/facultyApi';
import MaterialCard from '../components/MaterialCard';
import RoleSwitchButton from '../components/RoleSwitchButton';
import SidebarDrawer from '../components/SidebarDrawer';
import { C, R, T } from '../components/theme';

export default function FacultyDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [materials,   setMaterials]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getFolders();
      setMaterials(data.folders || []);
    } catch (e) { /* non-critical */ }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

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

  const totalFiles = materials.reduce((sum, m) => {
    const root = m.files?.length || 0;
    const sub  = (m.subFolders || []).reduce((s, sf) => s + (sf.files?.length || 0), 0);
    return sum + root + sub;
  }, 0);

  const totalSections = materials.reduce((s, m) => s + (m.subFolders?.length || 0), 0);
  const firstName = user?.name?.split(' ')[0] || 'Faculty';
  const initial   = firstName.charAt(0).toUpperCase();

  return (
    <View style={s.root}>
      <SafeAreaView style={s.container} edges={['top']}>

        {/* ── Header ── */}
        <View style={s.header}>
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
                {user?.department || 'Faculty'} · Instructor
              </Text>
            </View>
          </View>
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
          {/* ── Role switch ── */}
          <RoleSwitchButton targetRole="student" style={{ marginBottom: 16 }} />

          {/* ── Stats ── */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Ionicons name="folder-open-outline" size={20} color={C.accent} />
              <Text style={s.statNum}>{materials.length}</Text>
              <Text style={s.statLabel}>Materials</Text>
            </View>
            <View style={s.statCard}>
              <Ionicons name="document-text-outline" size={20} color={C.textSecondary} />
              <Text style={s.statNum}>{totalFiles}</Text>
              <Text style={s.statLabel}>Files</Text>
            </View>
            <View style={s.statCard}>
              <Ionicons name="layers-outline" size={20} color={C.textSecondary} />
              <Text style={s.statNum}>{totalSections}</Text>
              <Text style={s.statLabel}>Sections</Text>
            </View>
          </View>

          {/* ── Create CTA — mirrors enter-code banner style ── */}
          <TouchableOpacity
            style={s.createBtn}
            onPress={() => navigation.navigate('CreateMaterial')}
            activeOpacity={0.85}
          >
            <View style={s.createIcon}>
              <Ionicons name="add" size={24} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.createTitle}>Create New Material</Text>
              <Text style={s.createSub}>Add a subject folder for your students</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={C.textMuted} />
          </TouchableOpacity>

          {/* ── Materials label ── */}
          <Text style={s.label}>Your Materials</Text>

          {/* ── List ── */}
          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color={C.accent} />
            </View>
          ) : materials.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>📁</Text>
              <Text style={s.emptyTitle}>No materials yet</Text>
              <Text style={s.emptyDesc}>
                Create your first material above to start sharing with students.
              </Text>
            </View>
          ) : (
            materials.map((m) => (
              <MaterialCard
                key={m._id}
                material={m}
                role="faculty"
                onPress={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat })}
                onUpload={(mat) => navigation.navigate('UploadFiles', { material: mat })}
                onMessage={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat, openMessage: true })}
                onShare={handleShare}
                onDelete={handleDelete}
                dark
              />
            ))
          )}
        </ScrollView>
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

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: C.bg },
  container: { flex: 1 },

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
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.elevated, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: T.base, fontWeight: '700', color: C.textPrimary },
  headerName: { fontSize: T.base + 1, fontWeight: '700', color: C.textPrimary, lineHeight: 18 },
  headerSub:  { fontSize: T.xs, color: C.textSecondary, marginTop: 1 },

  scrollContent: { paddingHorizontal: 18, paddingBottom: 40 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 16, alignItems: 'center', gap: 5,
  },
  statNum:   { fontSize: T.xl, fontWeight: '800', color: C.textPrimary },
  statLabel: { fontSize: T.xs, fontWeight: '600', color: C.textMuted },

  // Create button
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderWidth: 1,
    borderColor: C.accent + '40',
    borderRadius: R.xl, padding: 15, marginBottom: 24,
  },
  createIcon: {
    width: 44, height: 44, borderRadius: R.md,
    backgroundColor: C.accentBg,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  createTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  createSub:   { fontSize: T.sm, color: C.textSecondary, marginTop: 2 },

  label: {
    fontSize: T.xs, fontWeight: '700', letterSpacing: 0.9,
    textTransform: 'uppercase', color: C.textMuted,
    marginBottom: 12, paddingHorizontal: 2,
  },

  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  emptyCard: {
    backgroundColor: C.surface, borderRadius: R.xl,
    paddingVertical: 36, alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.base + 1, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyDesc:  { fontSize: T.base, color: C.textMuted, textAlign: 'center', paddingHorizontal: 28, lineHeight: 18 },
});

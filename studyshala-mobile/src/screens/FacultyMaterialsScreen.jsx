/**
 * screens/FacultyMaterialsScreen.jsx — StudyShala
 * Warm dark theme matching StudentDashboard
 *   bg #13120f · surface #1e1c19 · accent #DE7356
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  ActivityIndicator, Alert, RefreshControl, TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MaterialCard from '../components/MaterialCard';
import { getFolders, deleteFolder } from '../api/facultyApi';

// ─── Theme (matches StudentDashboard) ────────────────────────────────────────
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
  danger:       '#f87171',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18 };

// ─── Filter tabs ─────────────────────────────────────────────────────────────
const FILTERS = ['All', 'Recent', 'A–Z'];

export default function FacultyMaterialsScreen({ navigation }) {
  const [materials, setMaterials]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [search, setSearch]                 = useState('');
  const [searchFocused, setSearchFocused]   = useState(false);
  const [activeFilter, setActiveFilter]     = useState('All');

  const load = useCallback(async () => {
    try {
      const { data } = await getFolders();
      setMaterials(data.folders || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch materials.');
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleDelete = (material) => {
    Alert.alert(
      'Delete material?',
      `"${material.subjectName}" and all its files will be permanently removed. This cannot be undone.`,
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

  // Filter + sort
  let filtered = materials.filter((m) => {
    const q = search.toLowerCase();
    return (
      !q ||
      m.subjectName?.toLowerCase().includes(q) ||
      m.facultyName?.toLowerCase().includes(q) ||
      m.department?.toLowerCase().includes(q)
    );
  });

  if (activeFilter === 'A–Z') {
    filtered = [...filtered].sort((a, b) =>
      (a.subjectName || '').localeCompare(b.subjectName || '')
    );
  } else if (activeFilter === 'Recent') {
    filtered = [...filtered].sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={s.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.textMuted, marginTop: 12, fontSize: T.sm }}>Loading materials…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>My Materials</Text>
          <Text style={s.subtitle}>
            {materials.length} subject{materials.length !== 1 ? 's' : ''} created
          </Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('CreateMaterial')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={C.accent} />
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={s.searchArea}>
        <View style={[s.searchWrap, searchFocused && s.searchWrapFocused]}>
          <Ionicons name="search" size={17} color={searchFocused ? C.accent : C.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search subject, dept, faculty…"
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <View style={s.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.filterTab, activeFilter === f && s.filterTabActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.75}
            >
              <Text style={[s.filterTabText, activeFilter === f && s.filterTabTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
          {filtered.length > 0 && (
            <Text style={s.countBadge}>{filtered.length} shown</Text>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <MaterialCard
            material={item}
            role="faculty"
            onPress={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat })}
            onUpload={(mat) => navigation.navigate('UploadFiles', { material: mat })}
            onMessage={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat, openMessage: true })}
            onShare={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat, openShare: true })}
            onDelete={handleDelete}
            dark
          />
        )}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrap}>
              <Text style={s.emptyEmoji}>{search ? '🔍' : '📁'}</Text>
            </View>
            <Text style={s.emptyTitle}>
              {search ? 'No results found' : 'No materials yet'}
            </Text>
            <Text style={s.emptyDesc}>
              {search
                ? `Nothing matched "${search}". Try a different keyword.`
                : 'Tap the + button to create your first subject material.'}
            </Text>
            {!search && (
              <TouchableOpacity
                style={s.emptyAction}
                onPress={() => navigation.navigate('CreateMaterial')}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={C.white} />
                <Text style={s.emptyActionText}>Create first material</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  title:    { fontSize: T.lg, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: T.xs, color: C.textMuted, marginTop: 2 },
  addBtn: {
    width: 38, height: 38, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  // Search + filters
  searchArea: {
    backgroundColor: C.surface,
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.elevated, borderRadius: R.md,
    paddingHorizontal: 13, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border, gap: 9,
    marginBottom: 11,
  },
  searchWrapFocused: { borderColor: C.accentBorder, backgroundColor: C.surface2 },
  searchInput: { flex: 1, fontSize: T.base, color: C.textPrimary },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12 },
  filterTab: {
    borderRadius: R.full, paddingVertical: 5, paddingHorizontal: 13,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
  },
  filterTabActive: { backgroundColor: C.accentBg, borderColor: C.accentBorder },
  filterTabText:       { fontSize: T.xs, fontWeight: '600', color: C.textMuted },
  filterTabTextActive: { color: C.accent },
  countBadge: { fontSize: T.xs, color: C.textMuted },

  listContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40, flexGrow: 1 },

  // Empty
  emptyCard: {
    backgroundColor: C.surface, borderRadius: R.xl,
    paddingVertical: 40, alignItems: 'center',
    borderWidth: 1, borderColor: C.border, marginTop: 8,
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyEmoji: { fontSize: 30 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyDesc:  {
    fontSize: T.sm, color: C.textMuted,
    textAlign: 'center', paddingHorizontal: 28, lineHeight: 19, marginBottom: 18,
  },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.accent, borderRadius: R.md,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  emptyActionText: { fontSize: T.sm, fontWeight: '700', color: C.white },
});
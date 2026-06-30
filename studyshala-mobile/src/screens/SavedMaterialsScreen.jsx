/**
 * screens/SavedMaterialsScreen.jsx — StudyShala
 * Warm dark theme matching StudentDashboard
 *   bg #13120f · surface #1e1c19 · accent #DE7356
 *
 * Features:
 *  - Back button  (goBack)
 *  - Sidebar open button
 *  - Search bar  (filters by subjectName client-side)
 *  - Sort pills  (Latest first / Oldest first / Name A–Z)
 *  - Item count badge
 *  - File-card style material cards (matching reference screenshot)
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Alert, RefreshControl, TouchableOpacity, TextInput,
  Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SidebarDrawer from '../components/SidebarDrawer';
import { getSavedMaterials, removeSavedMaterial } from '../api/studentApi';
import { useAuth } from '../context/AuthContext';
import { materialRepository } from '../database/materialRepository';

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  bg:           '#13120f',
  surface:      '#1e1c19',
  surface2:     '#252320',
  elevated:     '#2a2724',
  border:       '#2e2c28',
  borderSub:    '#2a2724',
  accent:       '#DE7356',
  accentBg:     'rgba(222,115,86,0.12)',
  accentBorder: 'rgba(222,115,86,0.28)',
  textPrimary:  '#e8e4de',
  textSec:      '#b1ada1',
  textMuted:    '#6b6760',
  white:        '#ffffff',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, xxl: 20, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18 };

// ─── Subject icon map — warm theme colors only ────────────────────────────────
const SUBJECT_ICONS = {
  default:   { icon: 'book-outline',       bg: 'rgba(222,115,86,0.14)',  color: '#DE7356' },
  cs:        { icon: 'code-slash-outline', bg: 'rgba(222,115,86,0.10)',  color: '#C4623F' },
  math:      { icon: 'calculator-outline', bg: 'rgba(177,173,161,0.12)', color: '#B1ADA1' },
  physics:   { icon: 'planet-outline',     bg: 'rgba(177,173,161,0.10)', color: '#9a9690' },
  chemistry: { icon: 'flask-outline',      bg: 'rgba(222,115,86,0.12)',  color: '#c86a4a' },
  bio:       { icon: 'leaf-outline',       bg: 'rgba(177,173,161,0.10)', color: '#B1ADA1' },
  english:   { icon: 'language-outline',   bg: 'rgba(222,115,86,0.14)',  color: '#DE7356' },
  history:   { icon: 'time-outline',       bg: 'rgba(177,173,161,0.12)', color: '#9a9690' },
};

function getSubjectStyle(name = '') {
  const n = name.toLowerCase();
  if (n.includes('data') || n.includes('algorithm') || n.includes('program') || n.includes('operating') || n.includes('network') || n.includes('software') || n.includes('computer') || n.includes('web') || n.includes('database') || n.includes('cloud')) return SUBJECT_ICONS.cs;
  if (n.includes('math') || n.includes('calculus') || n.includes('algebra') || n.includes('statistic')) return SUBJECT_ICONS.math;
  if (n.includes('physics') || n.includes('mechanic') || n.includes('electro')) return SUBJECT_ICONS.physics;
  if (n.includes('chem')) return SUBJECT_ICONS.chemistry;
  if (n.includes('bio') || n.includes('life')) return SUBJECT_ICONS.bio;
  if (n.includes('english') || n.includes('communication') || n.includes('language')) return SUBJECT_ICONS.english;
  if (n.includes('history') || n.includes('social')) return SUBJECT_ICONS.history;
  return SUBJECT_ICONS.default;
}

// ─── Material Card ────────────────────────────────────────────────────────────
function MaterialCard({ material, onPress, onRemove }) {
  const subStyle = getSubjectStyle(material.subjectName);

  const meta = [
    material.facultyName  && { icon: 'person-outline',   label: 'Faculty', value: material.facultyName },
    material.fileCount !== undefined && { icon: 'document-outline', label: 'Files', value: String(material.fileCount ?? material.files?.length ?? 0) },
    material.department   && { icon: 'business-outline', label: 'Dept',    value: material.department },
    material.accessCode   && { icon: 'key-outline',       label: 'Code',    value: material.accessCode },
  ].filter(Boolean);

  return (
    <View style={card.root}>
      {/* ── Top: icon + title + sem + remove ── */}
      <View style={card.top}>
        <View style={[card.iconBox, { backgroundColor: subStyle.bg }]}>
          <Ionicons name={subStyle.icon} size={20} color={subStyle.color} />
        </View>

        <View style={card.titleBlock}>
          <Text style={card.subjectName} numberOfLines={1}>{material.subjectName || 'Untitled'}</Text>
          {material.semester != null && (
            <View style={card.semPill}>
              <Text style={card.semPillText}>Sem {material.semester}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={card.removeBtn} onPress={() => onRemove(material)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="bookmark" size={15} color={C.accent} />
        </TouchableOpacity>
      </View>

      {/* ── Meta row ── */}
      {meta.length > 0 && (
        <View style={card.metaRow}>
          {meta.map((m, i) => (
            <View key={i} style={card.metaItem}>
              <Ionicons name={m.icon} size={11} color={C.textMuted} />
              <Text style={card.metaLabel}>{m.label} </Text>
              <Text style={card.metaValue}>{m.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Browse files button ── */}
      <TouchableOpacity style={card.browseBtn} onPress={() => onPress(material)} activeOpacity={0.82}>
        <Ionicons name="folder-open-outline" size={14} color={C.white} />
        <Text style={card.browseBtnText}>Browse files</Text>
      </TouchableOpacity>
    </View>
  );
}

const card = StyleSheet.create({
  root: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 10,
    gap: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    gap: 5,
  },
  subjectName: {
    fontSize: T.md,
    fontWeight: '700',
    color: C.textPrimary,
  },
  semPill: {
    alignSelf: 'flex-start',
    backgroundColor: C.elevated,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  semPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.textSec,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: R.xs,
    backgroundColor: C.accentBg,
    borderWidth: 1,
    borderColor: C.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaLabel: {
    fontSize: 11,
    color: C.textMuted,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textSec,
  },

  // Browse button
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: R.lg,
    backgroundColor: C.accent,
  },
  browseBtnText: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.2,
  },
});

// ─── Sort config ──────────────────────────────────────────────────────────────
const SORTS = [
  { key: 'latest', label: 'Latest first', icon: 'time-outline'      },
  { key: 'oldest', label: 'Oldest first', icon: 'hourglass-outline'  },
  { key: 'name',   label: 'Name A–Z',     icon: 'text-outline'       },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SavedMaterialsScreen({ navigation }) {
  const { user, logout }              = useAuth();
  const [materials, setMaterials]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [sort, setSort]               = useState('latest');
  // true only when we're showing cached data because the server fetch failed
  // (no internet) — matches the pattern already used in HistoryScreen.
  const [isOffline, setIsOffline]     = useState(false);
  const searchRef  = useRef(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    let hadCache = false;
    // Step 1 — show cached saved materials instantly
    try {
      const cached = await materialRepository.getAllSaved();
      if (cached.length) {
        hadCache = true;
        // Shape cached entries to match server response shape
        const shaped = cached.map(m => ({
          _id:         m.materialId,
          subjectName: m.subject,
          facultyName: m.facultyName,
          department:  m.department,
          semester:    m.semester,
          accessCode:  m.accessCode,
          savedAt:     m.savedAt,
        }));
        setMaterials(shaped);
        setLoading(false); // show immediately, no spinner
      }
    } catch {}

    // Step 2 — fetch from server in background
    try {
      const { data } = await getSavedMaterials();
      const serverMaterials = data.materials || [];
      setMaterials(serverMaterials);
      setIsOffline(false);

      // Step 3 — upsert each into local cache
      for (const mat of serverMaterials) {
        await materialRepository.upsert({
          materialId:  mat._id,
          subject:     mat.subjectName,
          facultyName: mat.facultyName,
          department:  mat.department,
          semester:    mat.semester,
          accessCode:  mat.accessCode,
          version:     mat.version || 1,
          savedOffline: true,
          savedAt:     mat.savedAt || mat.createdAt,
        });
      }
    } catch {
      // Server failed — cached data already showing; tell the user it's stale
      if (hadCache) setIsOffline(true);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleSearch = () => {
    if (searchVisible) {
      setSearchQuery('');
      Animated.timing(searchAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => setSearchVisible(false));
    } else {
      setSearchVisible(true);
      Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start(() => searchRef.current?.focus());
    }
  };

  const handleOpen = async (material) => {
    // Step 1 — navigate immediately with whatever data we have from the list
    // MaterialAccessScreen will load its own files with its own cache-first logic
    const parentNav = navigation.getParent() || navigation;
    parentNav.navigate('MaterialAccess', { material });

    // Step 2 — update lastOpened in local cache so HistoryScreen reflects this visit
    try {
      await materialRepository.upsert({
        materialId:  material._id,
        subject:     material.subjectName,
        facultyName: material.facultyName,
        department:  material.department,
        semester:    material.semester,
        accessCode:  material.accessCode,
        version:     material.version || 1,
        savedOffline: true,
        lastOpened:  new Date().toISOString(),
      });
    } catch {}
  };

  const handleRemove = (material) => {
    Alert.alert('Remove saved material?', material.subjectName, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await removeSavedMaterial(material._id);
            setMaterials((prev) => prev.filter((m) => m._id !== material._id));
            // Update local cache — mark as not saved offline
            await materialRepository.upsert({
              materialId:   material._id,
              subject:      material.subjectName,
              facultyName:  material.facultyName,
              department:   material.department,
              semester:     material.semester,
              accessCode:   material.accessCode,
              version:      material.version || 1,
              savedOffline: false,
            });
          } catch {
            Alert.alert('Error', 'Failed to remove material.');
          }
        },
      },
    ]);
  };

  // Filter + sort
  const filtered = useMemo(() => {
    let list = materials;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) => m.subjectName?.toLowerCase().includes(q));
    }
    if (sort === 'latest') return [...list].sort((a, b) => new Date(b.savedAt || b.createdAt) - new Date(a.savedAt || a.createdAt));
    if (sort === 'oldest') return [...list].sort((a, b) => new Date(a.savedAt || a.createdAt) - new Date(b.savedAt || b.createdAt));
    if (sort === 'name')   return [...list].sort((a, b) => (a.subjectName || '').localeCompare(b.subjectName || ''));
    return list;
  }, [materials, searchQuery, sort]);

  if (loading) {
    return (
      <SafeAreaView style={s.center} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* ── Header (unchanged) ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={C.textSec} />
          </TouchableOpacity>

          <View style={s.headerMid}>
            <View style={s.headerIconBox}>
              <Ionicons name="bookmark" size={16} color={C.accent} />
            </View>
            <View>
              <Text style={s.headerTitle}>Saved Materials</Text>
              <Text style={s.headerSub}>{materials.length} material{materials.length !== 1 ? 's' : ''} saved</Text>
            </View>
            {isOffline && (
              <View style={s.offlinePill}>
                <Ionicons name="cloud-offline-outline" size={11} color={C.textMuted} />
                <Text style={s.offlinePillText}>Offline</Text>
              </View>
            )}
          </View>

          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconBtn} onPress={toggleSearch}>
              <Ionicons name={searchVisible ? 'close' : 'search-outline'} size={18} color={C.textSec} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => setSidebarOpen(true)}>
              <Ionicons name="menu-outline" size={20} color={C.textSec} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search bar ── */}
        {searchVisible && (
          <Animated.View style={[s.searchWrap, { opacity: searchAnim }]}>
            <Ionicons name="search-outline" size={15} color={C.textMuted} />
            <TextInput
              ref={searchRef}
              style={s.searchInput}
              placeholder="Search saved materials…"
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={15} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* ── Sort bar ── */}
        <View style={s.sortRow}>
          <Text style={s.sortLabel}>Sort by</Text>
          {SORTS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[s.sortPill, sort === opt.key && s.sortPillActive]}
              onPress={() => setSort(opt.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={opt.icon} size={12} color={sort === opt.key ? C.white : C.textMuted} />
              <Text style={[s.sortPillText, sort === opt.key && s.sortPillTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={s.countBadge}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* ── List ── */}
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
              onPress={handleOpen}
              onRemove={handleRemove}
            />
          )}
          ListEmptyComponent={
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>🔖</Text>
              <Text style={s.emptyTitle}>
                {searchQuery ? 'No results found' : 'Nothing saved yet'}
              </Text>
              <Text style={s.emptyDesc}>
                {searchQuery
                  ? `No saved materials match "${searchQuery}".`
                  : 'When you open a material, tap the bookmark icon to save it here for quick access.'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>

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

// ─── Screen Styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  safe:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  // Header (unchanged)
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderSub,
    gap: 8,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerMid:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox: {
    width: 34, height: 34, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle:  { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  headerSub:    { fontSize: T.xs, color: C.textMuted, marginTop: 1 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Offline indicator
  offlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    borderRadius: R.full, paddingHorizontal: 8, paddingVertical: 3,
    marginLeft: 6,
  },
  offlinePillText: { fontSize: 10, fontWeight: '600', color: C.textMuted },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: T.base, color: C.textPrimary, padding: 0 },

  // Sort bar
  sortRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderSub,
  },
  sortLabel:         { fontSize: T.xs, color: C.textMuted, fontWeight: '500', marginRight: 2 },
  sortPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 11,
    borderRadius: R.full, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  sortPillActive:    { backgroundColor: C.elevated, borderColor: C.accent + '60' },
  sortPillText:      { fontSize: T.xs, color: C.textMuted, fontWeight: '500' },
  sortPillTextActive:{ color: C.textPrimary, fontWeight: '700' },
  countBadge:        { marginLeft: 'auto', fontSize: T.xs, color: C.textMuted, fontWeight: '500' },

  // List
  listContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 40, flexGrow: 1 },

  // Empty
  emptyCard: {
    backgroundColor: C.surface, borderRadius: R.xl, paddingVertical: 40,
    alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 20,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyDesc:  { fontSize: T.base, color: C.textMuted, textAlign: 'center', paddingHorizontal: 28, lineHeight: 20 },
});
/**
 * screens/SavedMaterialsScreen.jsx — StudyShala
 * Warm dark theme matching StudentDashboard
 *   bg #13120f · surface #1e1c19 · accent #DE7356
 *
 * Features added:
 *  - Back button  (goBack)
 *  - Sidebar open button
 *  - Search bar  (filters by subjectName client-side)
 *  - Sort pills  (Latest first / Oldest first / Name A–Z)
 *  - Item count badge
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Alert, RefreshControl, TouchableOpacity, TextInput,
  Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MaterialCard from '../components/MaterialCard';
import SidebarDrawer from '../components/SidebarDrawer';
import { getSavedMaterials, removeSavedMaterial, getMaterialFiles } from '../api/studentApi';
import { useAuth } from '../context/AuthContext';

// ─── Theme ───────────────────────────────────────────────────────────────────
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
  textPrimary:  '#e8e4de',
  textSec:      '#b1ada1',
  textMuted:    '#6b6760',
  white:        '#ffffff',
  success:      '#4ade80',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18 };

const SORTS = [
  { key: 'latest', label: 'Latest first', icon: 'time-outline'     },
  { key: 'oldest', label: 'Oldest first', icon: 'hourglass-outline' },
  { key: 'name',   label: 'Name A–Z',     icon: 'text-outline'      },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function SavedMaterialsScreen({ navigation }) {
  const { user, logout }            = useAuth();
  const [materials, setMaterials]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [sort, setSort]             = useState('latest');
  const searchRef = useRef(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    try {
      const { data } = await getSavedMaterials();
      setMaterials(data.materials || []);
    } catch {
      Alert.alert('Error', 'Failed to load saved materials.');
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
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
    try {
      const { data } = await getMaterialFiles(material._id);
      const parentNav = navigation.getParent() || navigation;
      parentNav.navigate('MaterialAccess', {
        material: { ...material, ...data.material, files: data.files, subFolders: data.subFolders },
      });
    } catch (e) {
      Alert.alert('Access denied', e.response?.data?.message || 'Could not open this material.');
    }
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

        {/* ── Top header ── */}
        <View style={s.header}>
          {/* Back */}
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={C.textSec} />
          </TouchableOpacity>

          {/* Title + count */}
          <View style={s.headerMid}>
            <View style={s.headerIconBox}>
              <Ionicons name="bookmark" size={16} color={C.accent} />
            </View>
            <View>
              <Text style={s.headerTitle}>Saved Materials</Text>
              <Text style={s.headerSub}>{materials.length} material{materials.length !== 1 ? 's' : ''} saved</Text>
            </View>
          </View>

          {/* Right actions */}
          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconBtn} onPress={toggleSearch}>
              <Ionicons name={searchVisible ? 'close' : 'search-outline'} size={18} color={C.textSec} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => setSidebarOpen(true)}>
              <Ionicons name="menu-outline" size={20} color={C.textSec} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search bar (animated) ── */}
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
              <Ionicons
                name={opt.icon}
                size={12}
                color={sort === opt.key ? C.white : C.textMuted}
              />
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
            <MaterialCard material={item} onPress={handleOpen} onRemove={handleRemove} dark />
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  // Header
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
  headerMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox: {
    width: 34, height: 34, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  headerSub:   { fontSize: T.xs, color: C.textMuted, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

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
  sortLabel: { fontSize: T.xs, color: C.textMuted, fontWeight: '500', marginRight: 2 },
  sortPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 11,
    borderRadius: R.full, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  sortPillActive: { backgroundColor: C.elevated, borderColor: C.accent + '60' },
  sortPillText:   { fontSize: T.xs, color: C.textMuted, fontWeight: '500' },
  sortPillTextActive: { color: C.textPrimary, fontWeight: '700' },
  countBadge: { marginLeft: 'auto', fontSize: T.xs, color: C.textMuted, fontWeight: '500' },

  // List
  listContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 40, flexGrow: 1 },

  // Empty
  emptyCard: {
    backgroundColor: C.surface, borderRadius: R.xl, paddingVertical: 40,
    alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 20,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyDesc:  { fontSize: T.base, color: C.textMuted, textAlign: 'center', paddingHorizontal: 28, lineHeight: 20 },
});
/**
 * screens/HistoryScreen.jsx — StudyShala
 * Warm dark theme matching StudentDashboard & SavedMaterialsScreen
 *   bg #13120f · surface #1e1c19 · accent #DE7356
 *
 * Features:
 *  - Back button  (goBack)
 *  - Sidebar open button
 *  - Search bar  (filters by subjectName client-side)
 *  - Sort pills  (Latest first / Oldest first / Name A–Z)
 *  - Saved Status filter  (All / Saved / Not Saved)
 *  - Item count badge
 *  - Material cards matching SavedMaterialsScreen exactly
 *  - Save Material button / Saved badge  (optimistic, no full reload)
 *  - Copy Access Code  (from accessCode field in history API response)
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Alert, RefreshControl, TouchableOpacity, TextInput,
  Animated, Platform, Clipboard, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SidebarDrawer from '../components/SidebarDrawer';
import { getAccessHistory, getMaterialFiles, saveMaterial } from '../api/studentApi';
import { useAuth } from '../context/AuthContext';
// ── Offline cache (same pattern as StarredScreen) ──────────────────────────────
// Lets Access History show instantly from local cache with zero internet,
// then silently refresh from the server in the background when online.
import { storage } from '../database/db';

// ─── Theme ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function showToast(msg) {
  if (Platform.OS === 'android') {
    const { ToastAndroid } = require('react-native');
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  }
}

function formatAccessedAt(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)  return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7)  return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Sort config ──────────────────────────────────────────────────────────────
const SORTS = [
  { key: 'latest', label: 'Latest first', icon: 'time-outline'     },
  { key: 'oldest', label: 'Oldest first', icon: 'hourglass-outline' },
  { key: 'name',   label: 'Name A–Z',     icon: 'text-outline'      },
];

const SAVE_FILTERS = [
  { key: 'all',     label: 'All'      },
  { key: 'saved',   label: 'Saved'    },
  { key: 'unsaved', label: 'Not Saved' },
];

// ─── Material Card ────────────────────────────────────────────────────────────
const MaterialCard = React.memo(function MaterialCard({
  material, onPress, onSave, saving,
}) {
  const subStyle = getSubjectStyle(material.subjectName);
  const accessedLabel = formatAccessedAt(material.accessedAt);

  const meta = [
    material.facultyName  && { icon: 'person-outline',   label: 'Faculty', value: material.facultyName },
    material.fileCount !== undefined && { icon: 'document-outline', label: 'Files',  value: String(material.fileCount ?? material.files?.length ?? 0) },
    material.department   && { icon: 'business-outline', label: 'Dept',    value: material.department },
    accessedLabel         && { icon: 'time-outline',      label: 'Viewed',  value: accessedLabel },
  ].filter(Boolean);

  const handleCopy = useCallback(() => {
    if (!material.accessCode) return;
    Clipboard.setString(material.accessCode);
    showToast('Access code copied');
  }, [material.accessCode]);

  return (
    <View style={card.root}>
      {/* ── Top: icon + title + semester + save/saved ── */}
      <View style={card.top}>
        <View style={[card.iconBox, { backgroundColor: subStyle.bg }]}>
          <Ionicons name={subStyle.icon} size={20} color={subStyle.color} />
        </View>

        <View style={card.titleBlock}>
          <Text style={card.subjectName} numberOfLines={1}>
            {material.subjectName || 'Untitled'}
          </Text>
          {material.semester != null && (
            <View style={card.semPill}>
              <Text style={card.semPillText}>Sem {material.semester}</Text>
            </View>
          )}
        </View>

        {/* Save button OR saved badge — replaces the remove bookmark of SavedScreen */}
        {material.isSaved ? (
          <View style={card.savedBadge}>
            <Ionicons name="bookmark" size={13} color={C.accent} />
          </View>
        ) : (
          <TouchableOpacity
            style={[card.saveBtn, saving && card.saveBtnDisabled]}
            onPress={() => !saving && onSave(material._id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={saving}
            activeOpacity={0.75}
          >
            {saving
              ? <ActivityIndicator size={13} color={C.accent} />
              : <Ionicons name="bookmark-outline" size={15} color={C.accent} />
            }
          </TouchableOpacity>
        )}
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

      {/* ── Action row: copy code + browse files ── */}
      <View style={card.actionRow}>
        {!!material.accessCode && (
          <TouchableOpacity style={card.copyBtn} onPress={handleCopy} activeOpacity={0.78}>
            <Ionicons name="copy-outline" size={13} color={C.textSec} />
            <Text style={card.copyBtnText}>Copy Code</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[card.browseBtn, !material.accessCode && card.browseBtnFull]}
          onPress={() => onPress(material)}
          activeOpacity={0.82}
        >
          <Ionicons name="folder-open-outline" size={14} color={C.white} />
          <Text style={card.browseBtnText}>Browse files</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const card = StyleSheet.create({
  root: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: 'hidden',
  },

  // Top row
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

  // Save / saved controls — same size/position as SavedScreen's remove bookmark btn
  saveBtn: {
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
  saveBtnDisabled: {
    opacity: 0.55,
  },
  savedBadge: {
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

  // Action row
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: R.lg,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  copyBtnText: {
    fontSize: T.sm,
    fontWeight: '600',
    color: C.textSec,
  },
  browseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: R.lg,
    backgroundColor: C.accent,
  },
  browseBtnFull: {
    // when there's no copy code button, browseBtn already has flex:1 so it fills naturally
  },
  browseBtnText: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.2,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HistoryScreen({ navigation }) {
  const { user, logout } = useAuth();

  // History stored as Map for O(1) per-item updates
  const [historyMap, setHistoryMap]     = useState(new Map());
  const [historyOrder, setHistoryOrder] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [sort, setSort]                 = useState('latest');
  const [saveFilter, setSaveFilter]     = useState('all');
  const [savingIds, setSavingIds]       = useState(new Set());

  // ── Offline support (new, additive) ───────────────────────────────────────
  // true only when we are currently showing cached data because the network
  // call failed (no internet). Cleared automatically the moment a server
  // fetch succeeds again — no manual toggling needed anywhere else.
  const [isOffline, setIsOffline] = useState(false);

  const searchRef  = useRef(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  // ── Load ───────────────────────────────────────────────────────────────────
  // Offline-first (same pattern as StarredScreen):
  //   1. Instantly show whatever is cached on disk — works with zero internet,
  //      even right after a fresh (already-logged-in) app launch.
  //   2. In the background, fetch the latest from the server.
  //   3. On success: replace the list with fresh data + re-sync the cache.
  //   4. On failure (offline): keep showing cached data, mark isOffline=true,
  //      and only show the old hard "Error" alert if there was no cache at all.
  const load = useCallback(async () => {
    let hadCache = false;

    // Step 1 — instant local cache read
    try {
      const cached = await storage.getAllByPrefix('history:');
      if (cached?.length) {
        const items = cached
          .map((entry) => { try { return JSON.parse(entry.value); } catch { return null; } })
          .filter(Boolean);
        if (items.length) {
          hadCache = true;
          setHistoryMap(new Map(items.map((m) => [m._id, m])));
          setHistoryOrder(items.map((m) => m._id));
          setLoading(false); // show cached content immediately, no spinner
        }
      }
    } catch {}

    // Step 2 — fetch fresh data from server
    try {
      const { data } = await getAccessHistory();
      const items = data.history || [];
      setHistoryMap(new Map(items.map((m) => [m._id, m])));
      setHistoryOrder(items.map((m) => m._id));
      setIsOffline(false);

      // Step 3 — sync to local cache (clear stale keys, write fresh ones)
      try {
        const existing = await storage.getAllByPrefix('history:');
        for (const entry of (existing || [])) {
          await storage.delete(entry.key);
        }
      } catch {}
      for (const m of items) {
        try { await storage.set(`history:${m._id}`, JSON.stringify(m)); } catch {}
      }
    } catch {
      // Server unreachable — if we already showed cached data, fail silently
      // (this is the expected "no internet, already logged in" case).
      if (hadCache) {
        setIsOffline(true);
      } else {
        Alert.alert('Error', 'Failed to load access history.');
      }
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  // ── Search toggle ──────────────────────────────────────────────────────────
  const toggleSearch = useCallback(() => {
    if (searchVisible) {
      setSearchQuery('');
      Animated.timing(searchAnim, { toValue: 0, duration: 180, useNativeDriver: false })
        .start(() => setSearchVisible(false));
    } else {
      setSearchVisible(true);
      Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false })
        .start(() => searchRef.current?.focus());
    }
  }, [searchVisible, searchAnim]);

  // ── Open material ──────────────────────────────────────────────────────────
  const handleOpen = useCallback(async (material) => {
    try {
      const { data } = await getMaterialFiles(material._id);
      const parentNav = navigation.getParent() || navigation;
      parentNav.navigate('MaterialAccess', {
        material: { ...material, ...data.material, files: data.files, subFolders: data.subFolders },
      });
    } catch (e) {
      Alert.alert('Access denied', e.response?.data?.message || 'Could not open this material.');
    }
  }, [navigation]);

  // ── Save material (optimistic, single-item update) ─────────────────────────
  const handleSave = useCallback(async (materialId) => {
    setSavingIds((prev) => new Set(prev).add(materialId));
    try {
      await saveMaterial(materialId);
      setHistoryMap((prev) => {
        const next = new Map(prev);
        const item = next.get(materialId);
        if (item) {
          const updated = { ...item, isSaved: true };
          next.set(materialId, updated);
          // Keep offline cache in sync so "Saved" survives app restarts offline
          storage.set(`history:${materialId}`, JSON.stringify(updated)).catch(() => {});
        }
        return next;
      });
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not save material. Please try again.');
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(materialId);
        return next;
      });
    }
  }, []);

  // ── Derived list (search + save filter + sort) ─────────────────────────────
  const history = useMemo(
    () => historyOrder.map((id) => historyMap.get(id)).filter(Boolean),
    [historyMap, historyOrder],
  );

  const filtered = useMemo(() => {
    let list = history;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) => m.subjectName?.toLowerCase().includes(q));
    }
    if (saveFilter === 'saved')   list = list.filter((m) => m.isSaved === true);
    if (saveFilter === 'unsaved') list = list.filter((m) => m.isSaved !== true);
    if (sort === 'latest') return [...list].sort((a, b) => new Date(b.accessedAt || b.createdAt) - new Date(a.accessedAt || a.createdAt));
    if (sort === 'oldest') return [...list].sort((a, b) => new Date(a.accessedAt || a.createdAt) - new Date(b.accessedAt || b.createdAt));
    if (sort === 'name')   return [...list].sort((a, b) => (a.subjectName || '').localeCompare(b.subjectName || ''));
    return list;
  }, [history, searchQuery, saveFilter, sort]);

  // ── Render item ────────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => (
    <MaterialCard
      material={item}
      onPress={handleOpen}
      onSave={handleSave}
      saving={savingIds.has(item._id)}
    />
  ), [handleOpen, handleSave, savingIds]);

  const keyExtractor = useCallback((item) => item._id, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.center} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={C.textSec} />
          </TouchableOpacity>

          <View style={s.headerMid}>
            <View style={s.headerIconBox}>
              <Ionicons name="time" size={16} color={C.accent} />
            </View>
            <View>
              <Text style={s.headerTitle}>Access History</Text>
              <Text style={s.headerSub}>{history.length} material{history.length !== 1 ? 's' : ''} viewed</Text>
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
              placeholder="Search history…"
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

        {/* ── Combined toolbar: sort + divider + save-filter + count ── */}
        <View style={s.toolbarWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.toolbarScroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Sort pills */}
            {SORTS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[s.pill, sort === opt.key && s.pillActive]}
                onPress={() => setSort(opt.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={opt.icon} size={12} color={sort === opt.key ? C.white : C.textMuted} />
                <Text style={[s.pillText, sort === opt.key && s.pillTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Divider */}
            <View style={s.toolbarDivider} />

            {/* Save-filter pills */}
            {SAVE_FILTERS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[s.pill, saveFilter === opt.key && s.pillActive]}
                onPress={() => setSaveFilter(opt.key)}
                activeOpacity={0.8}
              >
                {opt.key !== 'all' && (
                  <Ionicons
                    name={opt.key === 'saved' ? 'bookmark' : 'bookmark-outline'}
                    size={11}
                    color={saveFilter === opt.key ? C.white : C.textMuted}
                  />
                )}
                <Text style={[s.pillText, saveFilter === opt.key && s.pillTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Count badge — inside scroll so it's always reachable */}
            <View style={s.countWrap}>
              <Text style={s.countBadge}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</Text>
            </View>
          </ScrollView>
        </View>

        {/* ── List ── */}
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
          }
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>🕒</Text>
              <Text style={s.emptyTitle}>
                {searchQuery || saveFilter !== 'all' ? 'No results found' : 'No history yet'}
              </Text>
              <Text style={s.emptyDesc}>
                {searchQuery
                  ? `No history matches "${searchQuery}".`
                  : saveFilter !== 'all'
                  ? 'No materials match this filter.'
                  : 'Materials you access using a code will appear here automatically.'}
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
  headerMid:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox: {
    width: 34, height: 34, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  headerSub:   { fontSize: T.xs, color: C.textMuted, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Offline indicator (new, additive)
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

  // Combined toolbar
  toolbarWrap: {
    borderBottomWidth: 1,
    borderBottomColor: C.borderSub,
  },
  toolbarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 6,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 11,
    borderRadius: R.full, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  pillActive:     { backgroundColor: C.elevated, borderColor: C.accent + '60' },
  pillText:       { fontSize: T.xs, color: C.textMuted, fontWeight: '500' },
  pillTextActive: { color: C.textPrimary, fontWeight: '700' },
  toolbarDivider: {
    width: 1, height: 18,
    backgroundColor: C.border,
    marginHorizontal: 4,
  },
  countWrap: {
    marginLeft: 6,
    paddingLeft: 6,
  },
  countBadge: { fontSize: T.xs, color: C.textMuted, fontWeight: '500' },

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
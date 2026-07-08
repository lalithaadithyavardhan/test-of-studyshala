/**
 * screens/SavedMaterialsScreen.jsx
 * ===================================
 * Materials the student saved for later (EnterCodeScreen / MaterialAccessScreen).
 *
 * Look & feel inspired by a colleague's version of this screen (warm dark
 * theme, subject-colored icons, file-card layout, search + sort) — but all
 * offline/download/sync logic below is our own, unchanged:
 *   - storage cache under the `saved:` prefix (src/database/db.js)
 *   - auto-download of every file the moment a material is saved/opened
 *     (src/utils/materialSync.js) — no manual "save" button anywhere
 *   - real on-disk verification via isMaterialFullyOffline(), not a
 *     server-side flag that could lie about what's actually downloaded
 *   - focus-based reload + smart auto-retry that only retries genuine
 *     connectivity failures, never a rejected/wrong-account request
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Animated,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SidebarDrawer from '../components/SidebarDrawer';
import { useAuth } from '../context/AuthContext';
import { getSavedMaterials, removeSavedMaterial } from '../api/studentApi';
import { storage } from '../database/db';
import { syncMaterialOffline, isMaterialFullyOffline } from '../utils/materialSync';

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
  success:      '#4CAF50',
  warning:      '#f2b84b',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, xxl: 20, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18 };

// ─── Subject icon map ─────────────────────────────────────────────────────────
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

// ─── Error classification (unchanged from our working version) ───────────────
const describeError = (e) => {
  if (!e?.response && e?.message === 'Network Error') return 'No internet connection';
  if (e?.code === 'ECONNABORTED') return 'Server is taking too long to respond (it may be waking up — try again in a moment)';
  if (e?.response?.status === 401) return 'Your session may have expired — please log out and log back in';
  if (e?.response?.status === 403) return "This account isn't recognized as a student account — please log out and log back in";
  if (e?.response?.status >= 500) return 'Server error — try again shortly';
  if (e?.response) return `Request failed (${e.response.status})`;
  return 'Could not reach the server';
};

const isRetryable = (e) => {
  if (!e?.response && e?.message === 'Network Error') return true;
  if (e?.code === 'ECONNABORTED') return true;
  if (e?.response?.status >= 500) return true;
  return false;
};

// ─── Material Card (presentation only — all data/actions come from parent) ──
function MaterialCard({ material, onPress, onRemove, verified, syncing }) {
  const subStyle = getSubjectStyle(material.subjectName);

  const meta = [
    material.facultyName && { icon: 'person-outline', label: 'Faculty', value: material.facultyName },
    material.department && { icon: 'business-outline', label: 'Dept', value: material.department },
    material.accessCode && { icon: 'key-outline', label: 'Code', value: material.accessCode },
  ].filter(Boolean);

  return (
    <View style={card.root}>
      <View style={card.top}>
        <View style={[card.iconBox, { backgroundColor: subStyle.bg }]}>
          <Ionicons name={subStyle.icon} size={20} color={subStyle.color} />
        </View>

        <View style={card.titleBlock}>
          <View style={card.titleRow}>
            <Text style={card.subjectName} numberOfLines={1}>{material.subjectName || 'Untitled'}</Text>
            {syncing ? (
              <View style={card.syncingBadge}>
                <ActivityIndicator size={9} color={C.accent} />
                <Text style={card.syncingText}>Saving…</Text>
              </View>
            ) : verified === true ? (
              <View style={card.verifiedBadge}>
                <View style={card.verifiedDot} />
                <Text style={card.verifiedText}>Available offline</Text>
              </View>
            ) : verified === false ? (
              <View style={card.unverifiedBadge}>
                <Ionicons name="time-outline" size={11} color={C.textMuted} />
                <Text style={card.unverifiedText}>Not saved yet</Text>
              </View>
            ) : null}
          </View>
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

      <TouchableOpacity style={card.browseBtn} onPress={() => onPress(material)} activeOpacity={0.82}>
        <Ionicons name="folder-open-outline" size={14} color={C.white} />
        <Text style={card.browseBtnText}>Browse files</Text>
      </TouchableOpacity>
    </View>
  );
}

const card = StyleSheet.create({
  root: { backgroundColor: C.surface, borderRadius: R.xl, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 10, gap: 10 },
  iconBox: { width: 44, height: 44, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  titleBlock: { flex: 1, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  syncingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, borderRadius: R.full, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  syncingText: { fontSize: 9, fontWeight: '700', color: C.accent },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(76,175,80,0.14)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.30)', borderRadius: R.full, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  verifiedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
  verifiedText: { fontSize: 9, fontWeight: '700', color: C.success },
  unverifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, borderRadius: R.full, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  unverifiedText: { fontSize: 9, fontWeight: '600', color: C.textMuted },
  subjectName: { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  semPill: { alignSelf: 'flex-start', backgroundColor: C.elevated, borderRadius: R.full, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 2 },
  semPillText: { fontSize: 10, fontWeight: '600', color: C.textSec },
  removeBtn: { width: 30, height: 30, borderRadius: R.xs, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaLabel: { fontSize: 11, color: C.textMuted },
  metaValue: { fontSize: 11, fontWeight: '700', color: C.textSec },
  browseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 12, marginBottom: 12, paddingVertical: 10, borderRadius: R.lg, backgroundColor: C.accent },
  browseBtnText: { fontSize: T.sm, fontWeight: '700', color: C.white, letterSpacing: 0.2 },
});

// ─── Sort config ──────────────────────────────────────────────────────────────
const SORTS = [
  { key: 'latest', label: 'Latest first', icon: 'time-outline' },
  { key: 'oldest', label: 'Oldest first', icon: 'hourglass-outline' },
  { key: 'name',   label: 'Name A–Z',     icon: 'text-outline' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SavedMaterialsScreen({ navigation }) {
  const { user, logout } = useAuth();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [sort, setSort] = useState('latest');

  const [offlineOnly, setOfflineOnly] = useState(false);
  const [offlineReason, setOfflineReason] = useState('');
  const [canAutoRetry, setCanAutoRetry] = useState(false);
  const retryTimerRef = useRef(null);

  const [syncStatus, setSyncStatus] = useState({});   // materialId -> 'syncing' | 'complete' | 'idle'
  const [verifiedMap, setVerifiedMap] = useState({}); // materialId -> true/false

  const searchRef = useRef(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  // Auto-download every file for every saved material, in the background.
  // Already-saved files are skipped inside syncMaterialOffline, so this is
  // cheap to re-run any time this screen opens — it just picks up anything
  // new or previously interrupted. No manual "save" button anywhere.
  const autoSyncAll = useCallback(async (list) => {
    for (const m of list) {
      const already = await isMaterialFullyOffline(m._id);
      if (already) {
        setSyncStatus((prev) => ({ ...prev, [m._id]: 'complete' }));
        setVerifiedMap((prev) => ({ ...prev, [m._id]: true }));
        continue;
      }
      setSyncStatus((prev) => ({ ...prev, [m._id]: 'syncing' }));
      setVerifiedMap((prev) => ({ ...prev, [m._id]: false }));
      syncMaterialOffline(m).then(async (res) => {
        const nowComplete = res.success && (await isMaterialFullyOffline(m._id));
        setSyncStatus((prev) => ({ ...prev, [m._id]: nowComplete ? 'complete' : 'idle' }));
        setVerifiedMap((prev) => ({ ...prev, [m._id]: nowComplete }));
      });
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const cached = await storage.getAllByPrefix('saved:');
      if (cached?.length) {
        setMaterials(cached);
        autoSyncAll(cached);
      }
    } catch {}

    try {
      const { data } = await getSavedMaterials();
      const list = data.materials || [];
      setMaterials(list);
      setOfflineOnly(false);
      setCanAutoRetry(false);
      autoSyncAll(list);

      try { await storage.deleteAllByPrefix('saved:'); } catch {}
      for (const m of list) {
        try { await storage.set(`saved:${m._id}`, m); } catch {}
      }
    } catch (e) {
      console.log('[SavedMaterials] getSavedMaterials failed:', {
        message: e?.message, code: e?.code, status: e?.response?.status,
        responseData: e?.response?.data, url: e?.config?.url, baseURL: e?.config?.baseURL,
      });
      setOfflineOnly(true);
      setOfflineReason(describeError(e));
      setCanAutoRetry(isRetryable(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [autoSyncAll]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      };
    }, [load])
  );

  useEffect(() => {
    if (offlineOnly && canAutoRetry) {
      retryTimerRef.current = setTimeout(() => load(), 15000);
    }
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [offlineOnly, canAutoRetry, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const toggleSearch = () => {
    if (searchVisible) {
      setSearchQuery('');
      Animated.timing(searchAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => setSearchVisible(false));
    } else {
      setSearchVisible(true);
      Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start(() => searchRef.current?.focus());
    }
  };

  const handleRemove = (material) => {
    Alert.alert('Remove saved material?', material.subjectName, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setMaterials((prev) => prev.filter((m) => m._id !== material._id));
          storage.delete(`saved:${material._id}`).catch(() => {});
          removeSavedMaterial(material._id).catch(() => {});
        },
      },
    ]);
  };

  const filtered = useMemo(() => {
    let list = materials;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) => m.subjectName?.toLowerCase().includes(q));
    }
    if (sort === 'latest') return [...list].sort((a, b) => new Date(b.savedAt || b.createdAt || 0) - new Date(a.savedAt || a.createdAt || 0));
    if (sort === 'oldest') return [...list].sort((a, b) => new Date(a.savedAt || a.createdAt || 0) - new Date(b.savedAt || b.createdAt || 0));
    if (sort === 'name') return [...list].sort((a, b) => (a.subjectName || '').localeCompare(b.subjectName || ''));
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

        {offlineOnly && (
          <View style={s.offlineBanner}>
            <Ionicons
              name={canAutoRetry ? 'cloud-offline-outline' : 'alert-circle-outline'}
              size={14}
              color={C.warning}
            />
            <Text style={s.offlineText}>
              {offlineReason || 'Offline'} — showing your last saved list.
              {canAutoRetry ? ' Retrying automatically…' : ''}
            </Text>
          </View>
        )}

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
              <Text style={[s.sortPillText, sort === opt.key && s.sortPillTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
          <Text style={s.countBadge}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</Text>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MaterialCard
              material={item}
              onPress={(m) => navigation.navigate('MaterialAccess', { material: m })}
              onRemove={handleRemove}
              verified={verifiedMap[item._id]}
              syncing={syncStatus[item._id] === 'syncing'}
            />
          )}
          ListEmptyComponent={
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>🔖</Text>
              <Text style={s.emptyTitle}>{searchQuery ? 'No results found' : 'Nothing saved yet'}</Text>
              <Text style={s.emptyDesc}>
                {searchQuery
                  ? `No saved materials match "${searchQuery}".`
                  : 'Materials you save for later will show up here, and their files download automatically.'}
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
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

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
  headerSub: { fontSize: T.xs, color: C.textMuted, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(242,184,75,0.1)', marginHorizontal: 14, marginTop: 12,
    padding: 10, borderRadius: R.sm, borderWidth: 1, borderColor: 'rgba(242,184,75,0.25)',
  },
  offlineText: { color: C.warning, fontSize: T.xs, fontWeight: '600', flex: 1 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: T.base, color: C.textPrimary, padding: 0 },

  sortRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    gap: 6, paddingHorizontal: 6, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderSub,
  },
  sortLabel: { fontSize: T.xs, color: C.textMuted, fontWeight: '500', marginRight: 2 },
  sortPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 11,
    borderRadius: R.full, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },
  sortPillActive: { backgroundColor: C.elevated, borderColor: C.accent },
  sortPillText: { fontSize: T.xs, color: C.textMuted, fontWeight: '500' },
  sortPillTextActive: { color: C.textPrimary, fontWeight: '700' },
  countBadge: { marginLeft: 'auto', fontSize: T.xs, color: C.textMuted, fontWeight: '500' },

  listContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 40, flexGrow: 1 },

  emptyCard: {
    backgroundColor: C.surface, borderRadius: R.xl, paddingVertical: 40,
    alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 20,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyDesc: { fontSize: T.base, color: C.textMuted, textAlign: 'center', paddingHorizontal: 28, lineHeight: 20 },
});
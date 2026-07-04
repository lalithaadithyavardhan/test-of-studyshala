/**
 * screens/StarredScreen.jsx — StudyShala
 * Warm dark theme matching StudentDashboard
 *   bg #13120f · surface #1e1c19 · accent #DE7356
 *
 * Features:
 *  - Back button  (goBack)
 *  - Sidebar open button
 *  - Search bar  (filters by fileName + subjectName client-side)
 *  - Combined single toolbar: Sort pills + divider + File-type filter + count
 *  - Inline FileCard — fully on-theme, no purple/teal leakage from FileListItem
 *  - Unstar with optimistic removal
 *  - Open file via existing openFile utility
 *  - Offline-first: cache loaded instantly, server fetched in background
 *  - Graceful degradation: distinct loading / offline / empty / error states
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  Alert, RefreshControl, TouchableOpacity, TextInput,
  Animated, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SidebarDrawer from '../components/SidebarDrawer';
import { getStarredFiles, unstarFile } from '../api/studentApi';
import { openFile } from '../utils/fileActions';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
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
  danger:       '#f87171',
  warning:      '#fbbf24',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18 };

// ─── Sort config ──────────────────────────────────────────────────────────────
const SORTS = [
  { key: 'latest', label: 'Latest first', icon: 'time-outline'       },
  { key: 'oldest', label: 'Oldest first', icon: 'hourglass-outline'  },
  { key: 'name',   label: 'Name A–Z',    icon: 'text-outline'       },
];

// ─── File-type filter config ──────────────────────────────────────────────────
const TYPE_FILTERS = [
  { key: 'all',   label: 'All',   icon: 'apps-outline'                   },
  { key: 'pdf',   label: 'PDF',   icon: 'document-text-outline'          },
  { key: 'video', label: 'Video', icon: 'videocam-outline'              },
  { key: 'image', label: 'Image', icon: 'image-outline'                 },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline'  },
];

// ─── File type helpers ────────────────────────────────────────────────────────
function getFileType(mimeType = '') {
  const m = mimeType.toLowerCase();
  if (m.includes('pdf'))                                                      return 'pdf';
  if (m.startsWith('video/') || m.includes('mp4') || m.includes('mkv') || m.includes('webm')) return 'video';
  if (m.startsWith('image/'))                                                 return 'image';
  return 'other';
}

const FILE_ICON = {
  pdf:   { icon: 'document-text', bg: 'rgba(222,115,86,0.14)',  color: '#DE7356' },
  video: { icon: 'videocam',      bg: 'rgba(177,173,161,0.12)', color: '#b1ada1' },
  image: { icon: 'image',         bg: 'rgba(177,173,161,0.10)', color: '#9a9690' },
  other: { icon: 'document',      bg: 'rgba(177,173,161,0.08)', color: '#6b6760' },
};

function fileIconStyle(mimeType) {
  return FILE_ICON[getFileType(mimeType)] || FILE_ICON.other;
}

function formatStarredAt(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const diffMs   = Date.now() - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)  return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7)  return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── FileCard ─────────────────────────────────────────────────────────────────
const FileCard = React.memo(function FileCard({ item, onOpen, onUnstar, unstarring, opening }) {
  const ico       = fileIconStyle(item.mimeType);
  const fileType  = getFileType(item.mimeType).toUpperCase();
  const starredLabel = formatStarredAt(item.starredAt);

  return (
    <View style={fc.root}>
      {/* ── Top row: icon · name · star btn ── */}
      <View style={fc.top}>
        {/* File type icon */}
        <View style={[fc.iconBox, { backgroundColor: ico.bg }]}>
          <Ionicons name={ico.icon} size={20} color={ico.color} />
        </View>

        {/* File name + meta */}
        <View style={fc.nameBlock}>
          <Text style={fc.fileName} numberOfLines={2}>{item.fileName || 'Untitled file'}</Text>
          <View style={fc.tagRow}>
            {/* File type pill */}
            <View style={fc.typePill}>
              <Text style={fc.typePillText}>{fileType}</Text>
            </View>
            {/* Subject name */}
            {!!item.subjectName && (
              <View style={fc.subjectPill}>
                <Ionicons name="book-outline" size={10} color={C.textMuted} />
                <Text style={fc.subjectText} numberOfLines={1}>{item.subjectName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Unstar button */}
        <TouchableOpacity
          style={[fc.starBtn, unstarring && fc.starBtnDisabled]}
          onPress={() => !unstarring && onUnstar(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={unstarring}
          activeOpacity={0.75}
        >
          {unstarring
            ? <ActivityIndicator size={13} color={C.accent} />
            : <Ionicons name="star" size={15} color={C.accent} />
          }
        </TouchableOpacity>
      </View>

      {/* ── Meta row ── */}
      <View style={fc.metaRow}>
        {!!starredLabel && (
          <View style={fc.metaItem}>
            <Ionicons name="star-outline" size={11} color={C.textMuted} />
            <Text style={fc.metaLabel}>Starred </Text>
            <Text style={fc.metaValue}>{starredLabel}</Text>
          </View>
        )}
        {!!item.materialId && (
          <View style={fc.metaItem}>
            <Ionicons name="folder-outline" size={11} color={C.textMuted} />
            <Text style={fc.metaLabel}>Material </Text>
            <Text style={fc.metaValue} numberOfLines={1}>{item.subjectName || item.materialId}</Text>
          </View>
        )}
      </View>

      {/* ── Open file button ── */}
      <TouchableOpacity
        style={[fc.openBtn, opening && fc.openBtnLoading]}
        onPress={() => !opening && onOpen(item)}
        activeOpacity={0.82}
        disabled={opening}
      >
        {opening
          ? <ActivityIndicator size={14} color={C.white} />
          : <Ionicons name="open-outline" size={14} color={C.white} />
        }
        <Text style={fc.openBtnText}>{opening ? 'Loading…' : 'Open file'}</Text>
      </TouchableOpacity>
    </View>
  );
});

const fc = StyleSheet.create({
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
    alignItems: 'flex-start',
    padding: 12,
    paddingBottom: 8,
    gap: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  nameBlock: {
    flex: 1,
    gap: 6,
  },
  fileName: {
    fontSize: T.md,
    fontWeight: '700',
    color: C.textPrimary,
    lineHeight: 19,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: R.xs,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.5,
  },
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: R.xs,
    backgroundColor: C.accentBg,
    borderWidth: 1,
    borderColor: C.accentBorder,
    maxWidth: 160,
  },
  subjectText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.accent,
  },

  // Star button
  starBtn: {
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
  starBtnDisabled: {
    opacity: 0.55,
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
    maxWidth: 180,
  },

  // Open button
  openBtn: {
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
  openBtnLoading: {
    opacity: 0.75,
  },
  openBtnText: {
    fontSize: T.sm,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.2,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function StarredScreen() {
  const navigation                      = useNavigation();
  const { user, logout }               = useAuth();

  const [starredFiles,  setStarredFiles]  = useState([]);
  const [loading,      setLoading]        = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [sidebarOpen,  setSidebarOpen]    = useState(false);
  const [searchQuery,  setSearchQuery]    = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [sort,         setSort]           = useState('latest');
  const [typeFilter,   setTypeFilter]     = useState('all');
  const [unstarringIds, setUnstarringIds] = useState(new Set());
  const [openingId,    setOpeningId]      = useState(null);

  // ── Distinct loading / error / offline states ────────────────────────────
  // 'loading'  — initial fetch in progress, no cache shown yet
  // 'success'  — data available (from cache, server, or both)
  // 'offline'  — no network AND cache was empty → honest message
  // 'error'    — server failed (with or without cache) → retry option
  const [fetchState, setFetchState] = useState('loading');
  // 'offline' = true means we showed the user an offline message already
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);

  const searchRef  = useRef(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  // ── Auth guard: redirect if not logged in ────────────────────────────────
  useEffect(() => {
    if (!user) {
      logout();
    }
  }, [user, logout]);

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (!isRefresh) setLoading(true);

    let cachedData = [];
    let hasCache = false;
    let serverFailed = false;

    // Step 1 — load from local cache instantly (never shows spinner to user)
    try {
      const cached = await storage.getAllByPrefix('starred:');
      if (cached?.length) {
        cachedData = cached.filter(Boolean);
        hasCache = true;
        setStarredFiles(cachedData);
      }
    } catch (err) {
      // Cache read failed — proceed to server fetch, don't crash
    }

    // Step 2 — fetch from server in background
    try {
      const { data } = await getStarredFiles();

      // Handle 401: expired or invalid token
      if (data?.status === 401 || data?.message?.toLowerCase?.().includes('unauthorized')) {
        logout();
        return;
      }

      const serverFiles = data?.starredFiles || [];
      setStarredFiles(serverFiles);

      // Step 3 — sync to local cache
      try {
        await storage.deleteAllByPrefix('starred:');
      } catch {}
      for (const f of serverFiles) {
        await storage.set(`starred:${f.fileId}`, f);
      }

      // Server succeeded — we're good
      setFetchState('success');
      setOfflineBannerDismissed(false);
    } catch (err) {
      serverFailed = true;

      // Handle 401 at the network level too
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        logout();
        return;
      }

      if (hasCache) {
        // We have cached data — background refresh failed, stay silent
        // (user can still see and use their cached files)
        setFetchState('success');
      } else {
        // No cache and server failed — show honest offline / error message
        setFetchState('offline');
      }
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ isRefresh: true });
    setRefreshing(false);
  }, [load]);

  // ── Search toggle ────────────────────────────────────────────────────────
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

  // ── Unstar (optimistic removal) ───────────────────────────────────────────
  const handleUnstar = useCallback(async (file) => {
    const id = file.fileId || file._id;
    setUnstarringIds((prev) => new Set(prev).add(id));
    try {
      const res = await unstarFile(id);

      // Handle 401
      if (res?.status === 401 || res?.data?.status === 401 || res?.data?.message?.toLowerCase?.().includes('unauthorized')) {
        logout();
        return;
      }

      setStarredFiles((prev) => prev.filter((f) => (f.fileId || f._id) !== id));
      await storage.delete(`starred:${id}`);
    } catch (err) {
      // Handle 401 at network level
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        logout();
        return;
      }
      Alert.alert('Error', 'Failed to unstar file. Please try again.');
    } finally {
      setUnstarringIds((prev) => {
        const next = new Set(prev); next.delete(id); return next;
      });
    }
  }, [logout]);

  // ── Open file ─────────────────────────────────────────────────────────────
  // Starring is just a bookmark now — it carries no offline guarantee of its
  // own. Whether this opens without internet depends entirely on whether the
  // file's material was saved, and that check lives in one place:
  // fileActions.openFile(). This screen doesn't duplicate that logic anymore.
  const handleOpen = useCallback(async (file) => {
    console.log('OPEN FILE:', JSON.stringify(file, null, 2));   // ← add this line
    const fileId = file.fileId || file._id;
    setOpeningId(fileId);
    await openFile(
      {
        _id:         fileId,
        fileId:      fileId,
        name:        file.fileName || file.name,
        fileName:    file.fileName || file.name,
        mimeType:    file.mimeType,
        previewUrl:  file.previewUrl  || null,
        downloadUrl: file.downloadUrl || null,
        materialId:  file.materialId,
        subjectName: file.subjectName,
      },
      { _id: file.materialId, subjectName: file.subjectName },
      navigation,
      logout,
    );

    setOpeningId(null);
  }, [navigation, logout]);

  // ── Derived list (search + type filter + sort) ─────────────────────────────
  const filtered = useMemo(() => {
    let list = starredFiles;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) => f.fileName?.toLowerCase().includes(q) || f.subjectName?.toLowerCase().includes(q),
      );
    }

    if (typeFilter !== 'all') {
      list = list.filter((f) => getFileType(f.mimeType) === typeFilter);
    }

    if (sort === 'latest') return [...list].sort((a, b) => new Date(b.starredAt || b.createdAt) - new Date(a.starredAt || a.createdAt));
    if (sort === 'oldest') return [...list].sort((a, b) => new Date(a.starredAt || a.createdAt) - new Date(b.starredAt || b.createdAt));
    if (sort === 'name')  return [...list].sort((a, b) => (a.fileName || '').localeCompare(b.fileName || ''));
    return list;
  }, [starredFiles, searchQuery, typeFilter, sort]);

  // ── Render item ────────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => (
    <FileCard
      item={item}
      onOpen={handleOpen}
      onUnstar={handleUnstar}
      unstarring={unstarringIds.has(item.fileId || item._id)}
      opening={openingId === (item.fileId || item._id)}
    />
  ), [handleOpen, handleUnstar, unstarringIds, openingId]);

  const keyExtractor = useCallback((item) => item.fileId || item._id, []);

  // ── Distinct state rendering ──────────────────────────────────────────────

  if (loading && fetchState === 'loading') {
    return (
      <SafeAreaView style={s.center} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  // ── Offline / error banner ────────────────────────────────────────────────
  const showBanner = fetchState === 'offline' && !offlineBannerDismissed;

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* ── Offline / error banner ── */}
        {showBanner && (
          <TouchableOpacity
            style={s.banner}
            onPress={() => load()}
            activeOpacity={0.85}
          >
            <Ionicons name="cloud-offline-outline" size={16} color={C.warning} />
            <Text style={s.bannerText}>
              You're offline — showing cached files
            </Text>
            <Text style={s.bannerRetry}>Tap to retry</Text>
          </TouchableOpacity>
        )}

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={C.textSec} />
          </TouchableOpacity>

          <View style={s.headerMid}>
            <View style={s.headerIconBox}>
              <Ionicons name="star" size={16} color={C.accent} />
            </View>
            <View>
              <Text style={s.headerTitle}>Starred Files</Text>
              <Text style={s.headerSub}>{starredFiles.length} file{starredFiles.length !== 1 ? 's' : ''} starred</Text>
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

        {/* ── Search bar ── */}
        {searchVisible && (
          <Animated.View style={[s.searchWrap, { opacity: searchAnim }]}>
            <Ionicons name="search-outline" size={15} color={C.textMuted} />
            <TextInput
              ref={searchRef}
              style={s.searchInput}
              placeholder="Search starred files…"
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

        {/* ── Combined toolbar: sort pills | divider | type filter | count ── */}
        <View style={s.toolbarWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.toolbarScroll}
            keyboardShouldPersistTaps="handled"
          >
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

            <View style={s.toolbarDivider} />

            {TYPE_FILTERS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[s.pill, typeFilter === opt.key && s.pillActive]}
                onPress={() => setTypeFilter(opt.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={opt.icon}
                  size={12}
                  color={typeFilter === opt.key ? C.white : C.textMuted}
                />
                <Text style={[s.pillText, typeFilter === opt.key && s.pillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

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
              <Text style={s.emptyEmoji}>
                {fetchState === 'offline' ? '📡' : searchQuery || typeFilter !== 'all' ? '🔍' : '⭐'}
              </Text>
              <Text style={s.emptyTitle}>
                {fetchState === 'offline'
                  ? 'No internet connection'
                  : searchQuery || typeFilter !== 'all'
                  ? 'No results found'
                  : 'No starred files yet'}
              </Text>
              <Text style={s.emptyDesc}>
                {fetchState === 'offline'
                  ? 'Starred files will appear here once you\'re back online and the sync completes.'
                  : searchQuery
                  ? `No starred files match "${searchQuery}".`
                  : typeFilter !== 'all'
                  ? 'No starred files match this file type.'
                  : 'Tap the star on any file to save it here for quick access.'}
              </Text>
              {fetchState === 'offline' && (
                <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
                  <Ionicons name="refresh-outline" size={15} color={C.white} />
                  <Text style={s.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              )}
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

  // Offline banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251,191,36,0.10)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251,191,36,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: T.sm,
    color: C.warning,
    fontWeight: '500',
  },
  bannerRetry: {
    fontSize: T.xs,
    color: C.warning,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

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
  countWrap: { marginLeft: 6, paddingLeft: 6 },
  countBadge: { fontSize: T.xs, color: C.textMuted, fontWeight: '500' },

  // List
  listContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 40, flexGrow: 1 },

  // Empty / offline / error
  emptyCard: {
    backgroundColor: C.surface, borderRadius: R.xl, paddingVertical: 40,
    alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 20,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyDesc:  { fontSize: T.base, color: C.textMuted, textAlign: 'center', paddingHorizontal: 28, lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.accent, borderRadius: R.md,
    paddingHorizontal: 20, paddingVertical: 10,
    marginTop: 16,
  },
  retryBtnText: { fontSize: T.sm, fontWeight: '700', color: C.white },
});
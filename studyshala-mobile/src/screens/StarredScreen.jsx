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
import { getStarredFiles, unstarFile, getMaterialFiles } from '../api/studentApi';
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
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18 };

// ─── Sort config ──────────────────────────────────────────────────────────────
const SORTS = [
  { key: 'latest', label: 'Latest first', icon: 'time-outline'      },
  { key: 'oldest', label: 'Oldest first', icon: 'hourglass-outline'  },
  { key: 'name',   label: 'Name A–Z',     icon: 'text-outline'       },
];

// ─── File-type filter config ──────────────────────────────────────────────────
const TYPE_FILTERS = [
  { key: 'all',   label: 'All',   icon: 'apps-outline'          },
  { key: 'pdf',   label: 'PDF',   icon: 'document-text-outline' },
  { key: 'video', label: 'Video', icon: 'videocam-outline'      },
  { key: 'image', label: 'Image', icon: 'image-outline'         },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

// ─── File type helpers ────────────────────────────────────────────────────────
function getFileType(mimeType = '') {
  const m = mimeType.toLowerCase();
  if (m.includes('pdf'))                                         return 'pdf';
  if (m.startsWith('video/') || m.includes('mp4') || m.includes('mkv') || m.includes('webm')) return 'video';
  if (m.startsWith('image/'))                                    return 'image';
  return 'other';
}

const FILE_ICON = {
  pdf:   { icon: 'document-text',  bg: 'rgba(222,115,86,0.14)',  color: '#DE7356' },
  video: { icon: 'videocam',       bg: 'rgba(177,173,161,0.12)', color: '#b1ada1' },
  image: { icon: 'image',          bg: 'rgba(177,173,161,0.10)', color: '#9a9690' },
  other: { icon: 'document',       bg: 'rgba(177,173,161,0.08)', color: '#6b6760' },
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

        {/* Unstar button — solid star, tap to remove */}
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

  // Star button — same 30×30 slot as SavedScreen bookmark
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
  const { user, logout }                = useAuth();
  const [starredFiles, setStarredFiles] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [sort, setSort]                 = useState('latest');
  const [typeFilter, setTypeFilter]     = useState('all');
  const [unstarringIds, setUnstarringIds] = useState(new Set());
  const [openingId, setOpeningId]         = useState(null);

  const searchRef  = useRef(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    // Step 1 — load from local cache instantly
    try {
      const result = await storage.getAllByPrefix('starred:');
      if (result?.length) {
        const cached = result.map(entry => JSON.parse(entry.value));
        setStarredFiles(cached);
        setLoading(false); // show cached content immediately, no spinner
      }
    } catch {}

    // Step 2 — fetch from server in background
    try {
      const { data } = await getStarredFiles();
      const serverFiles = data.starredFiles || [];
      setStarredFiles(serverFiles);

      // Step 3 — sync to local cache
      // Clear stale keys first, then write fresh ones
      try {
        const existing = await storage.getAllByPrefix('starred:');
        for (const entry of (existing || [])) {
          await storage.delete(entry.key);
        }
      } catch {}
      for (const f of serverFiles) {
        await storage.set(`starred:${f.fileId}`, JSON.stringify(f));
      }
    } catch {
      // Server failed — cached data already showing, stay silent
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
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

  // ── Unstar (optimistic removal) ────────────────────────────────────────────
  const handleUnstar = useCallback(async (file) => {
    const id = file.fileId || file._id;
    setUnstarringIds((prev) => new Set(prev).add(id));
    try {
      await unstarFile(id);
      setStarredFiles((prev) => prev.filter((f) => (f.fileId || f._id) !== id));
      // Remove from local cache so it's gone offline too
      await storage.delete(`starred:${id}`);
    } catch {
      Alert.alert('Error', 'Failed to unstar file. Please try again.');
    } finally {
      setUnstarringIds((prev) => {
        const next = new Set(prev); next.delete(id); return next;
      });
    }
  }, []);

  // ── Open file ──────────────────────────────────────────────────────────────
  // The server's getStarredFiles API does not return downloadUrl / previewUrl.
  // Those URLs also expire after a few hours even when cached.
  // So before calling openFile(), we always fetch a fresh downloadUrl from
  // getMaterialFiles(). This is fast (~200ms) and guarantees the download works.
  // If internet is unavailable, we fall back to whatever is cached on disk
  // (fileRepository localPath) — openFile handles that automatically.
  const handleOpen = useCallback(async (file) => {
    const fileId     = file.fileId || file._id;
    const materialId = file.materialId;
    console.log("========== STARRED ==========");
    console.log("File ID:", file.fileId);
    console.log("Material ID:", materialId);
    console.log("File:", file);
    setOpeningId(fileId);

    let freshDownloadUrl = file.downloadUrl || null;
    let freshPreviewUrl  = file.previewUrl  || null;

    // Always try to get fresh URLs — cached ones may be expired or missing
    if (materialId) {
      try {
        const { data } = await getMaterialFiles(materialId);
        console.log("Material API Response:", data);
        const allFiles = [
          ...(data.files || []),
          ...(data.subFolders || []).flatMap(sf => sf.files || []),
        ];
        console.log("All Files:", allFiles);
        const fresh = allFiles.find(
          sf =>
               String(sf._id) === String(fileId) ||
               String(sf.fileId) === String(fileId) ||
               String(sf.id) === String(fileId)
        );

        console.log("Matched File:", fresh);
        if (fresh?.downloadUrl) freshDownloadUrl = fresh.downloadUrl;
        console.log("Download URL:", freshDownloadUrl);
        console.log("Preview URL:", freshPreviewUrl);
        if (fresh?.previewUrl)  freshPreviewUrl  = fresh.previewUrl;

        // Update local starred cache with fresh URLs so next open skips this step
        try {
          const existing = await storage.get(`starred:${fileId}`);
          const parsed = existing ? JSON.parse(existing) : {};
          await storage.set(`starred:${fileId}`, JSON.stringify({
            ...parsed,
            downloadUrl: freshDownloadUrl,
            previewUrl:  freshPreviewUrl,
          }));
        } catch {}
      } catch {
        // No internet — openFile will use localPath from fileRepository if cached
      }
    }

    setOpeningId(null);

    openFile(
      {
        _id:         fileId,
        fileId:      fileId,
        name:        file.fileName || file.name,
        fileName:    file.fileName || file.name,
        mimeType:    file.mimeType,
        previewUrl:  freshPreviewUrl,
        downloadUrl: freshDownloadUrl,
      },
      { _id: materialId, subjectName: file.subjectName },
      navigation,
    );
  }, [navigation]);

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
    if (sort === 'name')   return [...list].sort((a, b) => (a.fileName || '').localeCompare(b.fileName || ''));
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

            {/* File-type filter pills */}
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

            {/* Count badge */}
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
              <Text style={s.emptyEmoji}>⭐</Text>
              <Text style={s.emptyTitle}>
                {searchQuery || typeFilter !== 'all' ? 'No results found' : 'No starred files yet'}
              </Text>
              <Text style={s.emptyDesc}>
                {searchQuery
                  ? `No starred files match "${searchQuery}".`
                  : typeFilter !== 'all'
                  ? 'No starred files match this file type.'
                  : 'Tap the star on any file to save it here for quick access.'}
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

  // Empty
  emptyCard: {
    backgroundColor: C.surface, borderRadius: R.xl, paddingVertical: 40,
    alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 20,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyDesc:  { fontSize: T.base, color: C.textMuted, textAlign: 'center', paddingHorizontal: 28, lineHeight: 20 },
});
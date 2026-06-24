/**
 * screens/MaterialAccessScreen.jsx — StudyShala Dark Theme
 * Student file browsing screen — Premium Workspace UI + Search & Filter
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert,
  TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FileListItem from '../components/FileListItem';
import {
  getMaterialFiles, saveMaterial, starFile, unstarFile, getStarredFiles,
} from '../api/studentApi';
import { downloadFile } from '../utils/fileActions';
import { C, R, T } from '../components/theme';

// ── Filter chip definitions ─────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',    label: 'All',    icon: 'apps-outline' },
  { key: 'pdf',    label: 'PDFs',   icon: 'document-text-outline' },
  { key: 'ppt',    label: 'PPTs',   icon: 'easel-outline' },
  { key: 'notes',  label: 'Notes',  icon: 'reader-outline' },
  { key: 'video',  label: 'Videos', icon: 'videocam-outline' },
];

// Maps a file's mimeType / extension to a filter key
function getFileCategory(file) {
  const mime = (file.mimeType || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf'))                          return 'pdf';
  if (mime.includes('presentation') || name.endsWith('.ppt') ||
      name.endsWith('.pptx') || name.endsWith('.key'))                        return 'ppt';
  if (mime.includes('video') || ['mp4','mov','avi','mkv','webm'].some(e => name.endsWith('.' + e))) return 'video';
  // Treat docs / text / word as notes
  if (mime.includes('word') || mime.includes('text') || mime.includes('document') ||
      ['doc','docx','txt','md'].some(e => name.endsWith('.' + e)))            return 'notes';
  return 'other';
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function MaterialAccessScreen({ route, navigation }) {
  const { material: initialMaterial } = route.params;
  const [material,     setMaterial]    = useState(initialMaterial);
  const initialFiles = Array.isArray(initialMaterial.files) ? initialMaterial.files : [];
  const initialSubs  = Array.isArray(initialMaterial.subFolders) ? initialMaterial.subFolders : [];
  const [files,        setFiles]       = useState(initialFiles);
  const [subFolders,   setSubFolders]  = useState(initialSubs);
  const [activeFolder, setActiveFolder]= useState(null);
  const [loading,      setLoading]     = useState(true);
  const [starredIds,   setStarredIds]  = useState([]);
  const [saving,       setSaving]      = useState(false);

  // ── Search & filter state ──
  const [query,        setQuery]       = useState('');
  const [activeFilter, setActiveFilter]= useState('all');

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getMaterialFiles(initialMaterial._id);
      setMaterial({ ...initialMaterial, ...data.material });
      setFiles(data.files || []);
      setSubFolders(data.subFolders || []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load files.');
    } finally { setLoading(false); }
  }, [initialMaterial]);

  const loadStarred = useCallback(async () => {
    try {
      const { data } = await getStarredFiles();
      setStarredIds((data.starredFiles || []).map((s) => s.fileId));
    } catch (e) { /* non-critical */ }
  }, []);

  useEffect(() => {
    loadFiles();
    loadStarred();
  }, []);

  const currentFiles = Array.isArray(activeFolder?.files) ? activeFolder.files : files;

  // ── Derived: filtered + searched list ──────────────────────────────────────
  const q = query.trim().toLowerCase();

  // folders: match by name (search) only — filters don't apply to folders
  const filteredFolders = useMemo(() => {
    if (activeFolder) return [];
    const src = Array.isArray(subFolders) ? subFolders : [];
    if (!q) return src;
    return src.filter(sf => sf.name?.toLowerCase().includes(q));
  }, [subFolders, q, activeFolder]);

  // files: apply both search and filter chip
  const filteredFiles = useMemo(() => {
    const src = Array.isArray(currentFiles) ? currentFiles : [];
    return src.filter(file => {
      const matchesFilter = activeFilter === 'all' || getFileCategory(file) === activeFilter;
      const matchesQuery  = !q ||
        file.name?.toLowerCase().includes(q) ||
        material.facultyName?.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [currentFiles, activeFilter, q, material.facultyName]);

  // Combined list for the main FlatList
  const listData = useMemo(() => [
    ...filteredFolders.map(sf => ({ ...sf, __isFolder: true })),
    ...filteredFiles,
  ], [filteredFolders, filteredFiles]);

  const isFiltering = q.length > 0 || activeFilter !== 'all';

  const handleStarToggle = async (file) => {
    const isStarred = starredIds.includes(file._id);
    try {
      if (isStarred) {
        await unstarFile(file._id);
        setStarredIds((prev) => prev.filter((id) => id !== file._id));
      } else {
        await starFile({ fileId: file._id, fileName: file.name, mimeType: file.mimeType,
          materialId: material._id, subjectName: material.subjectName });
        setStarredIds((prev) => [...prev, file._id]);
      }
    } catch (e) { Alert.alert('Error', 'Failed to update star.'); }
  };

  const handleSaveMaterial = async () => {
    setSaving(true);
    try {
      const { data } = await saveMaterial(material._id);
      Alert.alert('Saved! 🔖', data.message || 'Material saved successfully');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save material.');
    } finally { setSaving(false); }
  };

  const handleFilePress    = (file) => navigation.navigate('FileViewer', { file, material });
  const handleFileLongPress = (file) => {
    Alert.alert(file.name, 'File options', [
      { text: 'Download', onPress: () => downloadFile(file) },
      { text: 'Cancel',   style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center} edges={['top']}>
        <View style={s.loadingCard}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loadingText}>Loading workspace…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalFiles   = files.length + subFolders.reduce((acc, sf) => acc + (sf.files?.length || 0), 0);
  const totalFolders = subFolders.length;

  // ── Sub-folder view ────────────────────────────────────────────────────────
  if (activeFolder) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        {/* Breadcrumb nav */}
        <View style={s.folderNavBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => {
            setActiveFolder(null);
            setQuery('');
            setActiveFilter('all');
          }}>
            <Ionicons name="arrow-back" size={18} color={C.textSec} />
          </TouchableOpacity>
          <View style={s.folderNavCrumb}>
            <Text style={s.folderNavParent} numberOfLines={1}>{material.subjectName}</Text>
            <View style={s.crumbDivider}>
              <Ionicons name="chevron-forward" size={12} color={C.textMuted} />
            </View>
            <Text style={s.folderNavCurrent} numberOfLines={1}>{activeFolder.name}</Text>
          </View>
        </View>

        {/* Search + filter in subfolder */}
        <SearchBar query={query} onChangeQuery={setQuery} />
        <FilterChips
          activeFilter={activeFilter}
          onSelect={(k) => setActiveFilter(k)}
        />

        <FlatList
          data={filteredFiles}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <FileListItem
              file={item}
              onPress={handleFilePress}
              onLongPress={handleFileLongPress}
              onStarPress={handleStarToggle}
              isStarred={starredIds.includes(item._id)}
              dark
            />
          )}
          ListHeaderComponent={
            <ResultsBar
              count={filteredFiles.length}
              isFiltering={isFiltering}
              onClear={() => { setQuery(''); setActiveFilter('all'); }}
            />
          }
          ListEmptyComponent={<EmptyState isFiltering={isFiltering} />}
        />
      </SafeAreaView>
    );
  }

  // ── Main workspace view ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <WorkspaceHeader
              material={material}
              totalFiles={totalFiles}
              totalFolders={totalFolders}
              saving={saving}
              onBack={() => navigation.goBack()}
              onSave={handleSaveMaterial}
            />
            <SearchBar query={query} onChangeQuery={setQuery} />
            <FilterChips
              activeFilter={activeFilter}
              onSelect={(k) => setActiveFilter(k)}
            />
            <ResultsBar
              count={listData.length}
              isFiltering={isFiltering}
              onClear={() => { setQuery(''); setActiveFilter('all'); }}
            />
          </>
        }
        renderItem={({ item }) =>
          item.__isFolder ? (
            <FolderCard
              item={item}
              onPress={() => {
                const safeFolder = { ...item, files: Array.isArray(item.files) ? item.files : [] };
                setActiveFolder(safeFolder);
                // reset search when entering folder
                setQuery('');
                setActiveFilter('all');
              }}
            />
          ) : (
            <FileListItem
              file={item}
              onPress={handleFilePress}
              onLongPress={handleFileLongPress}
              onStarPress={handleStarToggle}
              isStarred={starredIds.includes(item._id)}
              dark
            />
          )
        }
        ListEmptyComponent={<EmptyState isFiltering={isFiltering} />}
      />
    </SafeAreaView>
  );
}

// ── Search Bar ───────────────────────────────────────────────────────────────
function SearchBar({ query, onChangeQuery }) {
  return (
    <View style={s.searchWrapper}>
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={17} color={C.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search files, folders…"
          placeholderTextColor={C.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => onChangeQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={17} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Filter Chips ─────────────────────────────────────────────────────────────
function FilterChips({ activeFilter, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.filtersRow}
      style={s.filtersScroll}
    >
      {FILTERS.map((f) => {
        const active = f.key === activeFilter;
        return (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, active && s.filterChipActive]}
            onPress={() => onSelect(f.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={f.icon}
              size={13}
              color={active ? C.accent : C.textMuted}
            />
            <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Results count bar ────────────────────────────────────────────────────────
function ResultsBar({ count, isFiltering, onClear }) {
  if (!isFiltering) return (
    <View style={s.sectionLabel}>
      <Text style={s.sectionLabelText}>Materials</Text>
      <View style={s.sectionLabelLine} />
    </View>
  );
  return (
    <View style={s.resultsBar}>
      <Text style={s.resultsText}>
        {count === 0 ? 'No results' : `${count} result${count !== 1 ? 's' : ''}`}
      </Text>
      <TouchableOpacity onPress={onClear} style={s.clearBtn}>
        <Ionicons name="close-circle-outline" size={14} color={C.accent} />
        <Text style={s.clearBtnText}>Clear</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Workspace Hero Header ────────────────────────────────────────────────────
function WorkspaceHeader({ material, totalFiles, totalFolders, saving, onBack, onSave }) {
  return (
    <>
      <View style={s.heroCard}>
        <View style={s.heroTopRow}>
          <TouchableOpacity style={s.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={18} color={C.textSec} />
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={onSave} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={C.accent} />
              : <Ionicons name="bookmark-outline" size={18} color={C.accent} />
            }
          </TouchableOpacity>
        </View>

        <View style={s.subjectPill}>
          <View style={s.subjectPillDot} />
          <Text style={s.subjectPillLabel}>Subject Workspace</Text>
        </View>

        <Text style={s.heroTitle} numberOfLines={2}>{material.subjectName}</Text>

        <View style={s.heroMetaRow}>
          <HeroMeta icon="business-outline"  label={material.department} />
          <View style={s.heroDivider} />
          <HeroMeta icon="layers-outline"    label={`Sem ${material.semester}`} />
          <View style={s.heroDivider} />
          <HeroMeta icon="person-outline"    label={material.facultyName} />
        </View>

        <View style={s.heroStatsRow}>
          <HeroStat icon="document-text-outline" value={totalFiles}   label="Files"   accent />
          {totalFolders > 0 && (
            <HeroStat icon="folder-open-outline"  value={totalFolders} label="Folders" />
          )}
        </View>
      </View>

      {!!material.messageToStudents && (
        <View style={s.facultyCard}>
          <View style={s.facultyCardHeader}>
            <View style={s.facultyIconBox}>
              <Ionicons name="megaphone" size={15} color={C.accent} />
            </View>
            <Text style={s.facultyCardTitle}>Important Note from Faculty</Text>
          </View>
          <Text style={s.facultyCardText}>{material.messageToStudents}</Text>
        </View>
      )}
    </>
  );
}

function HeroMeta({ icon, label }) {
  return (
    <View style={s.heroMetaItem}>
      <Ionicons name={icon} size={12} color={C.textMuted} />
      <Text style={s.heroMetaText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function HeroStat({ icon, value, label, accent }) {
  return (
    <View style={[s.heroStatBox, accent && s.heroStatBoxAccent]}>
      <Ionicons name={icon} size={16} color={accent ? C.accent : C.textSec} />
      <Text style={[s.heroStatValue, accent && s.heroStatValueAccent]}>{value}</Text>
      <Text style={[s.heroStatLabel, accent && s.heroStatLabelAccent]}>{label}</Text>
    </View>
  );
}

function FolderCard({ item, onPress }) {
  const fileCount = item.fileCount || item.files?.length || 0;
  return (
    <TouchableOpacity style={s.folderCard} onPress={onPress} activeOpacity={0.75}>
      <View style={s.folderIconBox}>
        <Ionicons name="folder" size={26} color="#f59e0b" />
      </View>
      <View style={s.folderCardBody}>
        <Text style={s.folderName} numberOfLines={1}>{item.name}</Text>
        <View style={s.folderMetaRow}>
          <Ionicons name="document-outline" size={11} color={C.textMuted} />
          <Text style={s.folderMeta}>{fileCount} {fileCount === 1 ? 'file' : 'files'}</Text>
        </View>
      </View>
      <View style={s.folderChevron}>
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ isFiltering }) {
  return (
    <View style={s.emptyBox}>
      <View style={s.emptyIconRing}>
        <Ionicons
          name={isFiltering ? 'search-outline' : 'folder-open-outline'}
          size={36}
          color={C.accent}
        />
      </View>
      <Text style={s.emptyTitle}>
        {isFiltering ? 'No matches found' : 'Nothing here yet'}
      </Text>
      <Text style={s.emptyDesc}>
        {isFiltering
          ? 'Try a different search term or clear the active filter.'
          : "Your faculty hasn't uploaded any materials for this subject. Check back soon."}
      </Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  loadingCard: {
    alignItems: 'center', gap: 14,
    backgroundColor: C.surface,
    borderRadius: 20, padding: 32,
    borderWidth: 1, borderColor: C.border,
  },
  loadingText: { color: C.textSec, fontSize: T.base, fontWeight: '500' },

  // ── Search ──
  searchWrapper: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11,
    borderWidth: 1, borderColor: C.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1, fontSize: T.base, color: C.textPrimary,
    padding: 0, fontWeight: '500',
  },

  // ── Filter chips ──
  filtersScroll: { flexGrow: 0 },
  filtersRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 8,
    backgroundColor: C.surface,
    borderRadius: R.full,
    borderWidth: 1, borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.accentBg,
    borderColor: C.accent + '50',
  },
  filterChipText: {
    fontSize: T.sm, fontWeight: '600', color: C.textMuted,
  },
  filterChipTextActive: { color: C.accent },

  // ── Results bar ──
  resultsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 12,
  },
  resultsText: {
    fontSize: T.xs, fontWeight: '700',
    color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: C.accentBg,
    borderRadius: R.full,
    borderWidth: 1, borderColor: C.accent + '30',
  },
  clearBtnText: {
    fontSize: T.xs, fontWeight: '700', color: C.accent,
  },

  // ── Hero Card ──
  heroCard: {
    backgroundColor: C.surface,
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.accentBg,
    borderWidth: 1, borderColor: C.accent + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  subjectPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  subjectPillDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent,
  },
  subjectPillLabel: {
    fontSize: T.xs, fontWeight: '600', color: C.accent,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: T.base + 7, fontWeight: '800', color: C.textPrimary,
    lineHeight: 30, marginBottom: 14,
  },
  heroMetaRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    marginBottom: 18, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaText:  { fontSize: T.xs, color: C.textMuted, fontWeight: '500' },
  heroDivider:   { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.border },
  heroStatsRow:  { flexDirection: 'row', gap: 10 },
  heroStatBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.elevated, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border,
  },
  heroStatBoxAccent: { backgroundColor: C.accentBg, borderColor: C.accent + '30' },
  heroStatValue:       { fontSize: T.base + 2, fontWeight: '800', color: C.textSec },
  heroStatValueAccent: { color: C.accent },
  heroStatLabel:       { fontSize: T.xs, fontWeight: '500', color: C.textMuted },
  heroStatLabelAccent: { color: C.accent + 'cc' },

  // ── Faculty Message ──
  facultyCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
    borderLeftWidth: 3, borderLeftColor: C.accent,
  },
  facultyCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
  },
  facultyIconBox: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.accentBg, alignItems: 'center', justifyContent: 'center',
  },
  facultyCardTitle: { fontSize: T.sm, fontWeight: '700', color: C.accent, flex: 1 },
  facultyCardText:  { fontSize: T.base, color: C.textPrimary, lineHeight: 20, fontWeight: '400' },

  // ── Section label ──
  sectionLabel: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginHorizontal: 16, marginBottom: 12,
  },
  sectionLabelText: {
    fontSize: T.xs, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.9,
  },
  sectionLabelLine: { flex: 1, height: 1, backgroundColor: C.border },

  // ── Folder nav bar (subfolder view) ──
  folderNavBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  folderNavCrumb:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  folderNavParent:  { fontSize: T.sm, color: C.textMuted, fontWeight: '500', flexShrink: 1 },
  crumbDivider:     { paddingHorizontal: 2 },
  folderNavCurrent: { fontSize: T.sm, color: C.textPrimary, fontWeight: '700', flexShrink: 1 },

  // ── Folder Card ──
  folderCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 16,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  folderIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#f59e0b18',
    borderWidth: 1, borderColor: '#f59e0b30',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  folderCardBody: { flex: 1, gap: 5 },
  folderName:     { fontSize: T.base + 1, fontWeight: '700', color: C.textPrimary },
  folderMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  folderMeta:     { fontSize: T.xs, color: C.textMuted, fontWeight: '500' },
  folderChevron: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.elevated, alignItems: 'center', justifyContent: 'center',
  },

  // ── List ──
  listContent: { padding: 16, paddingBottom: 40 },

  // ── Empty State ──
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyIconRing: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: C.accentBg,
    borderWidth: 1, borderColor: C.accent + '25',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: T.base + 3, fontWeight: '800', color: C.textPrimary, marginBottom: 8,
  },
  emptyDesc: {
    fontSize: T.base, color: C.textMuted, textAlign: 'center', lineHeight: 20,
  },
});

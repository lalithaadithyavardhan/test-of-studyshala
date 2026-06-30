import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { fileRepository } from '../database/fileRepository';
import { materialRepository } from '../database/materialRepository';

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  bg:          '#13120f',
  surface:     '#1e1c19',
  elevated:    '#2a2724',
  border:      '#2e2c28',
  accent:      '#DE7356',
  accentBg:    'rgba(222,115,86,0.09)',
  accentBdr:   'rgba(222,115,86,0.25)',
  textPrimary: '#e8e4de',
  textSec:     '#b1ada1',
  textMuted:   '#6b6760',
  danger:      '#f87171',
  dangerBg:    'rgba(248,113,113,0.09)',
  success:     '#4ade80',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, full: 999 };

// ── Downloads vs. auto-cache ─────────────────────────────────────────────────
// fileRepository's `downloaded: true` flag is shared by TWO different
// mechanisms that both end up calling fileRepository.upsert():
//   1. downloadManager.downloadToDevice() / saveOffline() — a file the user
//      DELIBERATELY downloaded, saved under documentDirectory/StudyShala/Downloads/
//   2. openFile() (utils/fileActions.js, services/offlineSyncService.js) — a
//      file that was simply OPENED/PREVIEWED, silently cached under
//      cacheDirectory/StudyShala/Cache/ so it reopens instantly offline
// Both set the same `downloaded` flag, so without filtering by path this
// screen shows every file you've ever merely viewed as if you'd downloaded
// it. The fix: only count files whose localPath is actually inside the
// Downloads folder.
const REAL_DOWNLOADS_DIR = FileSystem.documentDirectory + 'StudyShala/Downloads/';

const formatBytes = (bytes) => {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
  return mb.toFixed(1) + ' MB';
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getMimeIcon = (mimeType) => {
  if (!mimeType) return { icon: 'document-outline', color: C.textSec };
  if (mimeType.includes('pdf'))         return { icon: 'document-text-outline', color: '#f87171' };
  if (mimeType.includes('image'))       return { icon: 'image-outline',          color: '#60a5fa' };
  if (mimeType.includes('video'))       return { icon: 'videocam-outline',        color: '#a78bfa' };
  if (mimeType.includes('audio'))       return { icon: 'musical-notes-outline',   color: '#34d399' };
  if (mimeType.includes('word') || mimeType.includes('document'))
                                        return { icon: 'document-outline',        color: '#60a5fa' };
  if (mimeType.includes('sheet') || mimeType.includes('excel'))
                                        return { icon: 'grid-outline',            color: '#34d399' };
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
                                        return { icon: 'easel-outline',           color: '#f59e0b' };
  return { icon: 'document-outline', color: C.textSec };
};

// ── Subject icon map — same palette logic as SavedMaterialsScreen ────────────
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

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DownloadsScreen({ navigation }) {
  const [groups,     setGroups]     = useState([]); // [{ materialId, subjectName, facultyName, files: [...], totalSize, lastDownloaded }]
  const [totalSize,  setTotalSize]  = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [openGroup,  setOpenGroup]  = useState(null); // selected materialId, or null = subject list view

  useEffect(() => { loadDownloads(); }, []);

  const loadDownloads = useCallback(async () => {
    try {
      const allFiles = await fileRepository.getAll();

      // Only files that actually live in the Downloads folder — excludes
      // files that were merely auto-cached from being opened/previewed
      // (see REAL_DOWNLOADS_DIR comment above).
      const realDownloads = [];
      for (const file of (allFiles || [])) {
        if (!file?.downloaded || !file?.localPath) continue;
        if (!file.localPath.startsWith(REAL_DOWNLOADS_DIR)) continue;
        const info = await FileSystem.getInfoAsync(file.localPath);
        if (info.exists) realDownloads.push(file);
      }

      // Fallback: some older downloads may predate the subjectName field
      // being stored on the file record — backfill from materialRepository
      // where possible so they still group correctly instead of landing
      // under "Unknown subject".
      const matCache = {};
      for (const file of realDownloads) {
        if (!file.subjectName && file.materialId) {
          if (matCache[file.materialId] === undefined) {
            matCache[file.materialId] = await materialRepository.getById(file.materialId);
          }
          const mat = matCache[file.materialId];
          if (mat) {
            file.subjectName = mat.subject;
            file.facultyName = file.facultyName || mat.facultyName;
            file.department  = file.department  || mat.department;
          }
        }
      }

      // Group by materialId (fall back to fileId so files with no material
      // context still show up individually rather than disappearing).
      const byMaterial = {};
      for (const file of realDownloads) {
        const key = file.materialId || `__no_material_${file.fileId}`;
        if (!byMaterial[key]) {
          byMaterial[key] = {
            materialId:   file.materialId || null,
            subjectName:  file.subjectName || 'Unknown subject',
            facultyName:  file.facultyName || null,
            department:   file.department  || null,
            files: [],
          };
        }
        byMaterial[key].files.push(file);
      }

      const groupList = Object.values(byMaterial).map(g => {
        const size = g.files.reduce((sum, f) => sum + (f.size || 0), 0);
        const lastDownloaded = g.files.reduce((latest, f) => {
          const t = new Date(f.cachedAt || f.lastOpened || 0).getTime();
          return t > latest ? t : latest;
        }, 0);
        return {
          ...g,
          files: g.files.sort((a, b) => new Date(b.cachedAt || 0) - new Date(a.cachedAt || 0)),
          totalSize: size,
          lastDownloaded: lastDownloaded ? new Date(lastDownloaded).toISOString() : null,
        };
      }).sort((a, b) => new Date(b.lastDownloaded || 0) - new Date(a.lastDownloaded || 0));

      setGroups(groupList);
      setTotalFiles(realDownloads.length);
      setTotalSize(realDownloads.reduce((sum, f) => sum + (f.size || 0), 0));
    } catch (e) {
      console.warn('loadDownloads error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleOpen = (file) => {
    const material = file.materialId ? { _id: file.materialId, subjectName: file.subjectName } : null;
    navigation.navigate('FileViewer', { file, material });
  };

  const handleShare = async (file) => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing not available on this device.');
        return;
      }
      await Sharing.shareAsync(file.localPath);
    } catch (e) {
      Alert.alert('Error', 'Could not share this file.');
    }
  };

  const handleDelete = (file) => {
    Alert.alert(
      'Remove Download',
      `Remove "${file.name}" from downloads? You can download it again anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(file.localPath, { idempotent: true });
              await fileRepository.setDownloaded(file.fileId, null);
              await loadDownloads();
            } catch (e) {
              Alert.alert('Error', 'Could not remove file.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = (group) => {
    Alert.alert(
      'Remove All',
      `Remove all ${group.files.length} downloaded file${group.files.length !== 1 ? 's' : ''} from "${group.subjectName}"? You can download them again anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All', style: 'destructive',
          onPress: async () => {
            for (const file of group.files) {
              try {
                await FileSystem.deleteAsync(file.localPath, { idempotent: true });
                await fileRepository.setDownloaded(file.fileId, null);
              } catch (_) {}
            }
            setOpenGroup(null);
            await loadDownloads();
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDownloads();
  };

  const selectedGroup = useMemo(
    () => groups.find(g => (g.materialId || `__no_material_${g.files[0]?.fileId}`) === openGroup) || null,
    [groups, openGroup]
  );

  // ── Render: per-subject file list ───────────────────────────────────────────
  if (selectedGroup) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => setOpenGroup(null)}>
            <Ionicons name="arrow-back" size={18} color={C.textSec} />
          </TouchableOpacity>
          <View style={s.headerIconBox}>
            {(() => {
              const subStyle = getSubjectStyle(selectedGroup.subjectName);
              return <Ionicons name={subStyle.icon} size={16} color={subStyle.color} />;
            })()}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>{selectedGroup.subjectName}</Text>
            <Text style={s.headerSub}>
              {selectedGroup.files.length} file{selectedGroup.files.length !== 1 ? 's' : ''} · {formatBytes(selectedGroup.totalSize)}
            </Text>
          </View>
          <TouchableOpacity style={s.deleteAllBtn} onPress={() => handleDeleteGroup(selectedGroup)}>
            <Ionicons name="trash-outline" size={15} color={C.danger} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={selectedGroup.files}
          keyExtractor={item => item.fileId}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <DownloadItem
              file={item}
              onOpen={() => handleOpen(item)}
              onShare={() => handleShare(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      </SafeAreaView>
    );
  }

  // ── Render: subject card list ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={C.textSec} />
        </TouchableOpacity>
        <View style={s.headerIconBox}>
          <Ionicons name="arrow-down-circle-outline" size={16} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Downloads</Text>
          <Text style={s.headerSub}>
            {totalFiles} file{totalFiles !== 1 ? 's' : ''} · {formatBytes(totalSize)}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyText}>Loading...</Text>
        </View>
      ) : groups.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={item => item.materialId || `__no_material_${item.files[0]?.fileId}`}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
          }
          renderItem={({ item }) => (
            <SubjectCard
              group={item}
              onPress={() => setOpenGroup(item.materialId || `__no_material_${item.files[0]?.fileId}`)}
              onRemove={() => handleDeleteGroup(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ── Subject Card ──────────────────────────────────────────────────────────────
// Same visual language as SavedMaterialsScreen's MaterialCard — a single
// downloaded file from a subject still shows as a proper subject card here,
// not a bare file row, so it reads as "your downloads for this subject"
// rather than a flat dump of files.
function SubjectCard({ group, onPress, onRemove }) {
  const subStyle = getSubjectStyle(group.subjectName);

  const meta = [
    group.facultyName && { icon: 'person-outline',   label: 'Faculty', value: group.facultyName },
    { icon: 'document-outline', label: 'Files', value: String(group.files.length) },
    group.department  && { icon: 'business-outline', label: 'Dept', value: group.department },
    group.lastDownloaded && { icon: 'time-outline', label: 'Last saved', value: formatDate(group.lastDownloaded) },
  ].filter(Boolean);

  return (
    <View style={card.root}>
      <View style={card.top}>
        <View style={[card.iconBox, { backgroundColor: subStyle.bg }]}>
          <Ionicons name={subStyle.icon} size={20} color={subStyle.color} />
        </View>

        <View style={card.titleBlock}>
          <Text style={card.subjectName} numberOfLines={1}>{group.subjectName}</Text>
          <Text style={card.sizePill}>{formatBytes(group.totalSize)}</Text>
        </View>

        <TouchableOpacity style={card.removeBtn} onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={15} color={C.danger} />
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

      <TouchableOpacity style={card.browseBtn} onPress={onPress} activeOpacity={0.82}>
        <Ionicons name="folder-open-outline" size={14} color={C.textPrimary} />
        <Text style={card.browseBtnText}>Browse files</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Download Item (used inside a subject's file list) ──────────────────────────
function DownloadItem({ file, onOpen, onShare, onDelete }) {
  const { icon, color } = getMimeIcon(file.mimeType);

  return (
    <TouchableOpacity style={s.item} onPress={onOpen} activeOpacity={0.7}>
      <View style={[s.fileIcon, { backgroundColor: color + '18', borderColor: color + '30' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <View style={s.itemInfo}>
        <Text style={s.fileName} numberOfLines={2}>{file.name}</Text>
        <Text style={s.fileMeta}>
          {file.size ? formatBytes(file.size) : ''}
          {file.cachedAt ? '  ·  Downloaded ' + formatDate(file.cachedAt) : ''}
        </Text>
      </View>

      <View style={s.itemActions}>
        <TouchableOpacity style={s.actionBtn} onPress={onShare}>
          <Ionicons name="share-outline" size={18} color={C.textSec} />
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={C.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={s.emptyBox}>
      <View style={s.emptyIconBox}>
        <Ionicons name="arrow-down-circle-outline" size={36} color={C.textMuted} />
      </View>
      <Text style={s.emptyTitle}>No Downloads Yet</Text>
      <Text style={s.emptyText}>
        Files you download will appear here, grouped by subject.{'\n'}Open any material and tap the download button.
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerIconBox: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBdr,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  headerSub:   { fontSize: 11, color: C.textMuted, marginTop: 1 },
  deleteAllBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: C.dangerBg, borderWidth: 1, borderColor: C.danger + '30',
    alignItems: 'center', justifyContent: 'center',
  },

  list: { padding: 14, gap: 10 },

  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 10,
  },
  fileIcon: {
    width: 48, height: 48, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  itemInfo:    { flex: 1 },
  fileName:    { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 4 },
  fileMeta:    { fontSize: 11, color: C.textMuted, fontWeight: '500' },
  itemActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  emptyText:  { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
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
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
  },
  sizePill: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '600',
    color: C.textSec,
    backgroundColor: C.elevated,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: R.xs,
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: C.danger + '30',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

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

  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: R.lg,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  browseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: 0.2,
  },
});
import React, { useEffect, useState, useCallback } from 'react';
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
// it — which is the "I don't remember downloading 26 files" bug. The fix:
// only count files whose localPath is actually inside the Downloads folder.
const REAL_DOWNLOADS_DIR = FileSystem.documentDirectory + 'StudyShala/Downloads/';

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

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DownloadsScreen({ navigation }) {
  const [downloads,  setDownloads]  = useState([]);
  const [materials,  setMaterials]  = useState({});
  const [totalSize,  setTotalSize]  = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { loadDownloads(); }, []);

  const loadDownloads = useCallback(async () => {
    try {
      // Get all saved materials
      const allMaterials = await materialRepository.getAllSaved();
      const matMap = {};
      for (const m of allMaterials) matMap[m.materialId] = m;

      // Get all downloaded files across all materials
      const allFiles = [];
      for (const mat of allMaterials) {
        const files = await fileRepository.getDownloadedByMaterial(mat.materialId);
        for (const file of files) {
          // Only count files that actually live in the Downloads folder —
          // skip files that were only auto-cached from being opened/previewed
          // (see REAL_DOWNLOADS_DIR comment above).
          if (file.localPath && file.localPath.startsWith(REAL_DOWNLOADS_DIR)) {
            const info = await FileSystem.getInfoAsync(file.localPath);
            if (info.exists) {
              allFiles.push({ ...file, exists: true });
            }
          }
        }
      }

      // Sort by lastOpened descending
      allFiles.sort((a, b) => new Date(b.lastOpened || 0) - new Date(a.lastOpened || 0));

      const total = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);

      setDownloads(allFiles);
      setMaterials(matMap);
      setTotalSize(total);
    } catch (e) {
      console.warn('loadDownloads error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleOpen = (file) => {
    const material = materials[file.materialId];
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

  const handleDeleteAll = () => {
    if (!downloads.length) return;
    Alert.alert(
      'Remove All Downloads',
      'This will remove all downloaded files from your device. You can re-download them anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All', style: 'destructive',
          onPress: async () => {
            for (const file of downloads) {
              try {
                await FileSystem.deleteAsync(file.localPath, { idempotent: true });
                await fileRepository.setDownloaded(file.fileId, null);
              } catch (_) {}
            }
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* Header */}
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
            {downloads.length} file{downloads.length !== 1 ? 's' : ''} · {formatBytes(totalSize)}
          </Text>
        </View>
        {downloads.length > 0 && (
          <TouchableOpacity style={s.deleteAllBtn} onPress={handleDeleteAll}>
            <Ionicons name="trash-outline" size={15} color={C.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyText}>Loading...</Text>
        </View>
      ) : downloads.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={item => item.fileId}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
          }
          renderItem={({ item }) => (
            <DownloadItem
              file={item}
              material={materials[item.materialId]}
              onOpen={() => handleOpen(item)}
              onShare={() => handleShare(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ── Download Item ─────────────────────────────────────────────────────────────
function DownloadItem({ file, material, onOpen, onShare, onDelete }) {
  const { icon, color } = getMimeIcon(file.mimeType);

  return (
    <TouchableOpacity style={s.item} onPress={onOpen} activeOpacity={0.7}>
      {/* File icon */}
      <View style={[s.fileIcon, { backgroundColor: color + '18', borderColor: color + '30' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      {/* Info */}
      <View style={s.itemInfo}>
        <Text style={s.fileName} numberOfLines={2}>{file.name}</Text>
        <Text style={s.fileMeta}>
          {material?.subject || 'Unknown Subject'}
          {file.size ? '  ·  ' + formatBytes(file.size) : ''}
          {file.lastOpened ? '  ·  ' + formatDate(file.lastOpened) : ''}
        </Text>
      </View>

      {/* Actions */}
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
        Files you download will appear here.{'\n'}Open any material and tap the download button.
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
    padding: 14,
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
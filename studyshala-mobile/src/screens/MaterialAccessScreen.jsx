/**
 * screens/MaterialAccessScreen.jsx
 * ==================================
 * Reached from EnterCodeScreen ("Open Now") or SavedMaterialsScreen.
 *
 * Fully automatic offline saving: the moment the file list loads, every
 * file in the material starts downloading in the background — no button
 * to tap. Tapping a file row only opens it. The small icon on the right
 * of each row is a STATUS indicator only (queued / downloading / saved),
 * not a button.
 */
import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../components/theme';
import FileListItem from '../components/FileListItem';
import { getMaterialFiles } from '../api/studentApi';
import { openFile } from '../utils/fileActions';
import { isAvailableOffline, saveFileOffline } from '../utils/fileRepository';
import { getCachedMaterialFiles, setCachedMaterialFiles } from '../utils/materialFilesCache';

export default function MaterialAccessScreen({ route, navigation }) {
  const { material } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [offlineNotice, setOfflineNotice] = useState('');
  const [rootFiles, setRootFiles] = useState([]);
  const [subFolders, setSubFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null); // null = root
  const [offlineMap, setOfflineMap] = useState({}); // fileId -> bool (saved)
  const [downloadingIds, setDownloadingIds] = useState({}); // fileId -> true while in progress

  // Prevents kicking off the same auto-download pass twice (e.g. a refresh
  // firing while the first pass is still running).
  const autoDownloadRunId = useRef(0);

  const allFilesFlat = useCallback((files, folders) => {
    const nested = (folders || []).flatMap((f) => f.files || []);
    return [...(files || []), ...nested];
  }, []);

  const refreshOfflineStatus = useCallback(async (files) => {
    const entries = await Promise.all(
      files.map(async (f) => [f._id, await isAvailableOffline(f._id)])
    );
    setOfflineMap(Object.fromEntries(entries));
  }, []);

  // Automatically downloads every file that isn't already saved. Runs
  // silently in the background — failures are skipped, not alerted,
  // since this isn't a user-initiated tap.
  const autoDownloadAll = useCallback(async (files) => {
    const runId = ++autoDownloadRunId.current;
    for (const file of files) {
      if (runId !== autoDownloadRunId.current) return; // a newer pass took over
      const already = await isAvailableOffline(file._id);
      if (already) continue;

      setDownloadingIds((prev) => ({ ...prev, [file._id]: true }));
      try {
        await saveFileOffline(file, material);
        setOfflineMap((prev) => ({ ...prev, [file._id]: true }));
      } catch {
        // Offline, or this one file failed — move on to the rest.
      }
      setDownloadingIds((prev) => {
        const next = { ...prev };
        delete next[file._id];
        return next;
      });
    }
  }, [material]);

  const load = useCallback(async () => {
    if (!material?._id) {
      setError('No material selected.');
      setLoading(false);
      return;
    }
    setError('');
    setOfflineNotice('');

    // Step 1 — instant local cache of the file listing itself (works with
    // zero internet).
    let hadCache = false;
    try {
      const cached = await getCachedMaterialFiles(material._id);
      if (cached) {
        setRootFiles(cached.files || []);
        setSubFolders(cached.subFolders || []);
        await refreshOfflineStatus(allFilesFlat(cached.files, cached.subFolders));
        hadCache = true;
        setLoading(false);
      }
    } catch {}

    // Step 2 — fetch the fresh listing from the server
    try {
      const { data } = await getMaterialFiles(material._id);
      const files = data.files || [];
      const folders = data.subFolders || [];
      setRootFiles(files);
      setSubFolders(folders);
      await refreshOfflineStatus(allFilesFlat(files, folders));

      // Step 3 — resync the cache so this material stays browsable offline
      try { await setCachedMaterialFiles(material._id, { files, subFolders: folders }); } catch {}

      // Step 4 — automatically save everything, no tap required
      autoDownloadAll(allFilesFlat(files, folders));
    } catch (e) {
      if (hadCache) {
        setOfflineNotice('Offline — showing your last saved file list.');
      } else {
        setError(
          e.response?.data?.message ||
            'Could not load materials. Connect to the internet and try again.'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [material, allFilesFlat, refreshOfflineStatus, autoDownloadAll]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const visibleFiles = activeFolder
    ? (subFolders.find((f) => f._id === activeFolder)?.files || [])
    : rootFiles;

  const handleOpen = (file) => {
    openFile(file, material, navigation);
  };

  const totalCount = allFilesFlat(rootFiles, subFolders).length;
  const savedCount = Object.values(offlineMap).filter(Boolean).length;
  const isDownloading = Object.keys(downloadingIds).length > 0;

  const renderFile = ({ item }) => {
    const saved = !!offlineMap[item._id];
    const downloading = !!downloadingIds[item._id];
    return (
      <View style={s.fileRowWrap}>
        <View style={{ flex: 1 }}>
          <FileListItem file={item} onPress={handleOpen} showStar={false} />
        </View>
        {/* Status only — not tappable. Saving happens automatically. */}
        <View style={[s.statusIcon, saved && s.statusIconDone]}>
          {downloading ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Ionicons
              name={saved ? 'checkmark-circle' : 'time-outline'}
              size={20}
              color={saved ? C.success : C.textMuted}
            />
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={C.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{material?.subjectName || 'Material'}</Text>
          <Text style={s.subtitle} numberOfLines={1}>
            {material?.facultyName || ''}{material?.department ? ` · ${material.department}` : ''}
            {material?.semester ? ` · Sem ${material.semester}` : ''}
          </Text>
        </View>
      </View>

      {!!error && (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {!error && !!offlineNotice && (
        <View style={s.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={C.warning} />
          <Text style={s.offlineText}>{offlineNotice}</Text>
        </View>
      )}

      {!error && isDownloading && (
        <View style={s.downloadBanner}>
          <ActivityIndicator size="small" color={C.accent} />
          <Text style={s.downloadText}>Saving files for offline access — {savedCount}/{totalCount} done</Text>
        </View>
      )}

      {/* Folder chips */}
      {subFolders.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipRow}
          data={[{ _id: null, name: 'All files' }, ...subFolders]}
          keyExtractor={(f) => f._id ?? 'root'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.chip, activeFolder === item._id && s.chipActive]}
              onPress={() => setActiveFolder(item._id)}
            >
              <Text style={[s.chipText, activeFolder === item._id && s.chipTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <FlatList
        data={visibleFiles}
        keyExtractor={(f) => f._id}
        renderItem={renderFile}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        ListEmptyComponent={
          !error && (
            <View style={s.empty}>
              <Ionicons name="folder-open-outline" size={40} color={C.textMuted} />
              <Text style={s.emptyText}>No files here yet.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  subtitle: { fontSize: T.xs, color: C.textSecondary, marginTop: 2 },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)', margin: 14, padding: 12, borderRadius: R.sm,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: { flex: 1, fontSize: T.sm, color: C.danger, lineHeight: 18 },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(251,191,36,0.1)', marginHorizontal: 14, marginTop: 14,
    padding: 10, borderRadius: R.sm, borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)',
  },
  offlineText: { color: C.warning, fontSize: T.xs, fontWeight: '600', flex: 1 },

  downloadBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accentBg, marginHorizontal: 14, marginTop: 14,
    padding: 10, borderRadius: R.sm, borderWidth: 1, borderColor: C.accentBorder,
  },
  downloadText: { color: C.accent, fontSize: T.xs, fontWeight: '600', flex: 1 },

  chipRow: { flexGrow: 0, paddingHorizontal: 14, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, marginRight: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.accentBg, borderColor: C.accent },
  chipText: { fontSize: T.sm, color: C.textSecondary, fontWeight: '600' },
  chipTextActive: { color: C.accent },

  list: { paddingHorizontal: 14, paddingBottom: 24 },
  fileRowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusIcon: {
    width: 40, height: 40, borderRadius: R.sm, marginBottom: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  statusIconDone: { borderColor: C.success },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyText: { color: C.textMuted, fontSize: T.sm },
});
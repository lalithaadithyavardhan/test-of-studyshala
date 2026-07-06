/**
 * screens/MaterialAccessScreen.jsx
 * ==================================
 * Reached from EnterCodeScreen ("Open Now") or SavedMaterialsScreen.
 * Fetches the full file/folder listing for a material and lets the
 * student Open (view) or Save (download for offline) each file.
 *
 * Functionality-first per project brief — plain list UI, no heavy polish.
 */
import React, { useCallback, useEffect, useState } from 'react';
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
import { openFile, saveFileForLater } from '../utils/fileActions';
import { isAvailableOffline } from '../utils/fileRepository';
import { storage } from '../database/db';

const listingKey = (materialId) => `materialFiles:${materialId}`;

export default function MaterialAccessScreen({ route, navigation }) {
  const { material } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [offlineNotice, setOfflineNotice] = useState('');
  const [rootFiles, setRootFiles] = useState([]);
  const [subFolders, setSubFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null); // null = root
  const [offlineMap, setOfflineMap] = useState({}); // fileId -> bool
  const [savingId, setSavingId] = useState(null);
  const [saveProgress, setSaveProgress] = useState(0);

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

  const load = useCallback(async () => {
    if (!material?._id) {
      setError('No material selected.');
      setLoading(false);
      return;
    }
    setError('');
    setOfflineNotice('');

    // Step 1 — instant local cache of the file listing itself (works with
    // zero internet). Without this, reopening a material while offline
    // would fail here even if some of its files were already saved,
    // because the listing call below needs the network.
    let hadCache = false;
    try {
      const cached = await storage.get(listingKey(material._id));
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
      try { await storage.set(listingKey(material._id), { files, subFolders: folders }); } catch {}
    } catch (e) {
      if (hadCache) {
        // We already showed the last known file list — this is expected
        // while offline, not an error the student needs to act on.
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
  }, [material, allFilesFlat, refreshOfflineStatus]);

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

  const handleSave = async (file) => {
    setSavingId(file._id);
    setSaveProgress(0);
    const res = await saveFileForLater(file, material, (p) => setSaveProgress(p));
    setSavingId(null);
    if (res.success) {
      setOfflineMap((prev) => ({ ...prev, [file._id]: true }));
    }
  };

  const renderFile = ({ item }) => {
    const saved = !!offlineMap[item._id];
    const isSaving = savingId === item._id;
    return (
      <View style={s.fileRowWrap}>
        <View style={{ flex: 1 }}>
          <FileListItem file={item} onPress={handleOpen} showStar={false} />
        </View>
        <TouchableOpacity
          style={[s.actionBtn, saved && s.actionBtnDone]}
          onPress={() => (saved ? handleOpen(item) : handleSave(item))}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Ionicons
              name={saved ? 'checkmark-circle' : 'download-outline'}
              size={20}
              color={saved ? C.success : C.accent}
            />
          )}
        </TouchableOpacity>
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

      {savingId && (
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${Math.round(saveProgress * 100)}%` }]} />
        </View>
      )}
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
  actionBtn: {
    width: 40, height: 40, borderRadius: R.sm, marginBottom: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnDone: { borderColor: C.success },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyText: { color: C.textMuted, fontSize: T.sm },

  progressBar: { height: 3, backgroundColor: C.surface },
  progressFill: { height: 3, backgroundColor: C.accent },
});
/**
 * screens/StarredScreen.jsx
 * ============================
 * Files the student starred (via FileListItem's star button elsewhere in
 * the app). Same cache-first pattern as SavedMaterialsScreen/DashboardScreen.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../components/theme';
import FileListItem from '../components/FileListItem';
import { getStarredFiles, unstarFile } from '../api/studentApi';
import { openFile } from '../utils/fileActions';
import { storage } from '../database/db';
import { scopedKey } from '../utils/accountScope';

export default function StarredScreen({ navigation }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineOnly, setOfflineOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      const cached = await storage.getAllByPrefix(scopedKey('starred:'));
      if (cached?.length) setFiles(cached);
    } catch {}

    try {
      const { data } = await getStarredFiles();
      const list = data.starredFiles || [];
      setFiles(list);
      setOfflineOnly(false);

      try { await storage.deleteAllByPrefix(scopedKey('starred:')); } catch {}
      for (const f of list) {
        try { await storage.set(scopedKey(`starred:${f.fileId}`), f); } catch {}
      }
    } catch {
      setOfflineOnly(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleOpen = (item) => {
    openFile(
      {
        _id: item.fileId,
        fileId: item.fileId,
        name: item.fileName,
        fileName: item.fileName,
        mimeType: item.mimeType,
        previewUrl: item.previewUrl || null,
        downloadUrl: item.downloadUrl || null,
      },
      { _id: item.materialId, subjectName: item.subjectName },
      navigation,
    );
  };

  const handleUnstar = async (item) => {
    setFiles((prev) => prev.filter((f) => f.fileId !== item.fileId));
    storage.delete(scopedKey(`starred:${item.fileId}`)).catch(() => {});
    unstarFile(item.fileId).catch(() => {});
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={s.title}>Starred Files</Text>
      </View>

      {offlineOnly && (
        <View style={s.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={C.warning} />
          <Text style={s.offlineText}>Offline — showing your last known starred files.</Text>
        </View>
      )}

      <FlatList
        data={files}
        keyExtractor={(f) => f.fileId}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        renderItem={({ item }) => (
          <FileListItem
            file={{ name: item.fileName, mimeType: item.mimeType }}
            onPress={() => handleOpen(item)}
            isStarred
            onStarPress={() => handleUnstar(item)}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="star-outline" size={40} color={C.textMuted} />
            <Text style={s.emptyText}>No starred files yet.</Text>
            <Text style={s.emptySub}>Star a file to find it here quickly.</Text>
          </View>
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

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(251,191,36,0.1)', marginHorizontal: 14, marginTop: 12,
    padding: 10, borderRadius: R.sm, borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)',
  },
  offlineText: { color: C.warning, fontSize: T.xs, fontWeight: '600' },

  list: { padding: 14 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 90, gap: 8 },
  emptyText: { color: C.textSecondary, fontSize: T.md, fontWeight: '600' },
  emptySub: { color: C.textMuted, fontSize: T.sm, textAlign: 'center' },
});
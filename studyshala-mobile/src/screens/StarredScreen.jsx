/**
 * screens/StarredScreen.jsx — StudyShala Dark Theme
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FileListItem from '../components/FileListItem';
import { getStarredFiles, unstarFile } from '../api/studentApi';
import { openFile } from '../utils/fileActions';
import { C, R, T } from '../components/theme';

export default function StarredScreen() {
  const [starredFiles, setStarredFiles] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getStarredFiles();
      setStarredFiles(data.starredFiles || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load starred files.');
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleUnstar = async (file) => {
    try {
      await unstarFile(file.fileId || file._id);
      setStarredFiles((prev) => prev.filter((f) => f.fileId !== (file.fileId || file._id)));
    } catch (e) {
      Alert.alert('Error', 'Failed to unstar file.');
    }
  };

  const handleOpen = (file) => {
    openFile(
      { _id: file.fileId, name: file.fileName, mimeType: file.mimeType, previewUrl: file.previewUrl, downloadUrl: file.downloadUrl },
      { _id: file.materialId, subjectName: file.subjectName }
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerIconBox}>
          <Ionicons name="star" size={20} color={C.accent} />
        </View>
        <View>
          <Text style={s.title}>Starred Files</Text>
          <Text style={s.subtitle}>
            {starredFiles.length} file{starredFiles.length === 1 ? '' : 's'} starred
          </Text>
        </View>
      </View>

      <FlatList
        data={starredFiles}
        keyExtractor={(item) => item.fileId}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <FileListItem
            file={{ _id: item.fileId, name: item.fileName, mimeType: item.mimeType }}
            onPress={handleOpen}
            onStarPress={handleUnstar}
            isStarred={true}
            dark
          />
        )}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>⭐</Text>
            <Text style={s.emptyTitle}>No starred files yet</Text>
            <Text style={s.emptyDesc}>
              Tap the star on any file to bookmark it here for quick access.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  headerIconBox: {
    width: 42,
    height: 42,
    borderRadius: R.sm,
    backgroundColor: C.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.accent + '40',
  },
  title:    { fontSize: T.lg, fontWeight: '700', color: C.textPrimary },
  subtitle: { fontSize: T.xs, color: C.textSecondary, marginTop: 2 },

  listContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 40,
    flexGrow: 1,
  },

  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    paddingVertical: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 16,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyDesc:  {
    fontSize: T.base, color: C.textMuted,
    textAlign: 'center', paddingHorizontal: 28, lineHeight: 20,
  },
});
/**
 * screens/StarredScreen.jsx
 * ===========================
 * Mirrors studyshalaFrontend's StudentStarred.jsx.
 * GET /student/starred-files -> { starredFiles: [...] }
 * DELETE /student/starred-files/:fileId
 *
 * Shape per item (from controller): { fileId, fileName, mimeType,
 * materialId, subjectName, starredAt }
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FileListItem from '../components/FileListItem';
import { getStarredFiles, unstarFile } from '../api/studentApi';
import { openFile } from '../utils/fileActions';

export default function StarredScreen() {
  const [starredFiles, setStarredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getStarredFiles();
      setStarredFiles(data.starredFiles || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load starred files.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

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
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Starred Files</Text>
      </View>
      <FlatList
        data={starredFiles}
        keyExtractor={(item) => item.fileId}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <FileListItem
            file={{ _id: item.fileId, name: item.fileName, mimeType: item.mimeType }}
            onPress={handleOpen}
            onStarPress={handleUnstar}
            isStarred={true}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="star-outline" size={32} color="#D1D5DB" />
            <Text style={styles.emptyText}>No starred files yet.</Text>
            <Text style={styles.emptySubtext}>
              Tap the star icon on any file to bookmark it here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6FB' },
  header: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  listContent: { padding: 18, paddingTop: 6 },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginTop: 10 },
  emptySubtext: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
});

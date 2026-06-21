/**
 * screens/MaterialAccessScreen.jsx
 * ==================================
 * Mirrors studyshalaFrontend's StudentMaterialAccess.jsx.
 * Receives `material` from EnterCodeScreen (validate-code response) or
 * re-fetches via GET /student/materials/:id/files when opened from a
 * saved/history list (which only stores the summary, not files).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FileListItem from '../components/FileListItem';
import {
  getMaterialFiles,
  saveMaterial,
  starFile,
  unstarFile,
  getStarredFiles,
} from '../api/studentApi';
import { openFile, downloadFile } from '../utils/fileActions';

export default function MaterialAccessScreen({ route, navigation }) {
  const { material: initialMaterial } = route.params;
  const [material, setMaterial] = useState(initialMaterial);
  const [files, setFiles] = useState(initialMaterial.files || []);
  const [subFolders, setSubFolders] = useState(initialMaterial.subFolders || []);
  const [activeFolder, setActiveFolder] = useState(null); // null = root
  const [loading, setLoading] = useState(!initialMaterial.files);
  const [starredIds, setStarredIds] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getMaterialFiles(initialMaterial._id);
      setMaterial({ ...initialMaterial, ...data.material });
      setFiles(data.files || []);
      setSubFolders(data.subFolders || []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load files.');
    } finally {
      setLoading(false);
    }
  }, [initialMaterial]);

  const loadStarred = useCallback(async () => {
    try {
      const { data } = await getStarredFiles();
      setStarredIds(new Set((data.starredFiles || []).map((s) => s.fileId)));
    } catch (e) {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (!initialMaterial.files) {
      loadFiles();
    }
    loadStarred();
  }, []);

  const currentFiles = activeFolder ? activeFolder.files : files;

  const handleStarToggle = async (file) => {
    const isStarred = starredIds.has(file._id);
    try {
      if (isStarred) {
        await unstarFile(file._id);
        setStarredIds((prev) => {
          const next = new Set(prev);
          next.delete(file._id);
          return next;
        });
      } else {
        await starFile({
          fileId: file._id,
          fileName: file.name,
          mimeType: file.mimeType,
          materialId: material._id,
          subjectName: material.subjectName,
        });
        setStarredIds((prev) => new Set(prev).add(file._id));
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update star.');
    }
  };

  const handleSaveMaterial = async () => {
    setSaving(true);
    try {
      const { data } = await saveMaterial(material._id);
      Alert.alert('Saved', data.message || 'Material saved successfully');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save material.');
    } finally {
      setSaving(false);
    }
  };

  const handleFilePress = (file) => {
    Alert.alert(file.name, 'What would you like to do?', [
      { text: 'Preview', onPress: () => openFile(file, material) },
      { text: 'Download', onPress: () => downloadFile(file) },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
        <TouchableOpacity
          onPress={() => (activeFolder ? setActiveFolder(null) : navigation.goBack())}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {activeFolder ? activeFolder.name : material.subjectName}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {material.department} · Sem {material.semester} · {material.facultyName}
          </Text>
        </View>
        {!activeFolder && (
          <TouchableOpacity onPress={handleSaveMaterial} disabled={saving} style={styles.saveBtn}>
            {saving ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Ionicons name="bookmark-outline" size={22} color="#4F46E5" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {!!material.messageToStudents && !activeFolder && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>💬 {material.messageToStudents}</Text>
        </View>
      )}

      <FlatList
        data={[
          ...(!activeFolder ? subFolders.map((sf) => ({ ...sf, __isFolder: true })) : []),
          ...currentFiles,
        ]}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) =>
          item.__isFolder ? (
            <TouchableOpacity
              style={styles.folderRow}
              onPress={() => setActiveFolder(item)}
              activeOpacity={0.7}
            >
              <View style={styles.folderIconBox}>
                <Ionicons name="folder" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.folderName}>{item.name}</Text>
                <Text style={styles.folderMeta}>{item.fileCount} files</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : (
            <FileListItem
              file={item}
              onPress={handleFilePress}
              onStarPress={handleStarToggle}
              isStarred={starredIds.has(item._id)}
            />
          )
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No files in this folder yet.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6FB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  backBtn: { padding: 6, marginRight: 4 },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  subtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  saveBtn: { padding: 6 },
  messageBox: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageText: { fontSize: 13, color: '#4338CA' },
  listContent: { padding: 14 },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  folderIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  folderName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  folderMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
});

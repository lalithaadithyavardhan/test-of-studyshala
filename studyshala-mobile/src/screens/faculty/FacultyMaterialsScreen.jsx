import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import ScreenScaffold from '../../components/ScreenScaffold';
import { getFolders, getFolderDetails, uploadFiles, deleteFile } from '../../api/faculty';
import { COLORS } from '../../constants/config';

export default function FacultyMaterialsScreen({ route }) {
  const presetId = route.params?.id;
  const [folders, setFolders] = useState([]);
  const [selectedId, setSelectedId] = useState(presetId || null);
  const [folder, setFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadFolders = useCallback(async () => {
    const res = await getFolders();
    const list = res.data?.folders || [];
    setFolders(list);
    if (!selectedId && list.length) setSelectedId(list[0]._id);
  }, [selectedId]);

  const loadDetails = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getFolderDetails(id);
      setFolder(res.data?.folder || res.data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFolders();
    }, [loadFolders])
  );

  useFocusEffect(
    useCallback(() => {
      if (selectedId) loadDetails(selectedId);
    }, [selectedId, loadDetails])
  );

  const handleUpload = async () => {
    if (!selectedId) {
      Alert.alert('Select a material first');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;

    const pickedFiles = result.assets || [result];
    setUploading(true);
    try {
      await uploadFiles(selectedId, pickedFiles);
      await loadDetails(selectedId);
    } catch (err) {
      Alert.alert('Upload failed', err?.response?.data?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await deleteFile(selectedId, fileId);
      loadDetails(selectedId);
    } catch (e) {
      Alert.alert('Could not delete file');
    }
  };

  return (
    <ScreenScaffold title={folder?.name || 'My Materials'} subtitle={folder?.accessCode ? `Code: ${folder.accessCode}` : undefined}>
      {folders.length > 1 && (
        <FlatList
          horizontal
          data={folders}
          keyExtractor={(item) => item._id}
          style={{ marginBottom: 12, flexGrow: 0 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, selectedId === item._id && styles.chipActive]}
              onPress={() => setSelectedId(item._id)}
            >
              <Text style={[styles.chipText, selectedId === item._id && styles.chipTextActive]}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadButtonText}>Upload Files</Text>}
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={folder?.files || []}
          keyExtractor={(item) => item._id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
              <TouchableOpacity onPress={() => handleDeleteFile(item._id)}>
                <Text style={styles.remove}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No files uploaded yet.</Text>}
        />
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.faculty, borderColor: COLORS.faculty },
  chipText: { color: COLORS.text, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  uploadButton: {
    backgroundColor: COLORS.faculty,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadButtonText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  fileName: { flex: 1, fontSize: 14, color: COLORS.text, paddingRight: 12 },
  remove: { color: COLORS.danger, fontWeight: '600' },
  sep: { height: 1, backgroundColor: COLORS.border },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});

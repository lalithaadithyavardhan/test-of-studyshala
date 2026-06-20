import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import ScreenScaffold from '../../components/ScreenScaffold';
import { getMaterialFiles, getDownloadUrl, trackRecentFile, starFile } from '../../api/student';
import { API_URL, COLORS } from '../../constants/config';

export default function StudentMaterialAccessScreen({ route }) {
  const { id } = route.params || {};
  const [files, setFiles] = useState([]);
  const [materialName, setMaterialName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMaterialFiles(id);
      setFiles(res.data?.files || []);
      setMaterialName(res.data?.material?.name || res.data?.subjectName || '');
    } catch (err) {
      // swallow — show empty state
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openFile = async (file) => {
    trackRecentFile({
      fileId: file._id || file.id,
      fileName: file.name,
      mimeType: file.mimeType,
      materialId: id,
      subjectName: materialName,
    }).catch(() => {});

    const url = `${API_URL}${getDownloadUrl(id, file._id || file.id)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleStar = (file) => {
    starFile({
      fileId: file._id || file.id,
      fileName: file.name,
      mimeType: file.mimeType,
      materialId: id,
      subjectName: materialName,
    }).catch(() => {});
  };

  if (loading) {
    return (
      <ScreenScaffold title="Materials">
        <ActivityIndicator color={COLORS.primary} />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title={materialName || 'Materials'} subtitle={`${files.length} file(s)`}>
      <FlatList
        data={files}
        keyExtractor={(item) => item._id || item.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity style={styles.fileTouch} onPress={() => openFile(item)}>
              <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.fileMeta}>{item.mimeType}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleStar(item)}>
              <Text style={styles.star}>☆</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No files in this material yet.</Text>}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  fileTouch: { flex: 1, paddingRight: 12 },
  fileName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  fileMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  star: { fontSize: 20, color: COLORS.textMuted },
  sep: { height: 1, backgroundColor: COLORS.border },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});

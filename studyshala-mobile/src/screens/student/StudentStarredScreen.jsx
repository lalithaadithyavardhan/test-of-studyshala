import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenScaffold from '../../components/ScreenScaffold';
import { getStarredFiles, unstarFile, getDownloadUrl } from '../../api/student';
import { API_URL, COLORS } from '../../constants/config';

export default function StudentStarredScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStarredFiles();
      setItems(res.data?.starredFiles || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleUnstar = async (fileId) => {
    try {
      await unstarFile(fileId);
      setItems((prev) => prev.filter((f) => f.fileId !== fileId));
    } catch (e) {}
  };

  if (loading) {
    return (
      <ScreenScaffold title="Starred Files">
        <ActivityIndicator color={COLORS.primary} />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Starred Files" subtitle={`${items.length} starred`}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.fileId}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => {
                const url = `${API_URL}${getDownloadUrl(item.materialId, item.fileId)}`;
                Linking.openURL(url).catch(() => {});
              }}
            >
              <Text style={styles.name} numberOfLines={1}>{item.fileName}</Text>
              <Text style={styles.subject}>{item.subjectName}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleUnstar(item.fileId)}>
              <Text style={styles.remove}>Unstar</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No starred files yet.</Text>}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  subject: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  remove: { color: COLORS.danger, fontWeight: '600' },
  sep: { height: 1, backgroundColor: COLORS.border },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});

import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import ScreenScaffold from '../../components/ScreenScaffold';
import { getAccessHistory } from '../../api/student';
import { COLORS } from '../../constants/config';

export default function StudentHistoryScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAccessHistory();
        setItems(res.data?.accessHistory || []);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <ScreenScaffold title="Access History">
        <ActivityIndicator color={COLORS.primary} />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Access History" subtitle={`${items.length} entries`}>
      <FlatList
        data={items}
        keyExtractor={(item, idx) => String(idx)}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.code}>{item.accessCode}</Text>
            <Text style={styles.date}>{new Date(item.accessedAt).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No access history yet.</Text>}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12 },
  code: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  date: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  sep: { height: 1, backgroundColor: COLORS.border },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});

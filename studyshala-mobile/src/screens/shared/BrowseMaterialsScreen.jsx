import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenScaffold from '../../components/ScreenScaffold';
import { browseFolders } from '../../api/shared';
import { COLORS } from '../../constants/config';

export default function BrowseMaterialsScreen() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        try {
          const res = await browseFolders();
          if (active) setFolders(res.data?.folders || []);
        } catch (e) {
          // ignore — empty state shown
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  if (loading) {
    return (
      <ScreenScaffold title="Browse Materials">
        <ActivityIndicator color={COLORS.primary} />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Browse Materials" subtitle={`${folders.length} available`}>
      <FlatList
        data={folders}
        keyExtractor={(item) => item._id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            {item.facultyName ? <Text style={styles.meta}>{item.facultyName}</Text> : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nothing to browse yet.</Text>}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  sep: { height: 1, backgroundColor: COLORS.border },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});

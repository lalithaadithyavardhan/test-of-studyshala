import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenScaffold from '../../components/ScreenScaffold';
import { getSavedMaterials, removeSavedMaterial } from '../../api/student';
import { COLORS } from '../../constants/config';

export default function StudentSavedMaterialsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSavedMaterials();
      setItems(res.data?.savedMaterials || res.data?.materials || []);
    } catch (e) {
      // ignore — empty state shown
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRemove = async (materialId) => {
    try {
      await removeSavedMaterial(materialId);
      setItems((prev) => prev.filter((m) => (m.materialId?._id || m.materialId) !== materialId));
    } catch (e) {}
  };

  if (loading) {
    return (
      <ScreenScaffold title="Saved Materials">
        <ActivityIndicator color={COLORS.primary} />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Saved Materials" subtitle={`${items.length} saved`}>
      <FlatList
        data={items}
        keyExtractor={(item, idx) => (item.materialId?._id || item.materialId || String(idx))}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          const matId = item.materialId?._id || item.materialId;
          return (
            <View style={styles.row}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('StudentMaterialAccess', { id: matId })}
              >
                <Text style={styles.name}>{item.materialId?.name || 'Material'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleRemove(matId)}>
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Nothing saved yet.</Text>}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  remove: { color: COLORS.danger, fontWeight: '600' },
  sep: { height: 1, backgroundColor: COLORS.border },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});

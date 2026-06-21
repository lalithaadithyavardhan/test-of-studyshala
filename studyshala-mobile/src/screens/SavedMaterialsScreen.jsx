/**
 * screens/SavedMaterialsScreen.jsx
 * ==================================
 * Mirrors studyshalaFrontend's StudentSavedMaterials.jsx.
 * GET /student/saved-materials -> { materials: [...] }
 * DELETE /student/saved-materials/:id
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
import MaterialCard from '../components/MaterialCard';
import { getSavedMaterials, removeSavedMaterial, getMaterialFiles } from '../api/studentApi';

export default function SavedMaterialsScreen({ navigation }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getSavedMaterials();
      setMaterials(data.materials || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load saved materials.');
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

  const handleOpen = async (material) => {
    try {
      const { data } = await getMaterialFiles(material._id);
      const parentNav = navigation.getParent() || navigation;
      parentNav.navigate('MaterialAccess', {
        material: { ...material, ...data.material, files: data.files, subFolders: data.subFolders },
      });
    } catch (e) {
      Alert.alert(
        'Access denied',
        e.response?.data?.message || 'Could not open this material.'
      );
    }
  };

  const handleRemove = (material) => {
    Alert.alert('Remove saved material?', material.subjectName, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeSavedMaterial(material._id);
            setMaterials((prev) => prev.filter((m) => m._id !== material._id));
          } catch (e) {
            Alert.alert('Error', 'Failed to remove material.');
          }
        },
      },
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
        <Text style={styles.title}>Saved Materials</Text>
      </View>
      <FlatList
        data={materials}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <MaterialCard material={item} onPress={handleOpen} onRemove={handleRemove} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="bookmark-outline" size={32} color="#D1D5DB" />
            <Text style={styles.emptyText}>No saved materials yet.</Text>
            <Text style={styles.emptySubtext}>
              Materials you save will appear here for quick access.
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

/**
 * screens/FacultyMaterialsScreen.jsx
 * =====================================
 * Mirrors studyshalaFrontend's FacultyMaterials.jsx — searchable list of
 * all materials this faculty member owns.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCard from '../components/MaterialCard';
import { getFolders, deleteFolder } from '../api/facultyApi';

export default function FacultyMaterialsScreen({ navigation }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await getFolders();
      setMaterials(data.folders || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch materials.');
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

  const handleDelete = (material) => {
    Alert.alert(
      'Delete material?',
      `"${material.subjectName}" and all its files will be removed. Students will lose access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(material._id);
              setMaterials((prev) => prev.filter((m) => m._id !== material._id));
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to delete material.');
            }
          },
        },
      ]
    );
  };

  const filtered = materials.filter((m) => {
    const q = search.toLowerCase();
    return (
      !q ||
      m.subjectName?.toLowerCase().includes(q) ||
      m.facultyName?.toLowerCase().includes(q) ||
      m.department?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0891B2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Materials</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by subject, department…"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <Ionicons
            name="close-circle"
            size={18}
            color="#9CA3AF"
            onPress={() => setSearch('')}
          />
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <MaterialCard
            material={item}
            role="faculty"
            onPress={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat })}
            onUpload={(mat) => navigation.navigate('UploadFiles', { material: mat })}
            onMessage={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat, openMessage: true })}
            onShare={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat, openShare: true })}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="folder-outline" size={32} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {search ? 'No results found' : 'No materials yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {search ? `No materials match "${search}"` : 'Create materials from the Dashboard to see them here'}
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
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    marginHorizontal: 18, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  listContent: { padding: 18, paddingTop: 6 },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginTop: 10 },
  emptySubtext: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
});

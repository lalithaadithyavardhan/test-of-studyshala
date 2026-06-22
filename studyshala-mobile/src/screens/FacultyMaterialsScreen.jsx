/**
 * screens/FacultyMaterialsScreen.jsx — StudyShala Dark Theme
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  ActivityIndicator, Alert, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MaterialCard from '../components/MaterialCard';
import { getFolders, deleteFolder } from '../api/facultyApi';
import { C, R, T } from '../components/theme';

export default function FacultyMaterialsScreen({ navigation }) {
  const [materials, setMaterials]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getFolders();
      setMaterials(data.folders || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch materials.');
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleDelete = (material) => {
    Alert.alert(
      'Delete material?',
      `"${material.subjectName}" and all its files will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(material._id);
              setMaterials((prev) => prev.filter((m) => m._id !== material._id));
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to delete.');
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
      <SafeAreaView style={s.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>My Materials</Text>
          <Text style={s.subtitle}>
            {materials.length} subject{materials.length === 1 ? '' : 's'}
          </Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('CreateMaterial')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={C.accent} />
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={[s.searchWrap, searchFocused && s.searchWrapFocused]}>
        <Ionicons name="search" size={18} color={searchFocused ? C.accent : C.textSecondary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by subject, department…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={C.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <MaterialCard
            material={item}
            role="faculty"
            onPress={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat })}
            onUpload={(mat) => navigation.navigate('UploadFiles', { material: mat })}
            onMessage={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat, openMessage: true })}
            onShare={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat, openShare: true })}
            onDelete={handleDelete}
            dark
          />
        )}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>{search ? '🔍' : '📁'}</Text>
            <Text style={s.emptyTitle}>
              {search ? 'No results found' : 'No materials yet'}
            </Text>
            <Text style={s.emptyDesc}>
              {search
                ? `Nothing matched "${search}". Try a different keyword.`
                : 'Create your first material from the Dashboard.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  // ── Header ──────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title:    { fontSize: T.lg, fontWeight: '700', color: C.textPrimary },
  subtitle: { fontSize: T.xs, color: C.textSecondary, marginTop: 2 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: R.sm,
    backgroundColor: C.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.accent + '40',
  },

  // ── Search ──────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.md,
    marginHorizontal: 18,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  searchWrapFocused: {
    borderColor: C.accent + '80',
    backgroundColor: C.elevated,
  },
  searchInput: {
    flex: 1,
    fontSize: T.base,
    color: C.textPrimary,
  },

  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    flexGrow: 1,
  },

  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    paddingVertical: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 8,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyDesc:  {
    fontSize: T.base, color: C.textMuted,
    textAlign: 'center', paddingHorizontal: 28, lineHeight: 20,
  },
});
/**
 * screens/HistoryScreen.jsx — StudyShala Dark Theme
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MaterialCard from '../components/MaterialCard';
import { getAccessHistory, getMaterialFiles } from '../api/studentApi';
import { C, R, T } from '../components/theme';

export default function HistoryScreen({ navigation }) {
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getAccessHistory();
      setHistory(data.history || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load access history.');
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleOpen = async (material) => {
    try {
      const { data } = await getMaterialFiles(material._id);
      const parentNav = navigation.getParent() || navigation;
      parentNav.navigate('MaterialAccess', {
        material: { ...material, ...data.material, files: data.files, subFolders: data.subFolders },
      });
    } catch (e) {
      Alert.alert('Access denied', e.response?.data?.message || 'Could not open this material.');
    }
  };

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
        <View style={s.headerIconBox}>
          <Ionicons name="time-outline" size={20} color={C.accent} />
        </View>
        <View>
          <Text style={s.title}>Access History</Text>
          <Text style={s.subtitle}>
            {history.length} material{history.length === 1 ? '' : 's'} viewed
          </Text>
        </View>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <MaterialCard material={item} onPress={handleOpen} dark />
        )}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>🕒</Text>
            <Text style={s.emptyTitle}>No history yet</Text>
            <Text style={s.emptyDesc}>
              Materials you access using a code will automatically appear here for easy reference.
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  headerIconBox: {
    width: 42,
    height: 42,
    borderRadius: R.sm,
    backgroundColor: C.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.accent + '40',
  },
  title:    { fontSize: T.lg, fontWeight: '700', color: C.textPrimary },
  subtitle: { fontSize: T.xs, color: C.textSecondary, marginTop: 2 },

  listContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
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
    marginTop: 16,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyDesc:  {
    fontSize: T.base, color: C.textMuted,
    textAlign: 'center', paddingHorizontal: 28, lineHeight: 20,
  },
});
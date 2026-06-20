import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenScaffold from '../../components/ScreenScaffold';
import { getStats, getUsers, deactivateUser, activateUser } from '../../api/admin';
import { COLORS } from '../../constants/config';

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([getStats(), getUsers()]);
      setStats(statsRes.data);
      setUsers(usersRes.data?.users || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleActive = async (user) => {
    try {
      if (user.active) {
        await deactivateUser(user._id);
      } else {
        await activateUser(user._id);
      }
      load();
    } catch (e) {
      Alert.alert('Action failed');
    }
  };

  if (loading) {
    return (
      <ScreenScaffold title="Admin">
        <ActivityIndicator color={COLORS.primary} />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Admin Dashboard">
      {stats && (
        <View style={styles.statsRow}>
          <StatCard label="Users" value={stats.totalUsers ?? stats.userCount} />
          <StatCard label="Materials" value={stats.totalMaterials ?? stats.folderCount} />
          <StatCard label="Faculty" value={stats.facultyCount} />
        </View>
      )}

      <Text style={styles.sectionTitle}>Users</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.email} · {item.role}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleActive(item)}>
              <Text style={item.active ? styles.deactivate : styles.activate}>
                {item.active ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
      />
    </ScreenScaffold>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.admin },
  statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  name: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  deactivate: { color: COLORS.danger, fontWeight: '600' },
  activate: { color: COLORS.success, fontWeight: '600' },
  sep: { height: 1, backgroundColor: COLORS.border },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 20 },
});

/**
 * screens/FacultyDashboardScreen.jsx
 * =====================================
 * Mirrors studyshalaFrontend's FacultyDashboard.jsx — landing screen for
 * faculty with a "Create Material" CTA and a quick list of their materials.
 * Full create/upload/subfolder/message/delete flows live on the screens
 * this one navigates to (CreateMaterial, FacultyMaterialDetail, UploadFiles).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getFolders, deleteFolder } from '../api/facultyApi';
import MaterialCard from '../components/MaterialCard';
import RoleSwitchButton from '../components/RoleSwitchButton';

export default function FacultyDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getFolders();
      setMaterials(data.folders || []);
    } catch (e) {
      // non-critical on first paint
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

  const handleShare = (material) => {
    navigation.navigate('FacultyMaterialDetail', { material, openShare: true });
  };

  const totalFiles = materials.reduce((sum, m) => {
    const root = m.files?.length || 0;
    const sub = (m.subFolders || []).reduce((s, sf) => s + (sf.files?.length || 0), 0);
    return sum + root + sub;
  }, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              Hi, {user?.name?.split(' ')[0] || 'Faculty'} 👋
            </Text>
            <Text style={styles.subGreeting}>{user?.department || 'Faculty'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <RoleSwitchButton targetRole="student" style={{ marginBottom: 18 }} />

        {/* ── Stats strip ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{materials.length}</Text>
            <Text style={styles.statLabel}>Materials</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalFiles}</Text>
            <Text style={styles.statLabel}>Files</Text>
          </View>
        </View>

        {/* ── Create CTA ── */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateMaterial')}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.createBtnText}>Create Material</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Your Materials</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#0891B2" style={{ marginTop: 24 }} />
        ) : materials.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="folder-open-outline" size={28} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              Create your first material to get started.
            </Text>
          </View>
        ) : (
          materials.map((m) => (
            <MaterialCard
              key={m._id}
              material={m}
              role="faculty"
              onPress={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat })}
              onUpload={(mat) => navigation.navigate('UploadFiles', { material: mat })}
              onMessage={(mat) => navigation.navigate('FacultyMaterialDetail', { material: mat, openMessage: true })}
              onShare={handleShare}
              onDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  scrollContent: { padding: 18, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  subGreeting: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  logoutBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 10 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: '800', color: '#0891B2' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0891B2', borderRadius: 14,
    paddingVertical: 15, marginBottom: 22, gap: 8,
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 10 },
  emptyBox: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 28, alignItems: 'center',
  },
  emptyText: { color: '#9CA3AF', fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
});

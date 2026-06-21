/**
 * screens/DashboardScreen.jsx
 * =============================
 * Mirrors studyshalaFrontend's StudentDashboard.jsx — landing screen
 * after login with quick links and a recent-files strip.
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getRecentFiles } from '../api/studentApi';
import FileListItem from '../components/FileListItem';
import { openFile } from '../utils/fileActions';

const QUICK_ACTIONS = [
  { key: 'EnterCode', label: 'Enter Code', icon: 'key', color: '#4F46E5' },
  { key: 'SavedMaterials', label: 'Saved', icon: 'bookmark', color: '#10B981' },
  { key: 'Starred', label: 'Starred', icon: 'star', color: '#F59E0B' },
  { key: 'History', label: 'History', icon: 'time', color: '#8B5CF6' },
];

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [recentFiles, setRecentFiles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecent = useCallback(async () => {
    try {
      const { data } = await getRecentFiles();
      setRecentFiles(data.recentFiles || []);
    } catch (e) {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecent();
    setRefreshing(false);
  };

  const handleRecentFilePress = (file) => {
    // Recent file entries store materialId/subjectName but not the full
    // material object — navigate into MaterialAccess with a minimal stub,
    // which will trigger MaterialAccessScreen's own loadFiles() call.
    openFile(file, { _id: file.materialId, subjectName: file.subjectName });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hi, {user?.name?.split(' ')[0] || 'Student'} 👋
            </Text>
            <Text style={styles.subGreeting}>{user?.department} · Sem {user?.semester || '—'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.quickCard}
              onPress={() => navigation.navigate(action.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconBox, { backgroundColor: `${action.color}1A` }]}>
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recently Viewed</Text>
        {recentFiles.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={28} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              Files you open will show up here.
            </Text>
          </View>
        ) : (
          recentFiles.map((file) => (
            <FileListItem
              key={file.fileId}
              file={{
                _id: file.fileId,
                name: file.fileName,
                mimeType: file.mimeType,
              }}
              onPress={handleRecentFilePress}
              showStar={false}
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
    marginBottom: 22,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  subGreeting: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  logoutBtn: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  quickCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: { color: '#9CA3AF', fontSize: 13, marginTop: 8 },
});

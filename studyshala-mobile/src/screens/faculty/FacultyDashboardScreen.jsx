import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenScaffold from '../../components/ScreenScaffold';
import { getFolders, createFolder } from '../../api/faculty';
import { COLORS } from '../../constants/config';

export default function FacultyDashboardScreen({ navigation }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFolders();
      setFolders(res.data?.folders || []);
    } catch (e) {
      // ignore — empty state shown
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createFolder({ name: newName.trim() });
      setNewName('');
      setModalVisible(false);
      load();
    } catch (err) {
      Alert.alert('Could not create material', err?.response?.data?.message || 'Try again.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <ScreenScaffold title="Faculty Dashboard">
        <ActivityIndicator color={COLORS.primary} />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold title="Faculty Dashboard" subtitle={`${folders.length} material set(s)`}>
      <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.createButtonText}>+ New Material</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('FacultyMaterials')}>
        <Text style={styles.link}>View all my materials →</Text>
      </TouchableOpacity>

      <FlatList
        data={folders}
        keyExtractor={(item) => item._id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('FacultyMaterials', { id: item._id })}
          >
            <Text style={styles.name}>{item.name}</Text>
            {item.accessCode ? <Text style={styles.code}>Code: {item.accessCode}</Text> : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No materials created yet.</Text>}
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Material</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CS301 - Unit 4"
              value={newName}
              onChangeText={setNewName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} disabled={creating}>
                <Text style={styles.confirm}>{creating ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  createButton: {
    backgroundColor: COLORS.faculty,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  createButtonText: { color: '#fff', fontWeight: '600' },
  linkRow: { marginBottom: 16 },
  link: { color: COLORS.primary, fontWeight: '600' },
  row: { paddingVertical: 12 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  code: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  sep: { height: 1, backgroundColor: COLORS.border },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14, color: COLORS.text },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  cancel: { color: COLORS.textMuted, fontWeight: '600' },
  confirm: { color: COLORS.primary, fontWeight: '700' },
});

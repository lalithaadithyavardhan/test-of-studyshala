/**
 * screens/FacultyMaterialDetailScreen.jsx
 * ==========================================
 * Combines studyshalaFrontend's FileManager (browse files/sub-folders),
 * the "Message to Students" modal, and the WhatsApp share flow from
 * FacultyDashboard.jsx — all in one screen since mobile favors push
 * navigation over stacked modals.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FileListItem from '../components/FileListItem';
import {
  getFolderDetails,
  deleteFile,
  deleteSubFolderFile,
  deleteSubFolder,
  updateMessage,
  getFacultyDownloadUrl,
} from '../api/facultyApi';

const APP_URL = 'https://studyshala.dev';

export default function FacultyMaterialDetailScreen({ route, navigation }) {
  const { material: initialMaterial, openMessage, openShare } = route.params;
  const [material, setMaterial] = useState(initialMaterial);
  const [files, setFiles] = useState(initialMaterial.files || []);
  const [subFolders, setSubFolders] = useState(initialMaterial.subFolders || []);
  const [activeFolder, setActiveFolder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [msgModalOpen, setMsgModalOpen] = useState(!!openMessage);
  const [msgText, setMsgText] = useState(initialMaterial.messageToStudents || '');
  const [savingMsg, setSavingMsg] = useState(false);

  const loadDetails = useCallback(async () => {
    try {
      const { data } = await getFolderDetails(initialMaterial._id);
      setMaterial(data.folder);
      setFiles(data.folder.files || []);
      setSubFolders(data.folder.subFolders || []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load material.');
    } finally {
      setLoading(false);
    }
  }, [initialMaterial._id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    if (openShare) {
      const t = setTimeout(() => handleShareWhatsApp(), 200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openShare]);

  const currentFiles = activeFolder ? activeFolder.files : files;

  const handleFilePress = (file) => {
    Alert.alert(file.name, 'What would you like to do?', [
      {
        text: 'Open',
        onPress: () => {
          if (file.previewUrl) Linking.openURL(file.previewUrl);
        },
      },
      {
        text: 'Download',
        onPress: () => {
          const url = file.downloadUrl || getFacultyDownloadUrl(material._id, file._id);
          Linking.openURL(url);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeleteFile(file),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDeleteFile = (file) => {
    Alert.alert('Delete file?', file.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (activeFolder) {
              await deleteSubFolderFile(material._id, activeFolder._id, file._id);
              setActiveFolder((prev) => ({
                ...prev,
                files: prev.files.filter((f) => f._id !== file._id),
              }));
            } else {
              await deleteFile(material._id, file._id);
              setFiles((prev) => prev.filter((f) => f._id !== file._id));
            }
          } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to delete file.');
          }
        },
      },
    ]);
  };

  const handleDeleteSubFolder = (sf) => {
    Alert.alert('Delete folder?', `"${sf.name}" and all its files will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubFolder(material._id, sf._id);
            setSubFolders((prev) => prev.filter((s) => s._id !== sf._id));
          } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to delete folder.');
          }
        },
      },
    ]);
  };

  const handleSaveMessage = async () => {
    setSavingMsg(true);
    try {
      await updateMessage(material._id, msgText);
      setMaterial((prev) => ({ ...prev, messageToStudents: msgText }));
      setMsgModalOpen(false);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save message.');
    } finally {
      setSavingMsg(false);
    }
  };

  const handleShareWhatsApp = () => {
    const code = material.accessCode || material.departmentCode || '—';
    const subject = material.subjectName || 'Study Material';
    const faculty = material.facultyName || '';
    const dept = material.department || '';
    const sem = material.semester ? `Semester ${material.semester}` : '';
    const msg =
      `📚 *${subject}*\n` +
      (faculty ? `👨‍🏫 Faculty: ${faculty}\n` : '') +
      (dept ? `🏫 Department: ${dept}\n` : '') +
      (sem ? `📅 ${sem}\n` : '') +
      `\n🔑 *Access Code: \`${code}\`*\n\n` +
      `Open StudyShala, go to *Enter Code* and enter the above code to access the material.\n\n` +
      `🔗 Login at: ${APP_URL}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed.');
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0891B2" />
      </SafeAreaView>
    );
  }

  const code = material.accessCode || material.departmentCode;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (activeFolder ? setActiveFolder(null) : navigation.goBack())}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {activeFolder ? activeFolder.name : material.subjectName}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {material.department} · Sem {material.semester}
          </Text>
        </View>
      </View>

      {!activeFolder && (
        <>
          {!!code && (
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Access Code</Text>
              <Text style={styles.codeValue}>{code}</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionChip} onPress={() => navigation.navigate('UploadFiles', { material })}>
              <Ionicons name="cloud-upload-outline" size={16} color="#0891B2" />
              <Text style={styles.actionChipText}>Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionChip} onPress={() => setMsgModalOpen(true)}>
              <Ionicons name="megaphone-outline" size={16} color="#92400E" />
              <Text style={[styles.actionChipText, { color: '#92400E' }]}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionChip} onPress={handleShareWhatsApp}>
              <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
              <Text style={[styles.actionChipText, { color: '#16A34A' }]}>Share</Text>
            </TouchableOpacity>
          </View>

          {!!material.messageToStudents?.trim() && (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>💬 {material.messageToStudents}</Text>
            </View>
          )}
        </>
      )}

      <FlatList
        data={[
          ...(!activeFolder ? subFolders.map((sf) => ({ ...sf, __isFolder: true })) : []),
          ...currentFiles,
        ]}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) =>
          item.__isFolder ? (
            <View style={styles.folderRow}>
              <TouchableOpacity
                style={styles.folderRowMain}
                onPress={() => setActiveFolder(item)}
                activeOpacity={0.7}
              >
                <View style={styles.folderIconBox}>
                  <Ionicons name="folder" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.folderName}>{item.name}</Text>
                  <Text style={styles.folderMeta}>{item.fileCount} files</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteSubFolder(item)}
                style={styles.folderDeleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={17} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <FileListItem file={item} onPress={handleFilePress} showStar={false} onDeletePress={handleDeleteFile} />
          )
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No files in this folder yet.</Text>}
      />

      {/* ── Message modal ── */}
      <Modal visible={msgModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Message to Students</Text>
              <TouchableOpacity onPress={() => setMsgModalOpen(false)}>
                <Ionicons name="close" size={22} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>Shown to students whenever they access this material.</Text>
            <TextInput
              style={styles.modalTextarea}
              value={msgText}
              onChangeText={setMsgText}
              placeholder="e.g., Unit 2 exam next week. Assignment deadline Sunday midnight."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              maxLength={2000}
            />
            <Text style={styles.charCount}>{msgText.length}/2000</Text>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setMsgModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveMessage} disabled={savingMsg}>
                {savingMsg ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6FB' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff',
  },
  backBtn: { padding: 6, marginRight: 4 },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  subtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  codeBox: {
    backgroundColor: '#fff', marginHorizontal: 14, marginTop: 12,
    borderRadius: 12, padding: 12, alignItems: 'center',
  },
  codeLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  codeValue: { fontFamily: 'monospace', fontSize: 18, fontWeight: '800', color: '#0891B2', letterSpacing: 2 },
  actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginTop: 12 },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
  },
  actionChipText: { fontSize: 12, fontWeight: '700', color: '#0891B2' },
  messageBox: {
    backgroundColor: '#EEF2FF', marginHorizontal: 14, marginTop: 12,
    borderRadius: 10, padding: 10,
  },
  messageText: { fontSize: 13, color: '#4338CA' },
  listContent: { padding: 14 },
  folderRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 8,
  },
  folderRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
  folderIconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFFBEB',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  folderName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  folderMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  folderDeleteBtn: { paddingHorizontal: 14 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  modalHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  modalTextarea: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#1F2937', minHeight: 110, textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4, marginBottom: 14 },
  modalFooter: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 12, backgroundColor: '#F3F4F6' },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  modalSaveBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 12, backgroundColor: '#0891B2' },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

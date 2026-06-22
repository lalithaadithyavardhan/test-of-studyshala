/**
 * screens/FacultyMaterialDetailScreen.jsx — StudyShala Dark Theme
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FileListItem from '../components/FileListItem';
import {
  getFolderDetails, deleteFile, deleteSubFolderFile, deleteSubFolder,
  updateMessage, getFacultyDownloadUrl,
} from '../api/facultyApi';
import { C, R, T } from '../components/theme';

const APP_URL = 'https://studyshala.dev';

export default function FacultyMaterialDetailScreen({ route, navigation }) {
  const { material: initialMaterial, openMessage, openShare } = route.params;
  const [material,     setMaterial]     = useState(initialMaterial);
  const [files,        setFiles]        = useState(initialMaterial.files || []);
  const [subFolders,   setSubFolders]   = useState(initialMaterial.subFolders || []);
  const [activeFolder, setActiveFolder] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [msgModalOpen, setMsgModalOpen] = useState(!!openMessage);
  const [msgText,      setMsgText]      = useState(initialMaterial.messageToStudents || '');
  const [savingMsg,    setSavingMsg]    = useState(false);

  const loadDetails = useCallback(async () => {
    try {
      const { data } = await getFolderDetails(initialMaterial._id);
      setMaterial(data.folder);
      setFiles(data.folder.files || []);
      setSubFolders(data.folder.subFolders || []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load material.');
    } finally { setLoading(false); }
  }, [initialMaterial._id]);

  useEffect(() => { loadDetails(); }, [loadDetails]);
  useEffect(() => {
    if (openShare) {
      const t = setTimeout(() => handleShareWhatsApp(), 200);
      return () => clearTimeout(t);
    }
  }, [openShare]);

  const currentFiles = activeFolder ? activeFolder.files : files;

  const handleFilePress = (file) => {
    Alert.alert(file.name, 'What would you like to do?', [
      { text: 'Open', onPress: () => { if (file.previewUrl) Linking.openURL(file.previewUrl); } },
      { text: 'Download', onPress: () => { Linking.openURL(file.downloadUrl || getFacultyDownloadUrl(material._id, file._id)); } },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteFile(file) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDeleteFile = (file) => {
    Alert.alert('Delete file?', file.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            if (activeFolder) {
              await deleteSubFolderFile(material._id, activeFolder._id, file._id);
              setActiveFolder((prev) => ({ ...prev, files: prev.files.filter((f) => f._id !== file._id) }));
            } else {
              await deleteFile(material._id, file._id);
              setFiles((prev) => prev.filter((f) => f._id !== file._id));
            }
          } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to delete.'); }
        },
      },
    ]);
  };

  const handleDeleteSubFolder = (sf) => {
    Alert.alert('Delete folder?', `"${sf.name}" and all its files will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubFolder(material._id, sf._id);
            setSubFolders((prev) => prev.filter((s) => s._id !== sf._id));
          } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to delete folder.'); }
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
    } finally { setSavingMsg(false); }
  };

  const handleShareWhatsApp = () => {
    const code    = material.accessCode || material.departmentCode || '—';
    const subject = material.subjectName || 'Study Material';
    const faculty = material.facultyName || '';
    const dept    = material.department || '';
    const sem     = material.semester ? `Semester ${material.semester}` : '';
    const msg =
      `📚 *${subject}*\n` +
      (faculty ? `👨‍🏫 Faculty: ${faculty}\n` : '') +
      (dept    ? `🏫 Department: ${dept}\n`    : '') +
      (sem     ? `📅 ${sem}\n`                 : '') +
      `\n🔑 *Access Code: \`${code}\`*\n\n` +
      `Open StudyShala → Enter Code and type the above code.\n\n🔗 ${APP_URL}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('Error', 'WhatsApp is not installed.')
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  const code = material.accessCode || material.departmentCode;

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => activeFolder ? setActiveFolder(null) : navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {activeFolder ? activeFolder.name : material.subjectName}
          </Text>
          <Text style={s.subtitle}>{material.department} · Sem {material.semester}</Text>
        </View>
      </View>

      {!activeFolder && (
        <>
          {/* ── Access code card ── */}
          {!!code && (
            <View style={s.codeCard}>
              <View>
                <Text style={s.codeLabel}>Student Access Code</Text>
                <Text style={s.codeValue}>{code}</Text>
              </View>
              <View style={s.codeIconBox}>
                <Ionicons name="key" size={22} color={C.accent} />
              </View>
            </View>
          )}

          {/* ── Action chips ── */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.actionChip}
              onPress={() => navigation.navigate('UploadFiles', { material })}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={C.accent} />
              <Text style={[s.actionChipText, { color: C.accent }]}>Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionChip}
              onPress={() => setMsgModalOpen(true)}
            >
              <Ionicons name="megaphone-outline" size={16} color={C.warning} />
              <Text style={[s.actionChipText, { color: C.warning }]}>Announce</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionChip}
              onPress={handleShareWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
              <Text style={[s.actionChipText, { color: '#25D366' }]}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* ── Announcement preview ── */}
          {!!material.messageToStudents && (
            <View style={s.announcementBox}>
              <Ionicons name="megaphone-outline" size={15} color={C.accent} />
              <Text style={s.announcementText} numberOfLines={2}>
                {material.messageToStudents}
              </Text>
            </View>
          )}
        </>
      )}

      {/* ── File/folder list ── */}
      <FlatList
        data={[
          ...(!activeFolder ? subFolders.map((sf) => ({ ...sf, __isFolder: true })) : []),
          ...currentFiles,
        ]}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) =>
          item.__isFolder ? (
            <View style={s.folderCard}>
              <TouchableOpacity
                style={s.folderCardMain}
                onPress={() => setActiveFolder(item)}
                activeOpacity={0.8}
              >
                <View style={s.folderIconBox}>
                  <Ionicons name="folder" size={22} color={C.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.folderName}>{item.name}</Text>
                  <Text style={s.folderMeta}>{item.fileCount ?? item.files?.length ?? 0} files</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={C.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteSubFolder(item)}
                style={s.folderDeleteBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={17} color={C.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <FileListItem
              file={item}
              onPress={handleFilePress}
              showStar={false}
              onDeletePress={handleDeleteFile}
              dark
            />
          )
        }
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>📂</Text>
            <Text style={s.emptyTitle}>No files yet</Text>
            <Text style={s.emptyDesc}>Upload files to share them with your students.</Text>
          </View>
        }
      />

      {/* ── Announce Modal ── */}
      <Modal visible={msgModalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <SafeAreaView style={s.modalCard} edges={['bottom']}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Announce to Students</Text>
                <Text style={s.modalHint}>Shown every time students open this material</Text>
              </View>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setMsgModalOpen(false)}>
                <Ionicons name="close" size={18} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.modalTextarea}
              value={msgText}
              onChangeText={setMsgText}
              placeholder="e.g. Unit 2 exam next week. Assignment due Sunday midnight."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={5}
              maxLength={2000}
            />
            <Text style={s.charCount}>{msgText.length}/2000</Text>
            <View style={s.modalFooter}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setMsgModalOpen(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSaveBtn} onPress={handleSaveMessage} disabled={savingMsg}>
                {savingMsg
                  ? <ActivityIndicator color={C.white} size="small" />
                  : <Text style={s.modalSaveText}>Save Message</Text>
                }
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontSize: T.base + 2, fontWeight: '700', color: C.textPrimary },
  subtitle: { fontSize: T.xs, color: C.textSecondary, marginTop: 2 },

  // Code card
  codeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.accentBg, marginHorizontal: 16, marginTop: 14,
    borderRadius: R.md, padding: 16,
    borderWidth: 1, borderColor: C.accent + '40',
  },
  codeLabel: { fontSize: T.xs, fontWeight: '700', color: C.accent, marginBottom: 4, letterSpacing: 0.5 },
  codeValue: {
    fontSize: T.xxl, fontWeight: '800', color: C.textPrimary, letterSpacing: 4,
    fontFamily: 'monospace',
  },
  codeIconBox: {
    width: 44, height: 44, borderRadius: R.md,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },

  // Action row
  actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
  actionChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, borderRadius: R.sm, paddingVertical: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  actionChipText: { fontSize: T.sm, fontWeight: '700' },

  // Announcement
  announcementBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.accentBg, marginHorizontal: 16, marginTop: 10,
    borderRadius: R.sm, padding: 12, gap: 8,
    borderWidth: 1, borderColor: C.accent + '30',
  },
  announcementText: { flex: 1, fontSize: T.base, color: C.accent, lineHeight: 18 },

  listContent: { padding: 16, paddingBottom: 32 },

  folderCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.md,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  folderCardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
  folderIconBox: {
    width: 44, height: 44, borderRadius: R.md,
    backgroundColor: C.elevated, alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1, borderColor: C.border,
  },
  folderName: { fontSize: T.base, fontWeight: '700', color: C.textPrimary },
  folderMeta: { fontSize: T.xs, color: C.textMuted, marginTop: 2 },
  folderDeleteBtn: { paddingHorizontal: 14 },

  emptyBox:   { alignItems: 'center', paddingTop: 50 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.base + 2, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  emptyDesc:  { fontSize: T.base, color: C.textMuted, textAlign: 'center', paddingHorizontal: 40 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingTop: 0,
    borderTopWidth: 1, borderColor: C.border,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center', marginTop: 10, marginBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14,
  },
  modalTitle: { fontSize: T.base + 3, fontWeight: '800', color: C.textPrimary },
  modalHint:  { fontSize: T.xs, color: C.textMuted, marginTop: 2 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: R.xs,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTextarea: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: R.md,
    padding: 14, fontSize: T.base, color: C.textPrimary,
    backgroundColor: C.bg,
    minHeight: 120, textAlignVertical: 'top',
  },
  charCount: { fontSize: T.xs, color: C.textMuted, textAlign: 'right', marginTop: 4, marginBottom: 16 },
  modalFooter: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderRadius: R.md, backgroundColor: C.elevated,
    borderWidth: 1, borderColor: C.border,
  },
  modalCancelText: { fontSize: T.md, fontWeight: '700', color: C.textSecondary },
  modalSaveBtn: { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: R.md, backgroundColor: C.accent },
  modalSaveText: { fontSize: T.md, fontWeight: '700', color: C.white },
});

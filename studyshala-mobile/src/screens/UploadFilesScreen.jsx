/**
 * screens/UploadFilesScreen.jsx — StudyShala Dark Theme
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFiles, uploadFilesToSubFolder, createSubFolder } from '../api/facultyApi';
import { MAX_FILE_SIZE_BYTES } from '../config/config';
import { formatFileSize } from '../components/FileListItem';
import { C, R, T } from '../components/theme';

// File type → icon config (using dark-safe colors)
const FILE_TYPE_ICON = (mimeType = '') => {
  if (mimeType.includes('pdf'))                                    return { icon: 'document-text', color: '#E07A5F' };
  if (mimeType.includes('image'))                                  return { icon: 'image',         color: '#4caf7d' };
  if (mimeType.includes('video'))                                  return { icon: 'videocam',      color: '#9c8ff5' };
  if (mimeType.includes('word') || mimeType.includes('doc'))       return { icon: 'document',      color: '#9c8ff5' };
  if (mimeType.includes('sheet') || mimeType.includes('excel'))    return { icon: 'grid',          color: '#4caf7d' };
  if (mimeType.includes('zip') || mimeType.includes('rar'))        return { icon: 'archive',       color: '#e8a23a' };
  return { icon: 'document-outline', color: C.textSecondary };
};

export default function UploadFilesScreen({ route, navigation }) {
  const { material } = route.params;
  const [subFolders,     setSubFolders]     = useState(material.subFolders || []);
  const [selectedSfId,   setSelectedSfId]   = useState('');
  const [newSfName,      setNewSfName]      = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [files,          setFiles]          = useState([]);
  const [uploading,      setUploading]      = useState(false);
  const [progress,       setProgress]       = useState(0);

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: '*/*' });
      if (result.canceled) return;
      const picked = (result.assets || []).filter((f) => {
        if (f.size && f.size > MAX_FILE_SIZE_BYTES) {
          Alert.alert('File too large', `${f.name} exceeds the 50 MB limit.`);
          return false;
        }
        return true;
      });
      setFiles((prev) => [...prev, ...picked]);
    } catch (e) { Alert.alert('Error', 'Could not open file picker.'); }
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleCreateSubFolder = async () => {
    if (!newSfName.trim()) return;
    setCreatingFolder(true);
    try {
      const { data } = await createSubFolder(material._id, newSfName.trim());
      const newSf = data.subFolder;
      setSubFolders((prev) => [...prev, newSf]);
      setSelectedSfId(newSf._id);
      setNewSfName('');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create folder.');
    } finally { setCreatingFolder(false); }
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true); setProgress(0);
    try {
      const onUploadProgress = (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded * 100) / evt.total));
      };
      if (selectedSfId) {
        await uploadFilesToSubFolder(material._id, selectedSfId, files, onUploadProgress);
      } else {
        await uploadFiles(material._id, files, null, onUploadProgress);
      }
      Alert.alert('Uploaded! 🎉', `${files.length} file(s) uploaded successfully.`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Upload failed', e.response?.data?.message || 'Please try again.');
    } finally { setUploading(false); setProgress(0); }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()} disabled={uploading}>
          <Ionicons name="close" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>Upload Files</Text>
          <Text style={s.headerSub} numberOfLines={1}>{material.subjectName}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <Text style={s.hint}>📎 Max 50 MB per file · PDF, DOC, PPT, XLS, images, video, ZIP</Text>

        {/* ── Destination chips ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Upload destination</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[s.destChip, !selectedSfId && s.destChipActive]}
              onPress={() => setSelectedSfId('')}
            >
              <Text style={[s.destChipText, !selectedSfId && s.destChipTextActive]}>
                📂 Root folder
              </Text>
            </TouchableOpacity>
            {subFolders.map((sf) => (
              <TouchableOpacity
                key={sf._id}
                style={[s.destChip, selectedSfId === sf._id && s.destChipActive]}
                onPress={() => setSelectedSfId(sf._id)}
              >
                <Text style={[s.destChipText, selectedSfId === sf._id && s.destChipTextActive]}>
                  📁 {sf.name}{sf.files?.length ? ` (${sf.files.length})` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── New subfolder ── */}
        <View style={s.sfRow}>
          <TextInput
            style={s.sfInput}
            placeholder="New folder name, e.g. Unit 1"
            placeholderTextColor={C.textMuted}
            value={newSfName}
            onChangeText={setNewSfName}
            maxLength={60}
          />
          <TouchableOpacity
            style={[s.sfBtn, !newSfName.trim() && s.sfBtnDisabled]}
            onPress={handleCreateSubFolder}
            disabled={!newSfName.trim() || creatingFolder}
          >
            {creatingFolder
              ? <ActivityIndicator size="small" color={C.accent} />
              : <Text style={s.sfBtnText}>+ Create</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Drop zone ── */}
        <TouchableOpacity style={s.dropzone} onPress={pickFiles} activeOpacity={0.8}>
          <View style={s.dropzoneIconBox}>
            <Ionicons name="cloud-upload-outline" size={36} color={C.accent} />
          </View>
          <Text style={s.dropzoneTitle}>Tap to choose files</Text>
          <Text style={s.dropzoneSub}>Any file type · up to 50 MB each</Text>
        </TouchableOpacity>

        {/* ── File list ── */}
        {files.length > 0 && (
          <View style={s.fileListCard}>
            <View style={s.fileListHeader}>
              <Text style={s.fileListTitle}>
                {files.length} file{files.length !== 1 ? 's' : ''} · {formatFileSize(totalSize)}
              </Text>
              <TouchableOpacity onPress={() => setFiles([])}>
                <Text style={s.clearAll}>Clear all</Text>
              </TouchableOpacity>
            </View>
            {files.map((f, i) => {
              const { icon, color } = FILE_TYPE_ICON(f.mimeType);
              return (
                <View key={`${f.uri}-${i}`} style={s.fileRow}>
                  <View style={[s.fileIconBox, { backgroundColor: C.elevated }]}>
                    <Ionicons name={icon} size={18} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fileName} numberOfLines={1}>{f.name}</Text>
                    <Text style={s.fileSize}>{formatFileSize(f.size)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeFile(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={s.footer}>
        {uploading && (
          <View style={s.progressWrap}>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={s.progressText}>{progress}% uploaded</Text>
          </View>
        )}
        <TouchableOpacity
          style={[s.uploadBtn, (!files.length || uploading) && s.uploadBtnDisabled]}
          onPress={handleUpload}
          disabled={!files.length || uploading}
        >
          {uploading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color={C.white} />
              <Text style={s.uploadBtnText}>
                Upload {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Files'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: T.base + 3, fontWeight: '800', color: C.textPrimary },
  headerSub:   { fontSize: T.xs, color: C.textSecondary, marginTop: 2 },

  scrollContent: { padding: 18, paddingBottom: 20 },
  hint: { fontSize: T.xs, color: C.textMuted, marginBottom: 20, lineHeight: 16 },

  section:      { marginBottom: 14 },
  sectionLabel: { fontSize: T.base, fontWeight: '700', color: C.textPrimary, marginBottom: 10 },
  destChip: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.pill, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8,
  },
  destChipActive:     { backgroundColor: C.accentBg, borderColor: C.accent },
  destChipText:       { fontSize: T.base, fontWeight: '600', color: C.textSecondary },
  destChipTextActive: { color: C.accent },

  sfRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  sfInput: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: T.base, color: C.textPrimary,
  },
  sfBtn: {
    backgroundColor: C.accentBg, borderWidth: 1.5, borderColor: C.accent + '50',
    borderRadius: R.md, paddingHorizontal: 16, justifyContent: 'center',
  },
  sfBtnDisabled: { opacity: 0.45 },
  sfBtnText:     { fontSize: T.base, fontWeight: '700', color: C.accent },

  dropzone: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderStyle: 'dashed', borderRadius: R.xl,
    paddingVertical: 32, alignItems: 'center', marginBottom: 20,
  },
  dropzoneIconBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: C.elevated, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 1, borderColor: C.border,
  },
  dropzoneTitle: { fontSize: T.base + 2, fontWeight: '700', color: C.accent },
  dropzoneSub:   { fontSize: T.xs, color: C.textMuted, marginTop: 4 },

  fileListCard: {
    backgroundColor: C.surface, borderRadius: R.md,
    padding: 16, borderWidth: 1, borderColor: C.border,
  },
  fileListHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  fileListTitle: { fontSize: T.base, fontWeight: '700', color: C.textSecondary },
  clearAll:      { fontSize: T.base, fontWeight: '700', color: C.danger },
  fileRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12,
  },
  fileIconBox: {
    width: 38, height: 38, borderRadius: R.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  fileName: { fontSize: T.base, fontWeight: '600', color: C.textPrimary },
  fileSize: { fontSize: T.xs, color: C.textMuted, marginTop: 2 },

  footer: {
    padding: 16, backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  progressWrap: { marginBottom: 10 },
  progressBg: { height: 6, backgroundColor: C.elevated, borderRadius: R.pill, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: C.accent, borderRadius: R.pill },
  progressText: { fontSize: T.xs, color: C.accent, fontWeight: '600', textAlign: 'right' },

  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: C.accent, borderRadius: R.md, paddingVertical: 16,
  },
  uploadBtnDisabled: { opacity: 0.45 },
  uploadBtnText: { color: C.white, fontSize: T.base + 2, fontWeight: '700' },
});

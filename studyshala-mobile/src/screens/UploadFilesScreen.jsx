/**
 * screens/UploadFilesScreen.jsx
 * ================================
 * Mirrors the "Upload Files" modal in studyshalaFrontend's
 * FacultyDashboard.jsx: pick a destination (root or sub-folder, with the
 * option to create a new sub-folder inline), pick files, upload with a
 * progress bar. Uses expo-document-picker (camera comes later, per scope).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFiles, uploadFilesToSubFolder, createSubFolder } from '../api/facultyApi';
import { MAX_FILE_SIZE_BYTES } from '../config/config';
import { formatFileSize } from '../components/FileListItem';

export default function UploadFilesScreen({ route, navigation }) {
  const { material } = route.params;
  const [subFolders, setSubFolders] = useState(material.subFolders || []);
  const [selectedSfId, setSelectedSfId] = useState('');
  const [newSfName, setNewSfName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: '*/*',
      });
      if (result.canceled) return;

      const picked = (result.assets || []).filter((f) => {
        if (f.size && f.size > MAX_FILE_SIZE_BYTES) {
          Alert.alert('File too large', `${f.name} exceeds the 50 MB limit.`);
          return false;
        }
        return true;
      });
      setFiles((prev) => [...prev, ...picked]);
    } catch (e) {
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setProgress(0);
    try {
      const onUploadProgress = (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded * 100) / evt.total));
      };

      if (selectedSfId) {
        await uploadFilesToSubFolder(material._id, selectedSfId, files, onUploadProgress);
      } else {
        await uploadFiles(material._id, files, null, onUploadProgress);
      }

      Alert.alert('Uploaded', `${files.length} file(s) uploaded successfully.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Upload failed', e.response?.data?.message || 'Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={uploading} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Upload — {material.subjectName}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.hint}>Max 50 MB per file · PDF, DOC, PPT, XLS, images, video, ZIP</Text>

        {/* ── Destination ── */}
        <View style={styles.field}>
          <Text style={styles.label}>
            <Ionicons name="folder-outline" size={13} /> Upload destination
          </Text>
          <View style={styles.destRow}>
            <TouchableOpacity
              style={[styles.destChip, !selectedSfId && styles.destChipActive]}
              onPress={() => setSelectedSfId('')}
            >
              <Text style={[styles.destChipText, !selectedSfId && styles.destChipTextActive]}>
                📂 Root
              </Text>
            </TouchableOpacity>
            {subFolders.map((sf) => (
              <TouchableOpacity
                key={sf._id}
                style={[styles.destChip, selectedSfId === sf._id && styles.destChipActive]}
                onPress={() => setSelectedSfId(sf._id)}
              >
                <Text style={[styles.destChipText, selectedSfId === sf._id && styles.destChipTextActive]}>
                  📁 {sf.name} ({sf.files?.length || 0})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Create new subfolder ── */}
        <View style={styles.sfCreateRow}>
          <TextInput
            style={styles.sfInput}
            placeholder="New folder name (e.g. Unit 1)"
            placeholderTextColor="#9CA3AF"
            value={newSfName}
            onChangeText={setNewSfName}
            maxLength={60}
          />
          <TouchableOpacity
            style={[styles.sfCreateBtn, !newSfName.trim() && styles.sfCreateBtnDisabled]}
            onPress={handleCreateSubFolder}
            disabled={!newSfName.trim() || creatingFolder}
          >
            {creatingFolder ? (
              <ActivityIndicator size="small" color="#0891B2" />
            ) : (
              <Text style={styles.sfCreateBtnText}>+ Create</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Pick files ── */}
        <TouchableOpacity style={styles.dropzone} onPress={pickFiles} activeOpacity={0.8}>
          <Ionicons name="cloud-upload-outline" size={32} color="#0891B2" />
          <Text style={styles.dropzoneText}>Tap to choose files</Text>
        </TouchableOpacity>

        {files.length > 0 && (
          <View style={styles.fileList}>
            <View style={styles.fileListHeader}>
              <Text style={styles.fileListHeaderText}>
                {files.length} file{files.length !== 1 ? 's' : ''} · {formatFileSize(totalSize)}
              </Text>
              <TouchableOpacity onPress={() => setFiles([])}>
                <Text style={styles.clearAll}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {files.map((f, i) => (
              <View key={`${f.uri}-${i}`} style={styles.fileRow}>
                <Ionicons name="document-outline" size={18} color="#6B7280" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(f.size)}</Text>
                </View>
                <TouchableOpacity onPress={() => removeFile(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {uploading && (
          <View style={styles.progressWrap}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.submitBtn, (!files.length || uploading) && styles.submitBtnDisabled]}
          onPress={handleUpload}
          disabled={!files.length || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Upload {files.length || ''} file(s)</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  closeBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#1F2937', marginHorizontal: 8 },
  scrollContent: { padding: 18, paddingBottom: 40 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 18 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  destRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  destChip: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
  },
  destChipActive: { backgroundColor: '#0891B2', borderColor: '#0891B2' },
  destChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  destChipTextActive: { color: '#fff' },
  sfCreateRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  sfInput: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#1F2937',
  },
  sfCreateBtn: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center',
  },
  sfCreateBtnDisabled: { opacity: 0.5 },
  sfCreateBtnText: { fontSize: 12, fontWeight: '700', color: '#0891B2' },
  dropzone: {
    backgroundColor: '#ECFEFF', borderWidth: 2, borderColor: '#A5F3FC', borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 30, alignItems: 'center', marginBottom: 14,
  },
  dropzoneText: { fontSize: 13, fontWeight: '600', color: '#0891B2', marginTop: 8 },
  fileList: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  fileListHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  fileListHeaderText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  clearAll: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  fileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  fileName: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  fileSize: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  progressWrap: { marginBottom: 10 },
  progressBarBg: { height: 6, backgroundColor: '#E0F2FE', borderRadius: 99, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#0891B2', borderRadius: 99 },
  progressText: { fontSize: 11, color: '#0369A1', marginTop: 4, textAlign: 'right', fontWeight: '600' },
  submitBtn: { backgroundColor: '#0891B2', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

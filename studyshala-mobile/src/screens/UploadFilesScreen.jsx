/**
 * screens/UploadFilesScreen.jsx — StudyShala
 * Warm dark theme matching StudentDashboard
 *   bg #13120f · surface #1e1c19 · accent #DE7356
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

// ─── Theme (matches StudentDashboard) ────────────────────────────────────────
const C = {
  bg:           '#13120f',
  surface:      '#1e1c19',
  surface2:     '#252320',
  elevated:     '#2a2724',
  border:       '#2e2c28',
  borderSub:    '#2a2724',
  accent:       '#DE7356',
  accentBg:     'rgba(222,115,86,0.09)',
  accentBorder: 'rgba(222,115,86,0.25)',
  secondary:    '#B1ADA1',
  secondaryBg:  'rgba(177,173,161,0.09)',
  secondaryBdr: 'rgba(177,173,161,0.25)',
  textPrimary:  '#e8e4de',
  textSec:      '#b1ada1',
  textMuted:    '#6b6760',
  white:        '#ffffff',
  success:      '#4ade80',
  danger:       '#f87171',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18 };

// ─── File type → icon ─────────────────────────────────────────────────────────
const fileTypeConfig = (mimeType = '') => {
  if (mimeType.includes('pdf'))                                 return { icon: 'document-text',  color: '#E07A5F', label: 'PDF'   };
  if (mimeType.includes('image'))                               return { icon: 'image',           color: '#4caf7d', label: 'Image' };
  if (mimeType.includes('video'))                               return { icon: 'videocam',        color: '#9c8ff5', label: 'Video' };
  if (mimeType.includes('word') || mimeType.includes('doc'))    return { icon: 'document',        color: '#7da7d9', label: 'Word'  };
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return { icon: 'grid',            color: '#4caf7d', label: 'Excel' };
  if (mimeType.includes('ppt') || mimeType.includes('present')) return { icon: 'easel',           color: '#e8a23a', label: 'PPT'   };
  if (mimeType.includes('zip') || mimeType.includes('rar'))     return { icon: 'archive',         color: '#b1ada1', label: 'ZIP'   };
  return { icon: 'document-outline', color: C.textSec, label: 'File' };
};

// ─── Folder card (destination selector) ──────────────────────────────────────
function FolderCard({ folder, selected, onPress }) {
  const isRoot = !folder; // null = root
  return (
    <TouchableOpacity
      style={[s.folderCard, selected && s.folderCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[s.folderCardIcon, selected && s.folderCardIconSelected]}>
        <Ionicons
          name={isRoot ? 'folder' : 'folder-open'}
          size={20}
          color={selected ? C.accent : C.textSec}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.folderCardName, selected && s.folderCardNameSelected]} numberOfLines={1}>
          {isRoot ? 'Root folder' : folder.name}
        </Text>
        <Text style={s.folderCardSub}>
          {isRoot ? 'Files visible at top level' : `${folder.files?.length ?? 0} file${folder.files?.length !== 1 ? 's' : ''}`}
        </Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={18} color={C.accent} />}
    </TouchableOpacity>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function UploadFilesScreen({ route, navigation }) {
  const { material } = route.params;

  const [subFolders,     setSubFolders]     = useState(material.subFolders || []);
  const [selectedSfId,   setSelectedSfId]   = useState('');   // '' = root
  const [newSfName,      setNewSfName]      = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showNewFolder,  setShowNewFolder]  = useState(false);
  const [files,          setFiles]          = useState([]);
  const [uploading,      setUploading]      = useState(false);
  const [progress,       setProgress]       = useState(0);

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

  // ── Pick files ──
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
          Alert.alert('File too large', `"${f.name}" exceeds the 50 MB limit.`);
          return false;
        }
        return true;
      });
      setFiles((prev) => {
        // Deduplicate by name
        const existingNames = new Set(prev.map((f) => f.name));
        return [...prev, ...picked.filter((f) => !existingNames.has(f.name))];
      });
    } catch {
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  // ── Create subfolder ──
  const handleCreateSubFolder = async () => {
    if (!newSfName.trim()) return;
    setCreatingFolder(true);
    try {
      const { data } = await createSubFolder(material._id, newSfName.trim());

      // API responses vary — handle both shapes:
      //   { subFolder: { _id, name, files } }
      //   { folder: { _id, name, files } }
      //   { _id, name, files }  (root-level)
      const raw = data.subFolder || data.folder || data;
      const newSf = {
        _id:   raw._id   || raw.id,
        name:  raw.name  || newSfName.trim(),
        files: Array.isArray(raw.files) ? raw.files : [],
      };

      setSubFolders((prev) => [...prev, newSf]);
      setSelectedSfId(newSf._id);
      setNewSfName('');
      setShowNewFolder(false);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create folder.');
    } finally {
      setCreatingFolder(false);
    }
  };

  // ── Upload ──
  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setProgress(0);
    try {
      const onUploadProgress = (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded * 100) / evt.total));
      };

      let uploadedFileObjects = [];

      if (selectedSfId) {
        const res = await uploadFilesToSubFolder(material._id, selectedSfId, files, onUploadProgress);
        // Try to get the uploaded file list back from the API response
        uploadedFileObjects = res?.data?.files || res?.data?.uploadedFiles || [];
      } else {
        const res = await uploadFiles(material._id, files, null, onUploadProgress);
        uploadedFileObjects = res?.data?.files || res?.data?.uploadedFiles || [];
      }

      // ── Patch local subfolder state so the file count updates immediately ──
      if (selectedSfId) {
        setSubFolders((prev) =>
          prev.map((sf) => {
            if (sf._id !== selectedSfId) return sf;
            // If the API returned real file objects use them, otherwise
            // append lightweight stubs so the count is never stale.
            const appended = uploadedFileObjects.length > 0
              ? uploadedFileObjects
              : files.map((f) => ({ name: f.name, size: f.size, mimeType: f.mimeType }));
            return { ...sf, files: [...(sf.files || []), ...appended] };
          })
        );
      }

      const destName = selectedSfId
        ? subFolders.find((f) => f._id === selectedSfId)?.name || 'folder'
        : 'Root folder';

      const failedFiles = res?.data?.failed || [];
      const uploadedCount = res?.data?.files?.length ?? files.length;

      if (failedFiles.length > 0 && uploadedCount > 0) {
        Alert.alert(
          'Partially uploaded',
          `${uploadedCount} file(s) uploaded to "${destName}".\n\n` +
          `${failedFiles.length} file(s) failed:\n` +
          failedFiles.map((f) => `- ${f.name}`).join('\n'),
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Uploaded! 🎉',
          `${uploadedCount} file${uploadedCount !== 1 ? 's' : ''} uploaded to "${destName}".`,
          [{ text: 'Done', onPress: () => navigation.goBack() }]
        );
      }
    } catch (e) {
      Alert.alert('Upload failed', e.response?.data?.message || 'Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const selectedFolderName = selectedSfId
    ? subFolders.find((f) => f._id === selectedSfId)?.name || 'Folder'
    : 'Root folder';

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()} disabled={uploading}>
          <Ionicons name="arrow-back" size={19} color={C.textSec} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>Upload Files</Text>
          <Text style={s.headerSub} numberOfLines={1}>{material.subjectName}</Text>
        </View>
        {/* Destination badge */}
        <View style={s.destBadge}>
          <Ionicons name="folder" size={11} color={C.accent} />
          <Text style={s.destBadgeText} numberOfLines={1}>{selectedFolderName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Hint ── */}
        <View style={s.hintRow}>
          <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
          <Text style={s.hintText}>Max 50 MB per file · PDF, DOC, PPT, XLS, images, video, ZIP</Text>
        </View>

        {/* ─────────────────────────────────────────────
            SECTION 1 — Choose destination folder
        ───────────────────────────────────────────── */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <Ionicons name="folder-outline" size={15} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>Choose destination</Text>
              <Text style={s.sectionSubtitle}>Where should these files go?</Text>
            </View>
          </View>

          {/* Root folder */}
          <FolderCard folder={null} selected={!selectedSfId} onPress={() => setSelectedSfId('')} />

          {/* Existing subfolders */}
          {subFolders.map((sf) => (
            <FolderCard
              key={sf._id}
              folder={sf}
              selected={selectedSfId === sf._id}
              onPress={() => setSelectedSfId(sf._id)}
            />
          ))}

          {/* Create new folder toggle */}
          {!showNewFolder ? (
            <TouchableOpacity
              style={s.newFolderToggle}
              onPress={() => setShowNewFolder(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="add-circle-outline" size={16} color={C.accent} />
              <Text style={s.newFolderToggleText}>Create a new folder</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.newFolderBox}>
              <View style={s.newFolderTitleRow}>
                <Ionicons name="folder-open-outline" size={15} color={C.accent} />
                <Text style={s.newFolderBoxTitle}>New folder</Text>
                <TouchableOpacity
                  onPress={() => { setShowNewFolder(false); setNewSfName(''); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginLeft: 'auto' }}
                >
                  <Ionicons name="close" size={16} color={C.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={s.newFolderHint}>
                Give the folder a clear name, e.g. <Text style={{ color: C.accent }}>"Unit 1"</Text> or <Text style={{ color: C.accent }}>"Assignments"</Text>
              </Text>
              <View style={s.newFolderInputRow}>
                <View style={s.newFolderInputWrap}>
                  <Ionicons name="folder" size={15} color={C.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={s.newFolderInput}
                    placeholder="Folder name, e.g. Unit 1"
                    placeholderTextColor={C.textMuted}
                    value={newSfName}
                    onChangeText={setNewSfName}
                    maxLength={60}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleCreateSubFolder}
                  />
                  {newSfName.length > 0 && (
                    <Text style={s.newFolderCounter}>{newSfName.length}/60</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[s.createFolderBtn, (!newSfName.trim() || creatingFolder) && s.createFolderBtnDisabled]}
                  onPress={handleCreateSubFolder}
                  disabled={!newSfName.trim() || creatingFolder}
                  activeOpacity={0.8}
                >
                  {creatingFolder
                    ? <ActivityIndicator size="small" color={C.white} />
                    : <Text style={s.createFolderBtnText}>Create</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ─────────────────────────────────────────────
            SECTION 2 — Pick files
        ───────────────────────────────────────────── */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <Ionicons name="cloud-upload-outline" size={15} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>Add files</Text>
              <Text style={s.sectionSubtitle}>
                {files.length === 0
                  ? 'Nothing selected yet'
                  : `${files.length} file${files.length !== 1 ? 's' : ''} · ${formatFileSize(totalSize)}`}
              </Text>
            </View>
            {files.length > 0 && (
              <TouchableOpacity
                onPress={() => setFiles([])}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.clearAll}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Drop zone */}
          <TouchableOpacity style={s.dropzone} onPress={pickFiles} activeOpacity={0.8}>
            <View style={s.dropzoneIconBox}>
              <Ionicons name="cloud-upload-outline" size={32} color={C.accent} />
            </View>
            <Text style={s.dropzoneTitle}>
              {files.length === 0 ? 'Tap to choose files' : 'Add more files'}
            </Text>
            <Text style={s.dropzoneSub}>Any file type · up to 50 MB each</Text>
          </TouchableOpacity>

          {/* File list */}
          {files.length > 0 && (
            <View style={{ marginTop: 4 }}>
              {files.map((f, i) => {
                const { icon, color, label } = fileTypeConfig(f.mimeType);
                return (
                  <View key={`${f.uri}-${i}`} style={[s.fileRow, i === 0 && { borderTopWidth: 1, borderTopColor: C.borderSub }]}>
                    <View style={[s.fileIconBox, { borderColor: color + '30', backgroundColor: color + '15' }]}>
                      <Ionicons name={icon} size={17} color={color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.fileName} numberOfLines={1}>{f.name}</Text>
                      <Text style={s.fileMeta}>
                        <Text style={{ color: color }}>{label}</Text>
                        {'  ·  '}
                        {formatFileSize(f.size)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeFile(i)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={19} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ─────────────────────────────────────────────
            SECTION 3 — Upload summary
        ───────────────────────────────────────────── */}
        {files.length > 0 && (
          <View style={s.summaryCard}>
            <View style={s.summaryRow}>
              <Ionicons name="folder" size={14} color={C.accent} />
              <Text style={s.summaryLabel}>Destination</Text>
              <Text style={s.summaryValue}>{selectedFolderName}</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryRow}>
              <Ionicons name="documents-outline" size={14} color={C.accent} />
              <Text style={s.summaryLabel}>Files</Text>
              <Text style={s.summaryValue}>{files.length} file{files.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryRow}>
              <Ionicons name="scale-outline" size={14} color={C.accent} />
              <Text style={s.summaryLabel}>Total size</Text>
              <Text style={s.summaryValue}>{formatFileSize(totalSize)}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 12 }} />
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
          activeOpacity={0.85}
        >
          {uploading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={19} color={C.white} />
              <Text style={s.uploadBtnText}>
                {files.length > 0
                  ? `Upload ${files.length} file${files.length > 1 ? 's' : ''} to ${selectedFolderName}`
                  : 'Select files first'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerTitle: { fontSize: T.lg, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  headerSub:   { fontSize: T.xs, color: C.textSec, marginTop: 1 },
  destBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    borderRadius: R.full, paddingVertical: 4, paddingHorizontal: 10, flexShrink: 0, maxWidth: 120,
  },
  destBadgeText: { fontSize: T.xs, color: C.accent, fontWeight: '600' },

  scrollContent: { padding: 16, paddingBottom: 20 },

  // Hint
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 16 },
  hintText: { fontSize: T.xs, color: C.textMuted, flex: 1, lineHeight: 16 },

  // Section card
  sectionCard: {
    backgroundColor: C.surface, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.borderSub,
  },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle:    { fontSize: T.base, fontWeight: '700', color: C.textPrimary },
  sectionSubtitle: { fontSize: T.xs, color: C.textMuted, marginTop: 1 },
  clearAll: { fontSize: T.xs, fontWeight: '700', color: C.danger },

  // Folder cards
  folderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: C.borderSub,
  },
  folderCardSelected: { backgroundColor: C.accentBg },
  folderCardIcon: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  folderCardIconSelected: { backgroundColor: C.accentBg, borderColor: C.accentBorder },
  folderCardName:         { fontSize: T.base, fontWeight: '600', color: C.textSec },
  folderCardNameSelected: { color: C.accent },
  folderCardSub:          { fontSize: T.xs, color: C.textMuted, marginTop: 2 },

  // New folder
  newFolderToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14,
  },
  newFolderToggleText: { fontSize: T.base, fontWeight: '600', color: C.accent },

  newFolderBox: {
    margin: 12, backgroundColor: C.elevated,
    borderRadius: R.md, borderWidth: 1, borderColor: C.accentBorder, padding: 14,
  },
  newFolderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  newFolderBoxTitle: { fontSize: T.base, fontWeight: '700', color: C.textPrimary },
  newFolderHint:     { fontSize: T.xs, color: C.textMuted, marginBottom: 12, lineHeight: 17 },
  newFolderInputRow: { flexDirection: 'row', gap: 9 },
  newFolderInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  newFolderInput:   { flex: 1, fontSize: T.base, color: C.textPrimary },
  newFolderCounter: { fontSize: T.xs, color: C.textMuted },
  createFolderBtn: {
    backgroundColor: C.accent, borderRadius: R.md,
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
  },
  createFolderBtnDisabled: { opacity: 0.4 },
  createFolderBtnText: { fontSize: T.sm, fontWeight: '700', color: C.white },

  // Drop zone
  dropzone: {
    margin: 14, marginTop: 10,
    backgroundColor: C.elevated, borderWidth: 1.5, borderColor: C.border,
    borderStyle: 'dashed', borderRadius: R.xl,
    paddingVertical: 28, alignItems: 'center',
  },
  dropzoneIconBox: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  dropzoneTitle: { fontSize: T.md, fontWeight: '700', color: C.accent },
  dropzoneSub:   { fontSize: T.xs, color: C.textMuted, marginTop: 4 },

  // File rows
  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingVertical: 11, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: C.borderSub,
  },
  fileIconBox: {
    width: 36, height: 36, borderRadius: R.sm,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  fileName: { fontSize: T.base, fontWeight: '600', color: C.textPrimary },
  fileMeta: { fontSize: T.xs, color: C.textMuted, marginTop: 2 },

  // Summary card
  summaryCard: {
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, paddingVertical: 4,
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingVertical: 11, paddingHorizontal: 14,
  },
  summaryLabel: { fontSize: T.sm, color: C.textMuted, flex: 1 },
  summaryValue: { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  summaryDivider: { height: 1, backgroundColor: C.borderSub, marginHorizontal: 14 },

  // Footer
  footer: {
    padding: 16, backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  progressWrap: { marginBottom: 10 },
  progressBg: { height: 5, backgroundColor: C.elevated, borderRadius: R.full, overflow: 'hidden', marginBottom: 5 },
  progressFill: { height: '100%', backgroundColor: C.accent, borderRadius: R.full },
  progressText: { fontSize: T.xs, color: C.accent, fontWeight: '600', textAlign: 'right' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 9, backgroundColor: C.accent, borderRadius: R.md, paddingVertical: 15,
  },
  uploadBtnDisabled: { opacity: 0.4 },
  uploadBtnText: { color: C.white, fontSize: T.md, fontWeight: '700', flexShrink: 1 },
});
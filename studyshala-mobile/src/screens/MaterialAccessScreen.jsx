/**
 * screens/MaterialAccessScreen.jsx — StudyShala Dark Theme
 * Student file browsing screen.
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FileListItem from '../components/FileListItem';
import {
  getMaterialFiles, saveMaterial, starFile, unstarFile, getStarredFiles,
} from '../api/studentApi';
import { downloadFile } from '../utils/fileActions';
import { C, R, T } from '../components/theme';

export default function MaterialAccessScreen({ route, navigation }) {
  const { material: initialMaterial } = route.params;
  const [material,    setMaterial]    = useState(initialMaterial);
  // initialMaterial.files may be a NUMBER (count) from the dashboard — treat as not loaded
  const initialFiles = Array.isArray(initialMaterial.files) ? initialMaterial.files : [];
  const initialSubs  = Array.isArray(initialMaterial.subFolders) ? initialMaterial.subFolders : [];
  const [files,       setFiles]       = useState(initialFiles);
  const [subFolders,  setSubFolders]  = useState(initialSubs);
  const [activeFolder,setActiveFolder]= useState(null);
  // Always load from API — initialMaterial.files is often just a count number
  const [loading,     setLoading]     = useState(true);
  const [starredIds,  setStarredIds]  = useState([]);
  const [saving,      setSaving]      = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getMaterialFiles(initialMaterial._id);
      setMaterial({ ...initialMaterial, ...data.material });
      setFiles(data.files || []);
      setSubFolders(data.subFolders || []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to load files.');
    } finally { setLoading(false); }
  }, [initialMaterial]);

  const loadStarred = useCallback(async () => {
    try {
      const { data } = await getStarredFiles();
      setStarredIds((data.starredFiles || []).map((s) => s.fileId));
    } catch (e) { /* non-critical */ }
  }, []);

  useEffect(() => {
    loadFiles();
    loadStarred();
  }, []);

  // Always ensure currentFiles is a plain array — activeFolder.files may be
  // undefined or a count number coming from the API, which crashes Hermes spread
  const currentFiles = Array.isArray(activeFolder?.files) ? activeFolder.files : files;

  const handleStarToggle = async (file) => {
    const isStarred = starredIds.includes(file._id);
    try {
      if (isStarred) {
        await unstarFile(file._id);
        setStarredIds((prev) => prev.filter((id) => id !== file._id));
      } else {
        await starFile({ fileId: file._id, fileName: file.name, mimeType: file.mimeType,
          materialId: material._id, subjectName: material.subjectName });
        setStarredIds((prev) => [...prev, file._id]);
      }
    } catch (e) { Alert.alert('Error', 'Failed to update star.'); }
  };

  const handleSaveMaterial = async () => {
    setSaving(true);
    try {
      const { data } = await saveMaterial(material._id);
      Alert.alert('Saved! 🔖', data.message || 'Material saved successfully');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save material.');
    } finally { setSaving(false); }
  };

  const handleFilePress = (file) => {
    // Navigate directly to in-app FileViewer — no OS hand-off
    navigation.navigate('FileViewer', { file, material });
  };

  const handleFileLongPress = (file) => {
    Alert.alert(file.name, 'File options', [
      { text: 'Download', onPress: () => downloadFile(file) },
      { text: 'Cancel',   style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.loadingText}>Loading materials…</Text>
      </SafeAreaView>
    );
  }

  const totalFiles = files.length + subFolders.reduce((acc, sf) => acc + (sf.files?.length || 0), 0);

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => activeFolder ? setActiveFolder(null) : navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={C.textSec} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {activeFolder ? activeFolder.name : material.subjectName}
          </Text>
          <Text style={s.subtitle} numberOfLines={1}>
            {material.department} · Sem {material.semester} · {material.facultyName}
          </Text>
        </View>
        {!activeFolder && (
          <TouchableOpacity style={s.saveBtn} onPress={handleSaveMaterial} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={C.accent} />
              : <Ionicons name="bookmark-outline" size={20} color={C.accent} />
            }
          </TouchableOpacity>
        )}
      </View>

      {/* ── Stats strip ── */}
      {!activeFolder && (
        <View style={s.statsStrip}>
          <View style={s.statPill}>
            <Ionicons name="document-outline" size={13} color={C.accent} />
            <Text style={s.statText}>{totalFiles} files</Text>
          </View>
          {subFolders.length > 0 && (
            <View style={[s.statPill, { backgroundColor: C.elevated }]}>
              <Ionicons name="folder-outline" size={13} color={C.textSec} />
              <Text style={[s.statText, { color: C.textSec }]}>
                {subFolders.length} folders
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Announcement ── */}
      {!!material.messageToStudents && !activeFolder && (
        <View style={s.announcementBox}>
          <Text style={s.announcementLabel}>📢 From your faculty</Text>
          <Text style={s.announcementText}>{material.messageToStudents}</Text>
        </View>
      )}

      {/* ── File + folder list ── */}
      <FlatList
        data={[
          ...(!activeFolder ? (Array.isArray(subFolders) ? subFolders : []).map((sf) => ({ ...sf, __isFolder: true })) : []),
          ...(Array.isArray(currentFiles) ? currentFiles : []),
        ]}
        keyExtractor={(item) => item._id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) =>
          item.__isFolder ? (
            <TouchableOpacity
              style={s.folderCard}
              onPress={() => {
                // subfolder.files may be a count number — ensure it's an array
                const safeFolder = {
                  ...item,
                  files: Array.isArray(item.files) ? item.files : [],
                };
                setActiveFolder(safeFolder);
              }}
              activeOpacity={0.8}
            >
              <View style={s.folderIconBox}>
                <Ionicons name="folder" size={22} color={"#f59e0b"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.folderName}>{item.name}</Text>
                <Text style={s.folderMeta}>{item.fileCount || item.files?.length || 0} files</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={C.textMuted} />
            </TouchableOpacity>
          ) : (
            <FileListItem
              file={item}
              onPress={handleFilePress}
              onLongPress={handleFileLongPress}
              onStarPress={handleStarToggle}
              isStarred={starredIds.includes(item._id)}
              dark
            />
          )
        }
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>📂</Text>
            <Text style={s.emptyTitle}>No files here yet</Text>
            <Text style={s.emptyDesc}>Your faculty hasn't uploaded anything yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  loadingText: { marginTop: 12, color: C.textSec, fontSize: T.base },

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
  subtitle: { fontSize: T.xs, color: C.textSec, marginTop: 2 },
  saveBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accent + '40',
    alignItems: 'center', justifyContent: 'center',
  },

  statsStrip: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accentBg, borderRadius: R.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  statText: { fontSize: T.sm, fontWeight: '600', color: C.accent },

  announcementBox: {
    backgroundColor: C.accentBg,
    marginHorizontal: 16, marginTop: 14,
    borderRadius: R.md, padding: 14,
    borderLeftWidth: 3, borderLeftColor: C.accent,
  },
  announcementLabel: { fontSize: T.sm, fontWeight: '700', color: C.accent, marginBottom: 4 },
  announcementText:  { fontSize: T.base, color: C.textPrimary, lineHeight: 18 },

  listContent: { padding: 16, paddingBottom: 32 },

  folderCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.md,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  folderIconBox: {
    width: 44, height: 44, borderRadius: R.md,
    backgroundColor: C.elevated, alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1, borderColor: C.border,
  },
  folderName: { fontSize: T.base, fontWeight: '700', color: C.textPrimary },
  folderMeta: { fontSize: T.xs, color: C.textMuted, marginTop: 2 },

  emptyBox:   { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.base + 2, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  emptyDesc:  { fontSize: T.base, color: C.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});
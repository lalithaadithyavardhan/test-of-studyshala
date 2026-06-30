import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, ScrollView,
  Animated, Modal, Pressable, Share,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SidebarDrawer from '../components/SidebarDrawer';
import {
  getMaterialFiles, saveMaterial, removeSavedMaterial,
  starFile, unstarFile, getStarredFiles,
} from '../api/studentApi';
import { downloadFile } from '../utils/fileActions';
import { useAuth } from '../context/AuthContext';
import { materialRepository } from '../database/materialRepository';
import { storage } from '../database/db';

import { offlineSyncService } from '../services/offlineSyncService';

// ── Theme — identical to SavedMaterialsScreen ─────────────────────────────────
const C = {
  bg:           '#13120f',
  surface:      '#1e1c19',
  surface2:     '#252320',
  elevated:     '#2a2724',
  border:       '#2e2c28',
  borderSub:    '#2a2724',
  accent:       '#DE7356',
  accentBg:     'rgba(222,115,86,0.12)',
  accentBorder: 'rgba(222,115,86,0.28)',
  textPrimary:  '#e8e4de',
  textSec:      '#b1ada1',
  textMuted:    '#6b6760',
  white:        '#ffffff',
  error:        '#f87171',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, xxl: 20, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18 };

// ── Subject icon map — mirrors SavedMaterialsScreen exactly ───────────────────
const SUBJECT_ICONS = {
  default:   { icon: 'book-outline',       bg: 'rgba(222,115,86,0.14)',  color: '#DE7356' },
  cs:        { icon: 'code-slash-outline', bg: 'rgba(222,115,86,0.10)',  color: '#C4623F' },
  math:      { icon: 'calculator-outline', bg: 'rgba(177,173,161,0.12)', color: '#B1ADA1' },
  physics:   { icon: 'planet-outline',     bg: 'rgba(177,173,161,0.10)', color: '#9a9690' },
  chemistry: { icon: 'flask-outline',      bg: 'rgba(222,115,86,0.12)',  color: '#c86a4a' },
  bio:       { icon: 'leaf-outline',       bg: 'rgba(177,173,161,0.10)', color: '#B1ADA1' },
  english:   { icon: 'language-outline',   bg: 'rgba(222,115,86,0.14)',  color: '#DE7356' },
  history:   { icon: 'time-outline',       bg: 'rgba(177,173,161,0.12)', color: '#9a9690' },
};

function getSubjectStyle(name = '') {
  const n = name.toLowerCase();
  if (n.includes('data') || n.includes('algorithm') || n.includes('program') || n.includes('operating') ||
      n.includes('network') || n.includes('software') || n.includes('computer') || n.includes('web') ||
      n.includes('database') || n.includes('cloud') || n.includes('devops')) return SUBJECT_ICONS.cs;
  if (n.includes('math') || n.includes('calculus') || n.includes('algebra') || n.includes('statistic')) return SUBJECT_ICONS.math;
  if (n.includes('physics') || n.includes('mechanic') || n.includes('electro')) return SUBJECT_ICONS.physics;
  if (n.includes('chem')) return SUBJECT_ICONS.chemistry;
  if (n.includes('bio') || n.includes('life')) return SUBJECT_ICONS.bio;
  if (n.includes('english') || n.includes('communication') || n.includes('language')) return SUBJECT_ICONS.english;
  if (n.includes('history') || n.includes('social')) return SUBJECT_ICONS.history;
  return SUBJECT_ICONS.default;
}

// ── File type helpers ─────────────────────────────────────────────────────────
const FILE_TYPE = {
  pdf:   { icon: 'document-text', color: '#DE7356' },
  ppt:   { icon: 'easel',         color: '#C4623F' },
  notes: { icon: 'reader',        color: '#B1ADA1' },
  video: { icon: 'videocam',      color: '#9a9690' },
  image: { icon: 'image',         color: '#b08a6e' },
  other: { icon: 'document',      color: '#6b6760' },
};

function getFileType(file) {
  const mime = (file.mimeType || '').toLowerCase();
  const name = (file.name  || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'ppt';
  if (mime.includes('video') || ['mp4','mov','avi','mkv','webm'].some(e => name.endsWith('.'+e))) return 'video';
  if (mime.includes('image') || ['jpg','jpeg','png','gif','webp'].some(e => name.endsWith('.'+e))) return 'image';
  if (mime.includes('word') || mime.includes('text') || ['doc','docx','txt','md'].some(e => name.endsWith('.'+e))) return 'notes';
  return 'other';
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

// ── Filters ───────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',   label: 'All',    icon: 'apps-outline'          },
  { key: 'pdf',   label: 'PDFs',   icon: 'document-text-outline' },
  { key: 'ppt',   label: 'PPTs',   icon: 'easel-outline'         },
  { key: 'notes', label: 'Notes',  icon: 'reader-outline'        },
  { key: 'video', label: 'Videos', icon: 'videocam-outline'      },
];

// ── Recent files helpers ──────────────────────────────────────────────────────
const MAX_RECENT = 5;
async function loadRecentFiles(materialId) {
  try {
    const raw = await AsyncStorage.getItem(`recent_files_${materialId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
async function persistRecentFile(materialId, file) {
  try {
    const existing = await loadRecentFiles(materialId);
    const deduped  = existing.filter(f => f._id !== file._id);
    const updated  = [{ _id: file._id, name: file.name, mimeType: file.mimeType }, ...deduped].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(`recent_files_${materialId}`, JSON.stringify(updated));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE FILE CARD — animated selection, warm theme, no purple
// ─────────────────────────────────────────────────────────────────────────────
function FileCard({ file, onPress, onLongPress, onStarPress, isStarred, selectionMode, isSelected }) {
  const ft = FILE_TYPE[getFileType(file)] || FILE_TYPE.other;

  // Animated values — all useNativeDriver: true so they run on the UI thread
  const checkScale   = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const checkOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const slideAnim    = useRef(new Animated.Value(selectionMode ? 0 : -30)).current;

  // Animate checkbox in/out when selectionMode toggles
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: selectionMode ? 0 : -30,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [selectionMode]);

  // Animate checkmark pop when isSelected changes
  useEffect(() => {
    if (isSelected) {
      Animated.parallel([
        Animated.spring(checkScale,   { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
        Animated.timing(checkOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(checkScale,   { toValue: 0.5, duration: 120, useNativeDriver: true }),
        Animated.timing(checkOpacity, { toValue: 0,   duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [isSelected]);

  return (
    <TouchableOpacity
      style={[fc.root, isSelected && fc.rootSelected]}
      onPress={() => onPress(file)}
      onLongPress={() => onLongPress(file)}
      activeOpacity={0.75}
    >
      {/* Accent left bar — visible only when selected */}
      {isSelected && <View style={fc.accentBar} />}

      {/* Checkbox — slides in when selection mode is active */}
      {selectionMode && (
        <Animated.View style={{ transform: [{ translateX: slideAnim }], overflow: 'hidden' }}>
          <View style={[fc.checkbox, isSelected && fc.checkboxSelected]}>
            <Animated.View style={{ opacity: checkOpacity, transform: [{ scale: checkScale }] }}>
              <Ionicons name="checkmark" size={13} color={C.white} />
            </Animated.View>
          </View>
        </Animated.View>
      )}

      {/* File type icon */}
      <View style={[fc.iconBox, { backgroundColor: ft.color + '18', borderColor: ft.color + '30' }]}>
        <Ionicons name={ft.icon} size={20} color={ft.color} />
      </View>

      {/* Name + meta */}
      <View style={fc.body}>
        <Text style={[fc.name, isSelected && fc.nameSelected]} numberOfLines={1}>{file.name}</Text>
        <View style={fc.meta}>
          {!!file.size && <Text style={fc.metaText}>{formatSize(file.size)}</Text>}
          {!!file.size && !!file.createdAt && <Text style={fc.metaDot}>·</Text>}
          {!!file.createdAt && <Text style={fc.metaText}>{formatDate(file.createdAt)}</Text>}
        </View>
      </View>

      {/* Star — hidden in selection mode; replaced by selection indicator */}
      {!selectionMode ? (
        <TouchableOpacity
          onPress={() => onStarPress(file)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={fc.starBtn}
        >
          <Ionicons
            name={isStarred ? 'star' : 'star-outline'}
            size={17}
            color={isStarred ? C.accent : C.textMuted}
          />
        </TouchableOpacity>
      ) : (
        // In selection mode show a subtle chevron hint that this is tappable
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={isSelected ? C.accent : C.border}
        />
      )}
    </TouchableOpacity>
  );
}

const fc = StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 11, paddingHorizontal: 12, marginBottom: 8,
    overflow: 'hidden',
  },
  rootSelected: {
    borderColor: C.accent,
    backgroundColor: 'rgba(222,115,86,0.09)',
  },
  // Left accent stripe shown on selected cards
  accentBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: C.accent, borderRadius: 2,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: R.sm,
    borderWidth: 1.5, borderColor: C.textMuted,
    backgroundColor: C.elevated,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, flexShrink: 0,
  },
  checkboxSelected: {
    backgroundColor: C.accent, borderColor: C.accent,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: R.sm,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginRight: 12, flexShrink: 0,
  },
  body:         { flex: 1, gap: 3 },
  name:         { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  nameSelected: { color: C.textPrimary },
  meta:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:     { fontSize: T.xs, color: C.textMuted },
  metaDot:      { fontSize: T.xs, color: C.textMuted },
  starBtn:      { paddingLeft: 8 },
});

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ visible, icon, iconColor, message, sub }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0,  useNativeDriver: true, tension: 140, friction: 9 }),
        Animated.timing(opacity,    { toValue: 1,  duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 16, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,  duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View pointerEvents="none" style={[s.toast, { opacity, transform: [{ translateY }] }]}>
      <View style={[s.toastIconBox, { backgroundColor: (iconColor || C.accent) + '1a' }]}>
        <Ionicons name={icon || 'checkmark'} size={15} color={iconColor || C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.toastMsg}>{message}</Text>
        {!!sub && <Text style={s.toastSub}>{sub}</Text>}
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// THEMED DIALOG
// ─────────────────────────────────────────────────────────────────────────────
function ThemedDialog({ visible, title, message, buttons, onDismiss }) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <Pressable style={s.dialogOverlay} onPress={onDismiss}>
        <Pressable style={s.dialogBox} onPress={() => {}}>
          <Text style={s.dialogTitle}>{title}</Text>
          {!!message && <Text style={s.dialogMsg}>{message}</Text>}
          <View style={s.dialogBtns}>
            {(buttons || []).map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  s.dialogBtn,
                  btn.style === 'cancel'      && s.dialogBtnCancel,
                  btn.style === 'destructive' && s.dialogBtnDestructive,
                  !btn.style                  && s.dialogBtnPrimary,
                ]}
                onPress={() => { onDismiss(); btn.onPress?.(); }}
                activeOpacity={0.8}
              >
                <Text style={[
                  s.dialogBtnText,
                  btn.style === 'cancel'      && s.dialogBtnTextCancel,
                  btn.style === 'destructive' && s.dialogBtnTextDestructive,
                  !btn.style                  && s.dialogBtnTextPrimary,
                ]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FACULTY NOTE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function FacultyNoteModal({ visible, note, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={s.dialogOverlay} onPress={onClose}>
        <Pressable style={s.dialogBox} onPress={() => {}}>
          <View style={s.noteModalHeader}>
            <View style={s.noteModalIconBox}>
              <Ionicons name="megaphone" size={15} color={C.accent} />
            </View>
            <Text style={s.noteModalTitle}>Note from Faculty</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={s.noteModalDivider} />
          <Text style={s.noteModalText}>{note}</Text>
          <TouchableOpacity style={s.noteModalCloseBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.noteModalCloseBtnText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERFLOW MENU — dual mode: normal & selection
// ─────────────────────────────────────────────────────────────────────────────
function OverflowMenu({
  visible, onClose,
  // normal mode actions
  onRefresh, onSelectFiles, onSort, onShareSubject,
  // selection mode actions
  selectionMode, onSelectAll, onDownloadSelected, onShareSelected, onCancelSelection,
  hasSelection,
}) {
  if (!visible) return null;

  const normalItems = [
    { icon: 'checkbox-outline',      label: 'Select Files',    onPress: onSelectFiles },
    { icon: 'swap-vertical-outline', label: 'Sort',            onPress: onSort        },
    { icon: 'refresh-outline',       label: 'Refresh',         onPress: onRefresh     },
    { icon: 'share-social-outline',  label: 'Share Subject',   onPress: onShareSubject },
  ];

  const selectionItems = [
    { icon: 'checkbox-outline',       label: 'Select All',        onPress: onSelectAll,        accent: false },
    { icon: 'cloud-download-outline', label: 'Download Selected', onPress: onDownloadSelected, accent: hasSelection },
    { icon: 'share-social-outline',   label: 'Share Selected',    onPress: onShareSelected,    accent: hasSelection },
    { icon: 'close-circle-outline',   label: 'Cancel Selection',  onPress: onCancelSelection,  danger: true },
  ];

  const items = selectionMode ? selectionItems : normalItems;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={om.overlay} onPress={onClose}>
        <Pressable style={om.menu} onPress={() => {}}>
          {selectionMode && (
            <View style={om.menuHeader}>
              <Ionicons name="checkmark-done-outline" size={13} color={C.accent} />
              <Text style={om.menuHeaderText}>Selection Actions</Text>
            </View>
          )}
          {items.map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <View style={om.divider} />}
              <TouchableOpacity
                style={om.item}
                onPress={() => { onClose(); item.onPress?.(); }}
                activeOpacity={0.7}
              >
                <View style={[om.iconWrap, item.accent && om.iconWrapAccent, item.danger && om.iconWrapDanger]}>
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={item.accent ? C.accent : item.danger ? C.error : C.textSec}
                  />
                </View>
                <Text style={[om.itemText, item.accent && om.itemTextAccent, item.danger && om.itemTextDanger]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const om = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'flex-end', justifyContent: 'flex-start',
    paddingTop: 88, paddingRight: 14,
  },
  menu: {
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border, minWidth: 200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 16,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingTop: 11, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: C.borderSub,
  },
  menuHeaderText: { fontSize: T.xs, fontWeight: '600', color: C.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapAccent: { backgroundColor: C.accentBg,              borderColor: C.accentBorder },
  iconWrapDanger: { backgroundColor: 'rgba(248,113,113,0.10)', borderColor: 'rgba(248,113,113,0.25)' },
  itemText:       { fontSize: T.sm, fontWeight: '500', color: C.textPrimary },
  itemTextAccent: { color: C.accent },
  itemTextDanger: { color: C.error  },
  divider:        { height: 1, backgroundColor: C.borderSub, marginHorizontal: 10 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function MaterialAccessScreen({ route, navigation }) {
  const { material: initialMaterial } = route.params;
  const { user, logout } = useAuth();

  const [material,      setMaterial]      = useState(initialMaterial);
  const [files,         setFiles]         = useState(Array.isArray(initialMaterial.files)      ? initialMaterial.files      : []);
  const [subFolders,    setSubFolders]    = useState(Array.isArray(initialMaterial.subFolders) ? initialMaterial.subFolders : []);
  const [activeFolder,  setActiveFolder]  = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [starredIds,    setStarredIds]    = useState([]);
  const [saving,        setSaving]        = useState(false);
  const [isSaved,       setIsSaved]       = useState(!!initialMaterial.isSaved);
  const [recentFiles,   setRecentFiles]   = useState([]);
  const [noteVisible,   setNoteVisible]   = useState(false);
  const [query,         setQuery]         = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [activeFilter,  setActiveFilter]  = useState('all');
  const [toast,         setToast]         = useState({ visible: false });
  const [dialog,        setDialog]        = useState({ visible: false });
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [overflowVisible, setOverflowVisible] = useState(false);
  const [selectionMode,   setSelectionMode]   = useState(false);
  // Plain array (not Set) — Hermes-safe, no iterator protocol needed
  const [selectedIds,     setSelectedIds]     = useState([]);

  const toastTimer = useRef(null);
  const searchRef  = useRef(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  const showToast = (icon, iconColor, message, sub) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, icon, iconColor, message, sub });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  };

  const showDialog = (title, message, buttons) =>
    setDialog({ visible: true, title, message, buttons });

  // ── Toggle animated search bar — same as SavedMaterialsScreen ────────────
  const toggleSearch = () => {
    if (searchVisible) {
      setQuery('');
      Animated.timing(searchAnim, { toValue: 0, duration: 180, useNativeDriver: false })
        .start(() => setSearchVisible(false));
    } else {
      setSearchVisible(true);
      Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false })
        .start(() => searchRef.current?.focus());
    }
  };

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    // Step 1 — show cached files instantly, no spinner
    try {
      const cachedRaw = await AsyncStorage.getItem(`files:${initialMaterial._id}`);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached.files?.length || cached.subFolders?.length) {
          setFiles(cached.files || []);
          setSubFolders(cached.subFolders || []);
          setLoading(false);
        }
      }
    } catch {}

    // Step 2 — fetch from server in background
    try {
      const { data } = await getMaterialFiles(initialMaterial._id);
      setMaterial({ ...initialMaterial, ...data.material });
      setFiles(data.files || []);
      setSubFolders(data.subFolders || []);
      if (data.material?.isSaved !== undefined) setIsSaved(!!data.material.isSaved);

      // Step 3 — persist fresh data to local cache
      await AsyncStorage.setItem(
        `files:${initialMaterial._id}`,
        JSON.stringify({ files: data.files || [], subFolders: data.subFolders || [] }),
      );
    } catch (e) {
      // Server failed — cached data already showing, stay silent
      // Only show error if the screen is completely empty
      setFiles(prev => {
        if (prev.length === 0) {
          showDialog('Error', e.response?.data?.message || 'Failed to load files.', [{ text: 'OK', style: 'cancel' }]);
        }
        return prev;
      });
    } finally { setLoading(false); }
  }, [initialMaterial]);

  const loadStarred = useCallback(async () => {
    // Step 1 — load starred IDs from local cache instantly
    try {
      // NOTE: getAllByPrefix() returns plain parsed objects (the stored
      // record itself), not {key, value} pairs — use the fileId field.
      const result = await storage.getAllByPrefix('starred:');
      const cachedIds = (result || []).map(entry => entry.fileId).filter(Boolean);
      if (cachedIds.length) setStarredIds(cachedIds);
    } catch {}

    // Step 2 — fetch from server in background
    try {
      const { data } = await getStarredFiles();
      const serverIds = (data.starredFiles || []).map(s => s.fileId);
      setStarredIds(serverIds);

      // Step 3 — sync to local cache: write each starred fileId with full data
      for (const f of (data.starredFiles || [])) {
        // storage.set() already JSON.stringifies internally — never wrap the
        // object in JSON.stringify() here, that double-encodes it.
        await storage.set(`starred:${f.fileId}`, {
          fileId: f.fileId,
          fileName: f.fileName,
          mimeType: f.mimeType,
          materialId: f.materialId,
          subjectName: f.subjectName,
          previewUrl: f.previewUrl || null,
          downloadUrl: f.downloadUrl || null,
          starredAt: f.starredAt || null,
          cachedAt: Date.now(),
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadFiles();
    loadStarred();
    loadRecentFiles(initialMaterial._id).then(setRecentFiles);
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  // ── Derived lists ─────────────────────────────────────────────────────────
  const currentFiles = Array.isArray(activeFolder?.files) ? activeFolder.files : files;
  const q = query.trim().toLowerCase();

  const filteredFolders = useMemo(() => {
    if (activeFolder) return [];
    return (Array.isArray(subFolders) ? subFolders : [])
      .filter(sf => !q || sf.name?.toLowerCase().includes(q));
  }, [subFolders, q, activeFolder]);

  const filteredFiles = useMemo(() => {
    return (Array.isArray(currentFiles) ? currentFiles : []).filter(file => {
      const matchFilter = activeFilter === 'all' || getFileType(file) === activeFilter;
      const matchQuery  = !q || file.name?.toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }, [currentFiles, activeFilter, q]);

  const listData = useMemo(() => [
    ...filteredFolders.map(sf => ({ ...sf, __isFolder: true })),
    ...filteredFiles,
  ], [filteredFolders, filteredFiles]);

  const isFiltering = q.length > 0 || activeFilter !== 'all';

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStarToggle = async (file) => {
    const already = starredIds.includes(file._id);
    try {
      if (already) {
        await unstarFile(file._id);
        setStarredIds(prev => prev.filter(id => id !== file._id));
        // Remove from local cache
        await storage.delete(`starred:${file._id}`);
      } else {
        await starFile({
          fileId: file._id, fileName: file.name, mimeType: file.mimeType,
          materialId: material._id, subjectName: material.subjectName,
        });
        setStarredIds(prev => [...prev, file._id]);
        // Save to local cache — include previewUrl + downloadUrl so StarredScreen can open offline
        // storage.set() already JSON.stringifies internally — never wrap in
        // JSON.stringify() here, that double-encodes it.
        await storage.set(`starred:${file._id}`, {
          fileId: file._id,
          fileName: file.name,
          mimeType: file.mimeType,
          materialId: material._id,
          subjectName: material.subjectName,
          previewUrl: file.previewUrl || null,
          downloadUrl: file.downloadUrl || null,
          starredAt: new Date().toISOString(),
          cachedAt: Date.now(),
        });

        offlineSyncService.cacheFile(file).catch(() => {});
      }
    } catch {
      showDialog('Error', 'Failed to update star.', [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const handleSaveToggle = async () => {
    setSaving(true);
    try {
      if (isSaved) {
        await removeSavedMaterial(material._id);
        setIsSaved(false);
        showToast('bookmark-outline', C.textSec, 'Removed from saved', material.subjectName);
        // Update local cache — mark as not saved offline
        await materialRepository.upsert({
          materialId: material._id,
          subject: material.subjectName,
          facultyName: material.facultyName,
          department: material.department,
          semester: material.semester,
          accessCode: material.accessCode,
          version: material.version || 1,
          savedOffline: false,
        });
      } else {
        await saveMaterial(material._id);
        setIsSaved(true);
        showToast('bookmark', C.accent, 'Saved to library', material.subjectName);
        // Upsert into materialRepository so SavedMaterialsScreen shows it offline
        await materialRepository.upsert({
          materialId: material._id,
          subject: material.subjectName,
          facultyName: material.facultyName,
          department: material.department,
          semester: material.semester,
          accessCode: material.accessCode,
          version: material.version || 1,
          savedOffline: true,
        });
        // Download all files to Cache dir in background so material works offline
        offlineSyncService.cacheMaterial(material._id, files, material).catch(() => {});
      }
    } catch (e) {
      showDialog('Error', e.response?.data?.message || 'Failed to update.', [{ text: 'OK', style: 'cancel' }]);
    } finally { setSaving(false); }
  };

  const handleFilePress = async (file) => {
    await persistRecentFile(material._id, file);
    setRecentFiles(prev => {
      const deduped = prev.filter(f => f._id !== file._id);
      return [{ _id: file._id, name: file.name, mimeType: file.mimeType }, ...deduped].slice(0, MAX_RECENT);
    });
    // Update lastOpened in materialRepository so HistoryScreen reflects this visit
    try {
      await materialRepository.upsert({
        materialId: material._id,
        subject: material.subjectName,
        facultyName: material.facultyName,
        department: material.department,
        semester: material.semester,
        accessCode: material.accessCode,
        version: material.version || 1,
        lastOpened: new Date().toISOString(),
      });
    } catch {}
    navigation.navigate('FileViewer', { file, material });
  };

  const handleFileLongPress = (file) => {
    showDialog(file.name, 'What would you like to do?', [
      { text: 'Download', onPress: () => downloadFile(file) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const enterFolder = (item) => {
    setActiveFolder({ ...item, files: Array.isArray(item.files) ? item.files : [] });
    setQuery(''); setActiveFilter('all');
  };

  const exitFolder = () => {
    setActiveFolder(null); setQuery(''); setActiveFilter('all');
  };

  // ── Selection handlers ────────────────────────────────────────────────────
  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds([]);
    setOverflowVisible(false);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
    setOverflowVisible(false);
  };

  const toggleFileSelection = (file) => {
    if (!selectionMode) return;
    setSelectedIds(prev =>
      prev.includes(file._id)
        ? prev.filter(id => id !== file._id)
        : [...prev, file._id]
    );
  };

  // Select all currently visible files (not folders)
  const handleSelectAll = () => {
    const visibleFileIds = filteredFiles.map(f => f._id);
    setSelectedIds(visibleFileIds);
  };

  const handleDeselectAll = () => setSelectedIds([]);

  // In selection mode tapping a file toggles it; outside opens it normally
  const handleFilePressWithSelection = async (file) => {
    if (selectionMode) {
      toggleFileSelection(file);
      return;
    }
    await persistRecentFile(material._id, file);
    setRecentFiles(prev => {
      const deduped = prev.filter(f => f._id !== file._id);
      return [{ _id: file._id, name: file.name, mimeType: file.mimeType }, ...deduped].slice(0, MAX_RECENT);
    });
    // Update lastOpened in materialRepository so HistoryScreen reflects this visit
    try {
      await materialRepository.upsert({
        materialId: material._id,
        subject: material.subjectName,
        facultyName: material.facultyName,
        department: material.department,
        semester: material.semester,
        accessCode: material.accessCode,
        version: material.version || 1,
        lastOpened: new Date().toISOString(),
      });
    } catch {}
    navigation.navigate('FileViewer', { file, material });
  };

  // Long-press enters selection mode and selects the pressed file
  const handleFileLongPressWithSelection = (file) => {
    if (selectionMode) {
      // In selection mode, long-press = same as tap (toggle)
      toggleFileSelection(file);
      return;
    }
    // Enter selection mode and pre-select this file
    setSelectionMode(true);
    setSelectedIds([file._id]);
  };

  const handleDownloadSelected = () => {
    const filesToDownload = filteredFiles.filter(f => selectedIds.includes(f._id));
    if (filesToDownload.length === 0) {
      showToast('alert-circle-outline', C.error, 'No files selected');
      return;
    }
    filesToDownload.forEach(f => downloadFile(f));
    showToast('cloud-download-outline', C.accent, `Downloading ${filesToDownload.length} file${filesToDownload.length !== 1 ? 's' : ''}…`);
    exitSelectionMode();
  };

  const handleShareSelected = async () => {
    const filesToShare = filteredFiles.filter(f => selectedIds.includes(f._id));
    if (filesToShare.length === 0) {
      showToast('alert-circle-outline', C.error, 'No files selected');
      return;
    }

    // Share each file as an actual file attachment via expo-sharing.
    // shareAsync() takes one URI at a time (OS limitation), so we download
    // each file to cache and open the share sheet for each in sequence.
    exitSelectionMode();
    for (const file of filesToShare) {
      if (!file.downloadUrl) continue;
      try {
        const safeName = (file.name || 'file').replace(/[^\w.\-() ]/g, '_');
        const cacheUri = `${FileSystem.cacheDirectory}${safeName}`;
        const { status } = await FileSystem.downloadAsync(file.downloadUrl, cacheUri);
        if (status !== 200) throw new Error(`HTTP ${status}`);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(cacheUri, {
            mimeType: file.mimeType || 'application/octet-stream',
            dialogTitle: `Share ${file.name}`,
          });
        }
        await FileSystem.deleteAsync(cacheUri, { idempotent: true });
      } catch {
        // User cancelled mid-sequence or file failed — skip to next
      }
    }
  };

  // Stub handlers for overflow menu items (no API change)
  const handleSort = () => {
    showToast('swap-vertical-outline', C.accent, 'Sort coming soon');
  };

  const handleShareSubject = async () => {
    try {
      await Share.share({
        message: `Check out ${material.subjectName} on StudyShala!`,
        title: material.subjectName,
      });
    } catch {}
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[s.root, s.center]} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  const subStyle     = getSubjectStyle(material.subjectName);
  const totalFiles   = files.length + subFolders.reduce((acc, sf) => acc + (sf.files?.length || 0), 0);
  const totalFolders = subFolders.length;
  const hasNote      = !!material.messageToStudents;

  // ── Shared header ─────────────────────────────────────────────────────────
  // Normal mode:    [back]  [icon + title + sub]  [search] [bookmark] [⋮]
  // Selection mode: [cancel]  [N Selected]  [Select All]  [Download]  [Share]
  const renderHeader = (isSubFolder = false) => {
    // ── SELECTION MODE header ──
    if (selectionMode) {
      const allVisible = filteredFiles.length > 0 && filteredFiles.every(f => selectedIds.includes(f._id));
      const hasAny = selectedIds.length > 0;
      return (
        <View style={[s.header, s.headerSelection]}>
          {/* Cancel */}
          <TouchableOpacity style={s.iconBtn} onPress={exitSelectionMode} activeOpacity={0.75}>
            <Ionicons name="close" size={18} color={C.textSec} />
          </TouchableOpacity>

          {/* Count label + badge */}
          <View style={s.headerMid}>
            <View>
              <Text style={s.headerTitle}>
                {hasAny ? `${selectedIds.length} Selected` : 'Select Files'}
              </Text>
              <Text style={s.headerSub}>
                {hasAny
                  ? `of ${filteredFiles.length} file${filteredFiles.length !== 1 ? 's' : ''}`
                  : 'Tap files to select'}
              </Text>
            </View>
          </View>

          <View style={s.headerRight}>
            {/* Select All / Deselect All */}
            <TouchableOpacity
              style={[s.iconBtn, allVisible && s.iconBtnAccent]}
              onPress={allVisible ? handleDeselectAll : handleSelectAll}
              activeOpacity={0.75}
            >
              <Ionicons
                name={allVisible ? 'checkbox' : 'checkbox-outline'}
                size={17}
                color={allVisible ? C.white : C.textSec}
              />
            </TouchableOpacity>

            {/* Download selected */}
            <TouchableOpacity
              style={[s.iconBtn, hasAny && s.iconBtnAccent]}
              onPress={handleDownloadSelected}
              disabled={!hasAny}
              activeOpacity={0.75}
            >
              <Ionicons
                name="cloud-download-outline"
                size={17}
                color={hasAny ? C.white : C.textMuted}
              />
            </TouchableOpacity>

            {/* Share selected */}
            <TouchableOpacity
              style={[s.iconBtn, hasAny && s.iconBtnAccent]}
              onPress={handleShareSelected}
              disabled={!hasAny}
              activeOpacity={0.75}
            >
              <Ionicons
                name="share-social-outline"
                size={17}
                color={hasAny ? C.white : C.textMuted}
              />
            </TouchableOpacity>

            {/* Overflow — shows selection-mode actions */}
            <TouchableOpacity style={s.iconBtn} onPress={() => setOverflowVisible(true)} activeOpacity={0.75}>
              <Text style={s.overflowDots}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ── NORMAL MODE header ──
    return (
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={isSubFolder ? exitFolder : () => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={C.textSec} />
        </TouchableOpacity>

        <View style={s.headerMid}>
          <View style={s.headerIconBox}>
            <Ionicons
              name={isSubFolder ? 'folder-open-outline' : subStyle.icon}
              size={16}
              color={C.accent}
            />
          </View>
          <View>
            <Text style={s.headerTitle} numberOfLines={1}>
              {isSubFolder ? activeFolder.name : material.subjectName}
            </Text>
            <Text style={s.headerSub} numberOfLines={1}>
              {isSubFolder
                ? material.subjectName
                : [material.department, material.semester ? `Sem ${material.semester}` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        <View style={s.headerRight}>
          {/* Search toggle */}
          <TouchableOpacity style={s.iconBtn} onPress={toggleSearch}>
            <Ionicons name={searchVisible ? 'close' : 'search-outline'} size={18} color={C.textSec} />
          </TouchableOpacity>

          {/* Bookmark — filled when saved, outline when not */}
          {!isSubFolder && (
            <TouchableOpacity
              style={[s.iconBtn, isSaved && s.iconBtnAccent]}
              onPress={handleSaveToggle}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator size="small" color={isSaved ? C.white : C.accent} />
                : <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={17}
                    color={isSaved ? C.white : C.textSec}
                  />
              }
            </TouchableOpacity>
          )}

          {/* Overflow menu (⋮) */}
          <TouchableOpacity style={s.iconBtn} onPress={() => setOverflowVisible(true)}>
            <Text style={s.overflowDots}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Compact meta strip (horizontal scroll chips, no big card) ─────────────
  

  // ── Animated search bar ───────────────────────────────────────────────────
  const renderSearchBar = () =>
    searchVisible ? (
      <Animated.View style={[s.searchWrap, { opacity: searchAnim }]}>
        <Ionicons name="search-outline" size={15} color={C.textMuted} />
        <TextInput
          ref={searchRef}
          style={s.searchInput}
          placeholder="Search files, folders…"
          placeholderTextColor={C.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={15} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>
    ) : null;

  // ── SUB-FOLDER VIEW ───────────────────────────────────────────────────────
  // Header is already a direct SafeAreaView child here — no change needed.
  if (activeFolder) {
    return (
      <View style={s.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {renderHeader(true)}
          {!selectionMode && renderSearchBar()}
          <FilterRow activeFilter={activeFilter} onSelect={setActiveFilter} />
          <FlatList
            data={filteredFiles}
            keyExtractor={item => item._id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            extraData={selectedIds}
            ListHeaderComponent={
              <ResultsHeader count={filteredFiles.length} isFiltering={isFiltering}
                onClear={() => { setQuery(''); setActiveFilter('all'); }} />
            }
            renderItem={({ item }) => (
              <FileCard
                file={item}
                onPress={handleFilePressWithSelection}
                onLongPress={handleFileLongPressWithSelection}
                onStarPress={handleStarToggle}
                isStarred={starredIds.includes(item._id)}
                selectionMode={selectionMode}
                isSelected={selectedIds.includes(item._id)}
              />
            )}
            ListEmptyComponent={<EmptyState isFiltering={isFiltering} />}
          />
        </SafeAreaView>
        <Toast {...toast} />
        <ThemedDialog {...dialog} onDismiss={() => setDialog(d => ({ ...d, visible: false }))} />
        <OverflowMenu
          visible={overflowVisible}
          onClose={() => setOverflowVisible(false)}
          selectionMode={selectionMode}
          hasSelection={selectedIds.length > 0}
          onRefresh={() => { loadFiles(); }}
          onSelectFiles={enterSelectionMode}
          onSort={handleSort}
          onShareSubject={handleShareSubject}
          onSelectAll={handleSelectAll}
          onDownloadSelected={handleDownloadSelected}
          onShareSelected={handleShareSelected}
          onCancelSelection={exitSelectionMode}
        />
        <SidebarDrawer visible={sidebarOpen} onClose={() => setSidebarOpen(false)}
          navigation={navigation} role="student" user={user} onLogout={logout} />
      </View>
    );
  }

  // ── MAIN VIEW ─────────────────────────────────────────────────────────────
  // FIX: renderHeader() and renderMetaStrip() are now direct children of
  // SafeAreaView, NOT inside ListHeaderComponent. This matches SavedMaterialsScreen
  // and eliminates the extra gap that appeared above the header.
  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ✅ Static — direct SafeAreaView children, never scroll */}
        {renderHeader(false)}
        

        <FlatList
          data={listData}
          keyExtractor={item => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          extraData={selectedIds}
          ListHeaderComponent={
            <>
              {/* Faculty note */}
              {hasNote && (
                <TouchableOpacity style={s.noteBtn} onPress={() => setNoteVisible(true)} activeOpacity={0.8}>
                  <Ionicons name="megaphone-outline" size={13} color={C.accent} />
                  <Text style={s.noteBtnText}>Note from faculty</Text>
                  <Ionicons name="chevron-forward" size={13} color={C.accent} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}

              {/* Search bar */}
              {renderSearchBar()}

              {/* Filter chips */}
              <FilterRow activeFilter={activeFilter} onSelect={setActiveFilter} />

              {/* Recently opened — below filters */}
              {recentFiles.length > 0 && !isFiltering && (
                <RecentlyOpened files={recentFiles} onPress={handleFilePress} />
              )}

              {/* Results / FILES label */}
              <ResultsHeader count={listData.length} isFiltering={isFiltering}
                onClear={() => { setQuery(''); setActiveFilter('all'); }} />
            </>
          }
          renderItem={({ item }) =>
            item.__isFolder ? (
              <FolderCard item={item} onPress={() => enterFolder(item)} />
            ) : (
              <FileCard
                file={item}
                onPress={handleFilePressWithSelection}
                onLongPress={handleFileLongPressWithSelection}
                onStarPress={handleStarToggle}
                isStarred={starredIds.includes(item._id)}
                selectionMode={selectionMode}
                isSelected={selectedIds.includes(item._id)}
              />
            )
          }
          ListEmptyComponent={<EmptyState isFiltering={isFiltering} />}
        />
      </SafeAreaView>

      <Toast {...toast} />
      <ThemedDialog {...dialog} onDismiss={() => setDialog(d => ({ ...d, visible: false }))} />
      <FacultyNoteModal visible={noteVisible} note={material.messageToStudents} onClose={() => setNoteVisible(false)} />
      <OverflowMenu
        visible={overflowVisible}
        onClose={() => setOverflowVisible(false)}
        selectionMode={selectionMode}
        hasSelection={selectedIds.length > 0}
        onRefresh={() => { loadFiles(); }}
        onSelectFiles={enterSelectionMode}
        onSort={handleSort}
        onShareSubject={handleShareSubject}
        onSelectAll={handleSelectAll}
        onDownloadSelected={handleDownloadSelected}
        onShareSelected={handleShareSelected}
        onCancelSelection={exitSelectionMode}
      />
      <SidebarDrawer visible={sidebarOpen} onClose={() => setSidebarOpen(false)}
        navigation={navigation} role="student" user={user} onLogout={logout} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function RecentlyOpened({ files, onPress }) {
  const FILE_TYPE_LOCAL = FILE_TYPE; // closure-safe ref
  return (
    <View style={s.recentWrap}>
      <Text style={s.sectionLabel}>Recently opened</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}>
        {files.map(file => {
          const ft = FILE_TYPE_LOCAL[getFileType(file)] || FILE_TYPE_LOCAL.other;
          return (
            <TouchableOpacity key={file._id} style={s.recentChip} onPress={() => onPress(file)} activeOpacity={0.75}>
              <View style={[s.recentChipIcon, { backgroundColor: ft.color + '18' }]}>
                <Ionicons name={ft.icon} size={13} color={ft.color} />
              </View>
              <Text style={s.recentChipName} numberOfLines={1}>{file.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FilterRow({ activeFilter, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.filterRow} style={s.filterScroll}>
      {FILTERS.map(f => {
        const active = f.key === activeFilter;
        return (
          <TouchableOpacity key={f.key}
            style={[s.filterChip, active && s.filterChipActive]}
            onPress={() => onSelect(f.key)} activeOpacity={0.75}>
            <Ionicons name={f.icon} size={12} color={active ? C.accent : C.textMuted} />
            <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function ResultsHeader({ count, isFiltering, onClear }) {
  if (!isFiltering) return <Text style={[s.sectionLabel, { marginTop: 4 }]}>Files</Text>;
  return (
    <View style={s.resultsRow}>
      <Text style={s.resultsText}>{count === 0 ? 'No results' : `${count} result${count !== 1 ? 's' : ''}`}</Text>
      <TouchableOpacity style={s.clearBtn} onPress={onClear}>
        <Ionicons name="close-circle-outline" size={12} color={C.accent} />
        <Text style={s.clearBtnText}>Clear</Text>
      </TouchableOpacity>
    </View>
  );
}

function FolderCard({ item, onPress }) {
  const count = item.fileCount || item.files?.length || 0;
  return (
    <TouchableOpacity style={s.folderCard} onPress={onPress} activeOpacity={0.82}>
      <View style={s.folderIconBox}>
        <Ionicons name="folder" size={18} color={C.accent} />
      </View>
      <View style={s.folderBody}>
        <Text style={s.folderName} numberOfLines={1}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
          <Ionicons name="document-outline" size={10} color={C.textMuted} />
          <Text style={s.folderMeta}>{count} {count === 1 ? 'file' : 'files'}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
    </TouchableOpacity>
  );
}

function EmptyState({ isFiltering }) {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyEmoji}>{isFiltering ? '🔍' : '📂'}</Text>
      <Text style={s.emptyTitle}>{isFiltering ? 'No matches' : 'Nothing here yet'}</Text>
      <Text style={s.emptyDesc}>
        {isFiltering ? 'Try a different search term or clear the filter.' : "Your faculty hasn't uploaded anything yet."}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  // ── Header — pixel-match to SavedMaterialsScreen ──
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderSub,
    gap: 8,
  },
  // Each button: 36×36, same border/bg as SavedMaterialsScreen
  iconBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  // Filled accent state for bookmark when saved
  iconBtnAccent: { backgroundColor: C.accent, borderColor: C.accent },
  // Selection mode header gets subtle accent tint on bottom border
  headerSelection: {
    borderBottomColor: C.accentBorder,
    backgroundColor: 'rgba(222,115,86,0.04)',
  },

  headerMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox: {
    width: 34, height: 34, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  headerSub:   { fontSize: T.xs, color: C.textMuted, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  overflowDots: { fontSize: 20, color: C.textSec, lineHeight: 22 },

  // ── Meta strip ──
  
  

  // ── Faculty note button ──
  noteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginHorizontal: 1, marginTop: 10,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: C.accentBg, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.accentBorder,
  },
  noteBtnText: { fontSize: T.sm, fontWeight: '600', color: C.accent, flex: 1 },

  // ── Search bar ──
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 1, marginTop: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: T.base, color: C.textPrimary, padding: 0 },

  // ── Filter chips ──
  filterScroll: { flexGrow: 0 },
  filterRow: {
    flexDirection: 'row', gap: 7,
    paddingHorizontal: 1, paddingTop: 8, paddingBottom: 0,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 11, paddingVertical: 6,
    backgroundColor: C.surface, borderRadius: R.full,
    borderWidth: 1, borderColor: C.border,
  },
  filterChipActive:     { backgroundColor: C.accentBg, borderColor: C.accentBorder },
  filterChipText:       { fontSize: T.xs, fontWeight: '600', color: C.textMuted },
  filterChipTextActive: { color: C.accent },

  // ── Recently opened ──
  recentWrap: { marginHorizontal: 1, marginTop: 9, marginBottom: 4 },
  sectionLabel: {
    fontSize: T.xs, fontWeight: '600', letterSpacing: 0.5,
    textTransform: 'uppercase', color: C.textMuted, marginBottom: 8,
  },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.elevated, borderRadius: R.md,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border, maxWidth: 170,
  },
  recentChipIcon: {
    width: 24, height: 24, borderRadius: R.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  recentChipName: { fontSize: T.xs, fontWeight: '500', color: C.textPrimary, flexShrink: 1 },

  // ── Results row ──
  resultsRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10, marginTop: 4,
  },
  resultsText: {
    fontSize: T.xs, fontWeight: '600', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    backgroundColor: C.accentBg, borderRadius: R.full,
    borderWidth: 1, borderColor: C.accentBorder,
  },
  clearBtnText: { fontSize: T.xs, fontWeight: '700', color: C.accent },

  // ── Folder card ──
  folderCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 11, paddingHorizontal: 12, marginBottom: 8,
  },
  folderIconBox: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  folderBody: { flex: 1 },
  folderName: { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  folderMeta: { fontSize: T.xs, color: C.textMuted },

  // ── List ──
  list: { paddingHorizontal: 14, paddingBottom: 40, paddingTop: 4 },

  // ── Empty state ──
  emptyCard: {
    backgroundColor: C.surface, borderRadius: R.xl, paddingVertical: 36,
    alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 12,
  },
  emptyEmoji: { fontSize: 38, marginBottom: 10 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  emptyDesc:  { fontSize: T.sm, color: C.textMuted, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },

  // ── Toast ──
  toast: {
    position: 'absolute', bottom: 26, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface2, borderRadius: R.full,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border, zIndex: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 12, maxWidth: 300,
  },
  toastIconBox: { width: 28, height: 28, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  toastMsg:     { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  toastSub:     { fontSize: T.xs, color: C.textMuted, marginTop: 1 },

  // ── Themed dialog ──
  dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  dialogBox:     { width: '100%', backgroundColor: C.surface, borderRadius: R.xl, padding: 22, borderWidth: 1, borderColor: C.border },
  dialogTitle:   { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  dialogMsg:     { fontSize: T.sm, color: C.textSec, lineHeight: 18, marginBottom: 18 },
  dialogBtns:    { flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'flex-end' },
  dialogBtn:     { paddingHorizontal: 16, paddingVertical: 9, borderRadius: R.sm, borderWidth: 1, borderColor: C.border },
  dialogBtnCancel:          { backgroundColor: C.elevated },
  dialogBtnPrimary:         { backgroundColor: C.accent, borderColor: C.accent },
  dialogBtnDestructive:     { backgroundColor: 'rgba(248,113,113,0.10)', borderColor: C.error },
  dialogBtnText:            { fontSize: T.sm, fontWeight: '600' },
  dialogBtnTextCancel:      { color: C.textSec },
  dialogBtnTextPrimary:     { color: C.white },
  dialogBtnTextDestructive: { color: C.error },

  // ── Faculty note modal ──
  noteModalHeader:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  noteModalIconBox: {
    width: 30, height: 30, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  noteModalTitle:        { flex: 1, fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  noteModalDivider:      { height: 1, backgroundColor: C.borderSub, marginBottom: 14 },
  noteModalText:         { fontSize: T.sm, color: C.textSec, lineHeight: 20, marginBottom: 20 },
  noteModalCloseBtn:     { alignItems: 'center', paddingVertical: 10, backgroundColor: C.accent, borderRadius: R.md },
  noteModalCloseBtnText: { fontSize: T.sm, fontWeight: '700', color: C.white },
});

/**
 * screens/FacultyMaterialDetailScreen.jsx — StudyShala
 *
 * Full overhaul: aligned with MaterialAccessScreen (student) visual language.
 * - Warm dark theme only — zero purple, blue, teal, or cold grays
 * - FileCard component matching student screen (file type icons, star-less)
 * - FolderCard with accent-orange icon (was amber — now on-brand)
 * - FilterRow (All / PDFs / PPTs / Notes / Videos)
 * - RecentlyOpened horizontal scroll chips
 * - Toast notification system
 * - ThemedDialog replaces AlertModal
 * - OverflowMenu dropdown (replaces bottom sheet)
 * - Faculty-only: access code card, Upload / Announce / Share chips,
 *   announcement banner, message modal, bulk delete, WhatsApp share
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Linking, ScrollView,
  Animated, Platform, Share, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFolderDetails, deleteFile, deleteSubFolderFile, deleteSubFolder,
  updateMessage, getFacultyDownloadUrl,
} from '../api/facultyApi';

// ─── Clipboard shim ───────────────────────────────────────────────────────────
let Clipboard;
try { Clipboard = require('@react-native-clipboard/clipboard').default; }
catch { Clipboard = require('react-native').Clipboard; }

// ─────────────────────────────────────────────────────────────────────────────
// THEME — identical to MaterialAccessScreen
// ─────────────────────────────────────────────────────────────────────────────
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
  black:        '#000000',
  overlay:      'rgba(0,0,0,0.72)',
  error:        '#f87171',
  errorBg:      'rgba(248,113,113,0.09)',
  errorBorder:  'rgba(248,113,113,0.25)',
  success:      '#4ade80',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, xxl: 20, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18, xxl: 22 };

const APP_URL = 'https://studyshala.dev';

// ─────────────────────────────────────────────────────────────────────────────
// FILE TYPE HELPERS — warm palette only
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// FILTER CHIPS
// ─────────────────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',   label: 'All',    icon: 'apps-outline'          },
  { key: 'pdf',   label: 'PDFs',   icon: 'document-text-outline' },
  { key: 'ppt',   label: 'PPTs',   icon: 'easel-outline'         },
  { key: 'notes', label: 'Notes',  icon: 'reader-outline'        },
  { key: 'video', label: 'Videos', icon: 'videocam-outline'      },
];

function FilterRow({ activeFilter, onSelect }) {
  return (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      style={s.filterScroll}
      contentContainerStyle={s.filterRow}
    >
      {FILTERS.map(f => {
        const active = f.key === activeFilter;
        return (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, active && s.filterChipActive]}
            onPress={() => onSelect(f.key)}
            activeOpacity={0.75}
          >
            <Ionicons name={f.icon} size={12} color={active ? C.accent : C.textMuted} />
            <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECENTLY OPENED — async storage keyed by material._id
// ─────────────────────────────────────────────────────────────────────────────
const MAX_RECENT = 5;
async function loadRecentFiles(materialId) {
  try {
    const raw = await AsyncStorage.getItem(`faculty_recent_${materialId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
async function persistRecentFile(materialId, file) {
  try {
    const existing = await loadRecentFiles(materialId);
    const deduped  = existing.filter(f => f._id !== file._id);
    const updated  = [{ _id: file._id, name: file.name, mimeType: file.mimeType }, ...deduped].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(`faculty_recent_${materialId}`, JSON.stringify(updated));
  } catch {}
}

function RecentlyOpened({ files, onPress }) {
  return (
    <View style={s.recentWrap}>
      <Text style={s.sectionLabel}>Recently opened</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}>
        {files.map(file => {
          const ft = FILE_TYPE[getFileType(file)] || FILE_TYPE.other;
          return (
            <TouchableOpacity
              key={file._id}
              style={s.recentChip}
              onPress={() => onPress(file)}
              activeOpacity={0.75}
            >
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

// ─────────────────────────────────────────────────────────────────────────────
// FACULTY FILE CARD — mirrors student FileCard, adds delete action
// ─────────────────────────────────────────────────────────────────────────────
function FacultyFileCard({ file, onPress, onLongPress, onDeletePress, selectionMode, isSelected }) {
  const ft = FILE_TYPE[getFileType(file)] || FILE_TYPE.other;

  const checkScale   = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const checkOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const slideAnim    = useRef(new Animated.Value(selectionMode ? 0 : -30)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: selectionMode ? 0 : -30,
      duration: 180, useNativeDriver: true,
    }).start();
  }, [selectionMode]);

  useEffect(() => {
    if (isSelected) {
      Animated.parallel([
        Animated.spring(checkScale,   { toValue: 1,   useNativeDriver: true, tension: 200, friction: 8 }),
        Animated.timing(checkOpacity, { toValue: 1,   duration: 120, useNativeDriver: true }),
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
      {isSelected && <View style={fc.accentBar} />}

      {selectionMode && (
        <Animated.View style={{ transform: [{ translateX: slideAnim }], overflow: 'hidden' }}>
          <View style={[fc.checkbox, isSelected && fc.checkboxSelected]}>
            <Animated.View style={{ opacity: checkOpacity, transform: [{ scale: checkScale }] }}>
              <Ionicons name="checkmark" size={13} color={C.white} />
            </Animated.View>
          </View>
        </Animated.View>
      )}

      <View style={[fc.iconBox, { backgroundColor: ft.color + '18', borderColor: ft.color + '30' }]}>
        <Ionicons name={ft.icon} size={20} color={ft.color} />
      </View>

      <View style={fc.body}>
        <Text style={[fc.name, isSelected && fc.nameSelected]} numberOfLines={1}>{file.name}</Text>
        <View style={fc.meta}>
          {!!file.size && <Text style={fc.metaText}>{formatSize(file.size)}</Text>}
          {!!file.size && !!file.createdAt && <Text style={fc.metaDot}>·</Text>}
          {!!file.createdAt && <Text style={fc.metaText}>{formatDate(file.createdAt)}</Text>}
        </View>
      </View>

      {!selectionMode ? (
        <TouchableOpacity
          onPress={() => onDeletePress(file)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={fc.deleteBtn}
        >
          <Ionicons name="trash-outline" size={16} color={C.error} />
        </TouchableOpacity>
      ) : (
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
  checkboxSelected: { backgroundColor: C.accent, borderColor: C.accent },
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
  deleteBtn:    { paddingLeft: 8 },
});

// ─────────────────────────────────────────────────────────────────────────────
// FOLDER CARD — warm theme, accent-orange icon (no amber)
// ─────────────────────────────────────────────────────────────────────────────
function FolderCard({ item, onPress, onLongPress, onDelete, selectionMode, isSelected }) {
  const count = item.fileCount ?? item.files?.length ?? 0;
  return (
    <TouchableOpacity
      style={[s.folderCard, isSelected && s.folderCardSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.82}
    >
      {isSelected && <View style={s.folderAccentBar} />}
      <View style={[s.folderIconBox, isSelected && s.folderIconBoxSelected]}>
        <Ionicons name="folder" size={18} color={C.accent} />
      </View>
      <View style={s.folderBody}>
        <Text style={s.folderName} numberOfLines={1}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
          <Ionicons name="document-outline" size={10} color={C.textMuted} />
          <Text style={s.folderMeta}>{count} {count === 1 ? 'file' : 'files'}</Text>
        </View>
      </View>
      {!selectionMode ? (
        <>
          <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ paddingLeft: 12 }}
          >
            <Ionicons name="trash-outline" size={16} color={C.error} />
          </TouchableOpacity>
        </>
      ) : (
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={isSelected ? C.accent : C.border}
        />
      )}
    </TouchableOpacity>
  );
}

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
// THEMED DIALOG — replaces AlertModal
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
// OVERFLOW MENU — dropdown from top-right ⋮
// Faculty normal mode: Upload, Announce, Select, Refresh
// Selection mode: Select All, Delete Selected, Share Selected, Cancel
// ─────────────────────────────────────────────────────────────────────────────
function OverflowMenu({
  visible, onClose,
  // normal mode
  onUpload, onAnnounce, onSelectFiles, onRefresh,
  // selection mode
  selectionMode, onSelectAll, onDeleteSelected, onShareSelected, onCancelSelection,
  hasSelection,
}) {
  if (!visible) return null;

  const normalItems = [
    { icon: 'cloud-upload-outline',  label: 'Upload Files',   onPress: onUpload,      accent: true  },
    { icon: 'megaphone-outline',     label: 'Announcement',   onPress: onAnnounce,    accent: false },
    { icon: 'checkbox-outline',      label: 'Select Items',   onPress: onSelectFiles, accent: false },
    { icon: 'refresh-outline',       label: 'Refresh',        onPress: onRefresh,     accent: false },
  ];

  const selectionItems = [
    { icon: 'checkbox-outline',      label: 'Select All',       onPress: onSelectAll,      accent: false },
    { icon: 'trash-outline',         label: 'Delete Selected',  onPress: onDeleteSelected, danger: hasSelection },
    { icon: 'share-social-outline',  label: 'Share Selected',   onPress: onShareSelected,  accent: hasSelection },
    { icon: 'close-circle-outline',  label: 'Cancel Selection', onPress: onCancelSelection, danger: true },
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
                <View style={[
                  om.iconWrap,
                  item.accent && om.iconWrapAccent,
                  item.danger && om.iconWrapDanger,
                ]}>
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={item.accent ? C.accent : item.danger ? C.error : C.textSec}
                  />
                </View>
                <Text style={[
                  om.itemText,
                  item.accent && om.itemTextAccent,
                  item.danger && om.itemTextDanger,
                ]}>
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
    borderWidth: 1, borderColor: C.border, minWidth: 210,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 16,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingTop: 11, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: C.borderSub,
  },
  menuHeaderText: {
    fontSize: T.xs, fontWeight: '600', color: C.accent,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapAccent: { backgroundColor: C.accentBg,               borderColor: C.accentBorder },
  iconWrapDanger: { backgroundColor: 'rgba(248,113,113,0.10)',  borderColor: 'rgba(248,113,113,0.25)' },
  itemText:       { fontSize: T.sm, fontWeight: '500', color: C.textPrimary },
  itemTextAccent: { color: C.accent },
  itemTextDanger: { color: C.error },
  divider:        { height: 1, backgroundColor: C.borderSub, marginHorizontal: 10 },
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS HEADER
// ─────────────────────────────────────────────────────────────────────────────
function ResultsHeader({ count, isFiltering, onClear }) {
  if (!isFiltering) return <Text style={[s.sectionLabel, { marginTop: 4 }]}>Files & Folders</Text>;
  return (
    <View style={s.resultsRow}>
      <Text style={s.resultsText}>
        {count === 0 ? 'No results' : `${count} result${count !== 1 ? 's' : ''}`}
      </Text>
      <TouchableOpacity style={s.clearBtn} onPress={onClear}>
        <Ionicons name="close-circle-outline" size={12} color={C.accent} />
        <Text style={s.clearBtnText}>Clear</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ isFiltering }) {
  return (
    <View style={s.emptyCard}>
      <Text style={s.emptyEmoji}>{isFiltering ? '🔍' : '📂'}</Text>
      <Text style={s.emptyTitle}>{isFiltering ? 'No matches' : 'No files yet'}</Text>
      <Text style={s.emptyDesc}>
        {isFiltering
          ? 'Try a different search term or clear the filter.'
          : 'Upload files to share them with your students.'}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function FacultyMaterialDetailScreen({ route, navigation }) {
  const { material: initialMaterial, openMessage, openShare } = route.params;

  const [material,      setMaterial]      = useState(initialMaterial);
  const [files,         setFiles]         = useState(initialMaterial.files || []);
  const [subFolders,    setSubFolders]    = useState(initialMaterial.subFolders || []);
  const [activeFolder,  setActiveFolder]  = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [msgModalOpen,  setMsgModalOpen]  = useState(!!openMessage);
  const [msgText,       setMsgText]       = useState(initialMaterial.messageToStudents || '');
  const [savingMsg,     setSavingMsg]     = useState(false);
  const [recentFiles,   setRecentFiles]   = useState([]);
  const [activeFilter,  setActiveFilter]  = useState('all');

  // Search
  const [searchVisible, setSearchVisible] = useState(false);
  const [query,         setQuery]         = useState('');
  const searchRef  = useRef(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  // Selection (plain array, Hermes-safe)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds,   setSelectedIds]   = useState([]);

  // Overflow menu
  const [overflowVisible, setOverflowVisible] = useState(false);

  // Code copy feedback
  const [codeCopied, setCodeCopied] = useState(false);

  // Toast
  const [toast, setToast] = useState({ visible: false });
  const toastTimer = useRef(null);

  // Dialog (replaces all Alert.alert)
  const [dialog, setDialog] = useState({ visible: false });

  const showToast = (icon, iconColor, message, sub) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, icon, iconColor, message, sub });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
  };

  const showDialog = (title, message, buttons) =>
    setDialog({ visible: true, title, message, buttons });

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadDetails = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getFolderDetails(initialMaterial._id);
      setMaterial(data.folder);
      setFiles(data.folder.files || []);
      setSubFolders(data.folder.subFolders || []);
    } catch (e) {
      showDialog('Error', e.response?.data?.message || 'Failed to load material.', [{ text: 'OK', style: 'cancel' }]);
    } finally { setLoading(false); }
  }, [initialMaterial._id]);

  useEffect(() => {
    loadDetails();
    loadRecentFiles(initialMaterial._id).then(setRecentFiles);
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => {
    if (openShare) {
      const t = setTimeout(() => handleShareWhatsApp(), 200);
      return () => clearTimeout(t);
    }
  }, [openShare]);

  // ── Search ───────────────────────────────────────────────────────────────
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

  // ── Selection ────────────────────────────────────────────────────────────
  const enterSelectionMode = () => { setSelectionMode(true); setSelectedIds([]); };
  const exitSelectionMode  = () => { setSelectionMode(false); setSelectedIds([]); };

  const toggleSelect = (id) =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const handleSelectAll = () =>
    setSelectedIds(filteredFiles.map(f => f._id));

  // ── File press ────────────────────────────────────────────────────────────
  const handleFilePress = async (file) => {
    if (selectionMode) { toggleSelect(file._id); return; }
    await persistRecentFile(material._id, file);
    setRecentFiles(prev => {
      const deduped = prev.filter(f => f._id !== file._id);
      return [{ _id: file._id, name: file.name, mimeType: file.mimeType }, ...deduped].slice(0, MAX_RECENT);
    });
    navigation.navigate('FileViewer', { file, material });
  };

  const handleFileLongPress = (file) => {
    if (selectionMode) { toggleSelect(file._id); return; }
    setSelectionMode(true);
    setSelectedIds([file._id]);
  };

  // ── Bulk delete ──────────────────────────────────────────────────────────
  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    showDialog(
      `Delete ${selectedIds.length} item${selectedIds.length > 1 ? 's' : ''}?`,
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await Promise.all(
                listData.filter(i => selectedIds.includes(i._id)).map(i => {
                  if (i.__isFolder) return deleteSubFolder(material._id, i._id);
                  if (activeFolder) return deleteSubFolderFile(material._id, activeFolder._id, i._id);
                  return deleteFile(material._id, i._id);
                })
              );
              setSubFolders(prev => prev.filter(s => !selectedIds.includes(s._id)));
              setFiles(prev => prev.filter(f => !selectedIds.includes(f._id)));
              exitSelectionMode();
              showToast('trash-outline', C.error, 'Items deleted');
            } catch (e) {
              showDialog('Error', e.response?.data?.message || 'Failed to delete some items.', [{ text: 'OK', style: 'cancel' }]);
            }
          },
        },
      ]
    );
  };

  const handleBulkShare = async () => {
    const names = filteredFiles
      .filter(i => selectedIds.includes(i._id))
      .map(i => `• ${i.name || ''}`)
      .join('\n');
    try {
      await Share.share({
        message: `Files from ${material.subjectName}:\n${names}\n\nAccess Code: ${material.accessCode || material.departmentCode}\n${APP_URL}`,
      });
    } catch {}
    exitSelectionMode();
  };

  // ── Single-item delete ────────────────────────────────────────────────────
  const handleDeleteFile = (file) => {
    showDialog('Delete File?', `"${file.name}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            if (activeFolder) {
              await deleteSubFolderFile(material._id, activeFolder._id, file._id);
              setActiveFolder(prev => ({ ...prev, files: prev.files.filter(f => f._id !== file._id) }));
            } else {
              await deleteFile(material._id, file._id);
              setFiles(prev => prev.filter(f => f._id !== file._id));
            }
            showToast('trash-outline', C.error, 'File deleted');
          } catch (e) {
            showDialog('Error', e.response?.data?.message || 'Failed to delete.', [{ text: 'OK', style: 'cancel' }]);
          }
        },
      },
    ]);
  };

  const handleDeleteSubFolder = (sf) => {
    showDialog(
      'Delete Folder?',
      `"${sf.name}" and all its files will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await deleteSubFolder(material._id, sf._id);
              setSubFolders(prev => prev.filter(s => s._id !== sf._id));
              showToast('trash-outline', C.error, 'Folder deleted');
            } catch (e) {
              showDialog('Error', e.response?.data?.message || 'Failed to delete folder.', [{ text: 'OK', style: 'cancel' }]);
            }
          },
        },
      ]
    );
  };

  // ── Message / Announcement ────────────────────────────────────────────────
  const handleSaveMessage = async () => {
    setSavingMsg(true);
    try {
      await updateMessage(material._id, msgText);
      setMaterial(prev => ({ ...prev, messageToStudents: msgText }));
      setMsgModalOpen(false);
      showToast('megaphone-outline', C.accent, 'Announcement saved');
    } catch (e) {
      showDialog('Error', e.response?.data?.message || 'Failed to save message.', [{ text: 'OK', style: 'cancel' }]);
    } finally { setSavingMsg(false); }
  };

  // ── WhatsApp share ────────────────────────────────────────────────────────
  const handleShareWhatsApp = () => {
    const code    = material.accessCode || material.departmentCode || '—';
    const subject = material.subjectName || 'Study Material';
    const faculty = material.facultyName || '';
    const dept    = material.department  || '';
    const sem     = material.semester    ? `Semester ${material.semester}` : '';
    const msg =
      `📚 *${subject}*\n` +
      (faculty ? `👨‍🏫 Faculty: ${faculty}\n` : '') +
      (dept    ? `🏫 Department: ${dept}\n`   : '') +
      (sem     ? `📅 ${sem}\n`                : '') +
      `\n🔑 *Access Code: \`${code}\`*\n\n` +
      `Open StudyShala → Enter Code and type the above code.\n\n🔗 ${APP_URL}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(msg)}`).catch(() =>
      showDialog('WhatsApp Not Found', 'WhatsApp does not appear to be installed on this device.', [{ text: 'OK', style: 'cancel' }])
    );
  };

  // ── Copy code ─────────────────────────────────────────────────────────────
  const handleCopyCode = () => {
    const code = material.accessCode || material.departmentCode || '';
    try { Clipboard.setString(code); } catch {}
    setCodeCopied(true);
    showToast('copy-outline', C.accent, 'Access code copied!');
    setTimeout(() => setCodeCopied(false), 1800);
  };

  // ── Enter / exit subfolder ────────────────────────────────────────────────
  const enterFolder = (item) => {
    setActiveFolder({ ...item, files: Array.isArray(item.files) ? item.files : [] });
    setQuery(''); setActiveFilter('all');
  };
  const exitFolder = () => {
    setActiveFolder(null); setQuery(''); setActiveFilter('all');
  };

  // ── Search bar ────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[s.root, s.center]} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  const code         = material.accessCode || material.departmentCode;
  const hasNote      = !!material.messageToStudents;
  const allSelected  = filteredFiles.length > 0 && filteredFiles.every(f => selectedIds.includes(f._id));

  // ── SHARED HEADER ─────────────────────────────────────────────────────────
  const renderHeader = (isSubFolder = false) => {
    // SELECTION MODE
    if (selectionMode) {
      const hasAny = selectedIds.length > 0;
      return (
        <View style={[s.header, s.headerSelection]}>
          <TouchableOpacity style={s.iconBtn} onPress={exitSelectionMode} activeOpacity={0.75}>
            <Ionicons name="close" size={18} color={C.textSec} />
          </TouchableOpacity>

          <View style={s.headerMid}>
            <View>
              <Text style={s.headerTitle}>
                {hasAny ? `${selectedIds.length} Selected` : 'Select Items'}
              </Text>
              <Text style={s.headerSub}>
                {hasAny
                  ? `of ${filteredFiles.length} file${filteredFiles.length !== 1 ? 's' : ''}`
                  : 'Tap items to select'}
              </Text>
            </View>
          </View>

          <View style={s.headerRight}>
            <TouchableOpacity
              style={[s.iconBtn, allSelected && s.iconBtnAccent]}
              onPress={allSelected ? () => setSelectedIds([]) : handleSelectAll}
              activeOpacity={0.75}
            >
              <Ionicons
                name={allSelected ? 'checkbox' : 'checkbox-outline'}
                size={17}
                color={allSelected ? C.white : C.textSec}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.iconBtn, hasAny && s.iconBtnDanger]}
              onPress={handleBulkDelete}
              disabled={!hasAny}
              activeOpacity={0.75}
            >
              <Ionicons name="trash-outline" size={17} color={hasAny ? C.white : C.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.iconBtn, hasAny && s.iconBtnAccent]}
              onPress={handleBulkShare}
              disabled={!hasAny}
              activeOpacity={0.75}
            >
              <Ionicons name="share-social-outline" size={17} color={hasAny ? C.white : C.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={s.iconBtn} onPress={() => setOverflowVisible(true)} activeOpacity={0.75}>
              <Text style={s.overflowDots}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // NORMAL MODE
    return (
      <View style={s.header}>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={isSubFolder ? exitFolder : () => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Ionicons name="arrow-back" size={18} color={C.textSec} />
        </TouchableOpacity>

        <View style={s.headerMid}>
          <View style={s.headerIconBox}>
            <Ionicons
              name={isSubFolder ? 'folder-open-outline' : 'book-outline'}
              size={16}
              color={C.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {isSubFolder ? activeFolder.name : material.subjectName}
            </Text>
            <Text style={s.headerSub} numberOfLines={1}>
              {isSubFolder
                ? material.subjectName
                : [material.department, material.semester && `Sem ${material.semester}`]
                    .filter(Boolean).join('  ·  ')}
            </Text>
          </View>
        </View>

        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={toggleSearch} activeOpacity={0.75}>
            <Ionicons
              name={searchVisible ? 'close' : 'search-outline'}
              size={18}
              color={searchVisible ? C.accent : C.textSec}
            />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => setOverflowVisible(true)} activeOpacity={0.75}>
            <Text style={s.overflowDots}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── SUB-FOLDER VIEW ───────────────────────────────────────────────────────
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
              <ResultsHeader
                count={filteredFiles.length}
                isFiltering={isFiltering}
                onClear={() => { setQuery(''); setActiveFilter('all'); }}
              />
            }
            renderItem={({ item }) => (
              <FacultyFileCard
                file={item}
                onPress={handleFilePress}
                onLongPress={handleFileLongPress}
                onDeletePress={handleDeleteFile}
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
          onUpload={() => navigation.navigate('UploadFiles', { material })}
          onAnnounce={() => setMsgModalOpen(true)}
          onSelectFiles={enterSelectionMode}
          onRefresh={loadDetails}
          onSelectAll={handleSelectAll}
          onDeleteSelected={handleBulkDelete}
          onShareSelected={handleBulkShare}
          onCancelSelection={exitSelectionMode}
        />
      </View>
    );
  }

  // ── MAIN VIEW ─────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {renderHeader(false)}

        <FlatList
          data={listData}
          keyExtractor={item => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          extraData={selectedIds}
          ListHeaderComponent={
            <>
              {/* Access code card */}
              {!!code && (
                <View style={s.codeCard}>
                  <View style={s.codeLeft}>
                    <Text style={s.codeLabel}>STUDENT ACCESS CODE</Text>
                    <Text style={s.codeValue}>{code}</Text>
                  </View>
                  <View style={s.codeActions}>
                    <TouchableOpacity
                      style={[s.codePill, codeCopied && s.codePillSuccess]}
                      onPress={handleCopyCode}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={codeCopied ? 'checkmark' : 'copy-outline'}
                        size={13}
                        color={codeCopied ? C.success : C.accent}
                      />
                      <Text style={[s.codePillText, codeCopied && { color: C.success }]}>
                        {codeCopied ? 'Copied!' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.codePill, s.codePillWa]}
                      onPress={handleShareWhatsApp}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
                      <Text style={[s.codePillText, { color: '#25D366' }]}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Action chips — Upload / Announce / WhatsApp */}
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={s.actionChip}
                  onPress={() => navigation.navigate('UploadFiles', { material })}
                  activeOpacity={0.75}
                >
                  <Ionicons name="cloud-upload-outline" size={15} color={C.accent} />
                  <Text style={[s.actionChipText, { color: C.accent }]}>Upload</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionChip} onPress={() => setMsgModalOpen(true)} activeOpacity={0.75}>
                  <Ionicons name="megaphone-outline" size={15} color={C.textSec} />
                  <Text style={[s.actionChipText, { color: C.textSec }]}>Announce</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionChip} onPress={handleShareWhatsApp} activeOpacity={0.75}>
                  <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                  <Text style={[s.actionChipText, { color: '#25D366' }]}>Share</Text>
                </TouchableOpacity>
              </View>

              {/* Announcement banner */}
              {hasNote && (
                <TouchableOpacity
                  style={s.announceBanner}
                  onPress={() => setMsgModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="megaphone-outline" size={14} color={C.accent} />
                  <Text style={s.announceText} numberOfLines={2}>
                    {material.messageToStudents}
                  </Text>
                  <Ionicons name="create-outline" size={13} color={C.accent} />
                </TouchableOpacity>
              )}

              {/* Search bar */}
              {renderSearchBar()}

              {/* Filter chips */}
              <FilterRow activeFilter={activeFilter} onSelect={setActiveFilter} />

              {/* Recently opened */}
              {recentFiles.length > 0 && !isFiltering && (
                <RecentlyOpened files={recentFiles} onPress={handleFilePress} />
              )}

              {/* Section label / results */}
              <ResultsHeader
                count={listData.length}
                isFiltering={isFiltering}
                onClear={() => { setQuery(''); setActiveFilter('all'); }}
              />
            </>
          }
          renderItem={({ item }) =>
            item.__isFolder ? (
              <FolderCard
                item={item}
                onPress={() => enterFolder(item)}
                onLongPress={() => {
                  if (!selectionMode) { enterSelectionMode(); toggleSelect(item._id); }
                  else toggleSelect(item._id);
                }}
                onDelete={() => handleDeleteSubFolder(item)}
                selectionMode={selectionMode}
                isSelected={selectedIds.includes(item._id)}
              />
            ) : (
              <FacultyFileCard
                file={item}
                onPress={handleFilePress}
                onLongPress={handleFileLongPress}
                onDeletePress={handleDeleteFile}
                selectionMode={selectionMode}
                isSelected={selectedIds.includes(item._id)}
              />
            )
          }
          ListEmptyComponent={<EmptyState isFiltering={isFiltering} />}
        />
      </SafeAreaView>

      {/* Announce modal */}
      <Modal visible={msgModalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <SafeAreaView style={s.modalCard} edges={['bottom']}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Announce to Students</Text>
                <Text style={s.modalHint}>Shown every time students open this material</Text>
              </View>
              <TouchableOpacity style={s.iconBtn} onPress={() => setMsgModalOpen(false)}>
                <Ionicons name="close" size={18} color={C.textSec} />
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

      <Toast {...toast} />
      <ThemedDialog {...dialog} onDismiss={() => setDialog(d => ({ ...d, visible: false }))} />
      <OverflowMenu
        visible={overflowVisible}
        onClose={() => setOverflowVisible(false)}
        selectionMode={selectionMode}
        hasSelection={selectedIds.length > 0}
        onUpload={() => navigation.navigate('UploadFiles', { material })}
        onAnnounce={() => setMsgModalOpen(true)}
        onSelectFiles={enterSelectionMode}
        onRefresh={loadDetails}
        onSelectAll={handleSelectAll}
        onDeleteSelected={handleBulkDelete}
        onShareSelected={handleBulkShare}
        onCancelSelection={exitSelectionMode}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderSub,
    gap: 8,
  },
  headerSelection: {
    borderBottomColor: C.accentBorder,
    backgroundColor: 'rgba(222,115,86,0.04)',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnAccent: { backgroundColor: C.accent, borderColor: C.accent },
  iconBtnDanger: { backgroundColor: C.error,  borderColor: C.error  },
  headerMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox: {
    width: 34, height: 34, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle:   { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  headerSub:     { fontSize: T.xs, color: C.textMuted, marginTop: 1 },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  overflowDots:  { fontSize: 20, color: C.textSec, lineHeight: 22 },

  // ── Search bar ────────────────────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: T.base, color: C.textPrimary, padding: 0 },

  // ── Filter chips ─────────────────────────────────────────────────────────
  filterScroll: { flexGrow: 0 },
  filterRow: {
    flexDirection: 'row', gap: 7,
    paddingHorizontal: 0, paddingTop: 8, paddingBottom: 0,
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

  // ── Access code card ──────────────────────────────────────────────────────
  codeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    marginHorizontal: 0, marginTop: 3,
    borderRadius: R.md,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: C.accentBorder,
  },
  codeLeft:  { flex: 1, marginRight: 8 },
  codeLabel: {
    fontSize: 9, fontWeight: '700',
    color: C.accent, letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 5,
  },
  codeValue: {
    fontSize: 22, fontWeight: '800',
    color: C.textPrimary, letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  codeActions: { flexDirection: 'row', gap: 6 },
  codePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.accentBg,
    borderWidth: 1, borderColor: C.accentBorder,
    borderRadius: R.full,
    paddingVertical: 6, paddingHorizontal: 11,
  },
  codePillSuccess: {
    backgroundColor: 'rgba(74,222,128,0.09)',
    borderColor: 'rgba(74,222,128,0.3)',
  },
  codePillWa: {
    backgroundColor: 'rgba(37,211,102,0.07)',
    borderColor: 'rgba(37,211,102,0.3)',
  },
  codePillText: { fontSize: T.xs, fontWeight: '700', color: C.accent },

  // ── Action chips ──────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row', gap: 8,
    marginHorizontal: 0, marginTop: 10,
  },
  actionChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  actionChipText: { fontSize: T.xs + 1, fontWeight: '700' },

  // ── Announcement banner (tappable to edit) ────────────────────────────────
  announceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accentBg,
    borderWidth: 1, borderColor: C.accentBorder,
    borderRadius: R.sm, padding: 11,
    marginHorizontal: 0, marginTop: 10,
  },
  announceText: { flex: 1, fontSize: T.sm, color: C.accent, lineHeight: 18 },

  // ── Recently opened ───────────────────────────────────────────────────────
  recentWrap: { marginHorizontal: 0, marginTop: 10, marginBottom: 4 },
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

  // ── Section label ─────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: T.xs, fontWeight: '600', letterSpacing: 0.5,
    textTransform: 'uppercase', color: C.textMuted, marginBottom: 8,
  },

  // ── Results row ───────────────────────────────────────────────────────────
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

  // ── Folder card ───────────────────────────────────────────────────────────
  folderCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 11, paddingHorizontal: 12, marginBottom: 8,
    overflow: 'hidden',
  },
  folderCardSelected: {
    borderColor: C.accent,
    backgroundColor: 'rgba(222,115,86,0.09)',
  },
  folderAccentBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: C.accent, borderRadius: 2,
  },
  folderIconBox: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  folderIconBoxSelected: {
    backgroundColor: C.accentBg,
    borderColor: C.accent,
  },
  folderBody: { flex: 1 },
  folderName: { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  folderMeta: { fontSize: T.xs, color: C.textMuted },

  // ── List ──────────────────────────────────────────────────────────────────
  list: { paddingHorizontal: 14, paddingBottom: 40, paddingTop: 4 },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: C.surface, borderRadius: R.xl, paddingVertical: 36,
    alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 12,
  },
  emptyEmoji: { fontSize: 38, marginBottom: 10 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  emptyDesc:  { fontSize: T.sm, color: C.textMuted, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },

  // ── Toast ─────────────────────────────────────────────────────────────────
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

  // ── Themed dialog ─────────────────────────────────────────────────────────
  dialogOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  dialogBox: {
    width: '100%', backgroundColor: C.surface,
    borderRadius: R.xl, padding: 22,
    borderWidth: 1, borderColor: C.border,
  },
  dialogTitle:              { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  dialogMsg:                { fontSize: T.sm, color: C.textSec, lineHeight: 18, marginBottom: 18 },
  dialogBtns:               { flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'flex-end' },
  dialogBtn:                { paddingHorizontal: 16, paddingVertical: 9, borderRadius: R.sm, borderWidth: 1, borderColor: C.border },
  dialogBtnCancel:          { backgroundColor: C.elevated },
  dialogBtnPrimary:         { backgroundColor: C.accent, borderColor: C.accent },
  dialogBtnDestructive:     { backgroundColor: 'rgba(248,113,113,0.10)', borderColor: C.error },
  dialogBtnText:            { fontSize: T.sm, fontWeight: '600' },
  dialogBtnTextCancel:      { color: C.textSec },
  dialogBtnTextPrimary:     { color: C.white },
  dialogBtnTextDestructive: { color: C.error },

  // ── Announce modal ────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingTop: 0,
    borderTopWidth: 1, borderColor: C.border,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.elevated, alignSelf: 'center',
    marginTop: 10, marginBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14,
  },
  modalTitle:      { fontSize: T.base + 3, fontWeight: '800', color: C.textPrimary },
  modalHint:       { fontSize: T.xs, color: C.textMuted, marginTop: 2 },
  modalTextarea: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: R.md,
    padding: 14, fontSize: T.base, color: C.textPrimary,
    backgroundColor: C.bg, minHeight: 120, textAlignVertical: 'top',
  },
  charCount:       { fontSize: T.xs, color: C.textMuted, textAlign: 'right', marginTop: 4, marginBottom: 16 },
  modalFooter:     { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderRadius: R.md, backgroundColor: C.elevated,
    borderWidth: 1, borderColor: C.border,
  },
  modalCancelText: { fontSize: T.md, fontWeight: '700', color: C.textSec },
  modalSaveBtn:    { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: R.md, backgroundColor: C.accent },
  modalSaveText:   { fontSize: T.md, fontWeight: '700', color: C.white },
});

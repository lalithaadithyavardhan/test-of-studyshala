/**
 * screens/MaterialAccessScreen.jsx
 * ===================================
 * Reached from EnterCodeScreen ("Open Now") or SavedMaterialsScreen — the
 * single most-used screen in the app, so its underlying behavior is
 * untouched here. Only the look, navigation structure, and interaction
 * polish are new (inspired by a colleague's version of this screen).
 *
 * CORE BEHAVIOR — unchanged from our working version:
 *  - Cache-first file listing (materialFilesCache) so a material stays
 *    browsable offline once it's been opened before.
 *  - Every file downloads automatically the moment the list loads — no
 *    manual "download" tap anywhere. The bookmark button in the header
 *    ONLY adds/removes this material from the Saved Materials list; it
 *    does not gate downloading in any way (per explicit decision — his
 *    version's bookmark button doubled as a manual download trigger,
 *    ours does not, since we deliberately made saving fully automatic).
 *  - Opening a file always goes through our real fileActions.openFile()
 *    pipeline: verified local copy → online preview → honest "not
 *    downloaded yet" message. Never touches expo-intent-launcher.
 *  - Per-file download status (queued/downloading/saved) is still shown,
 *    plus the overall "Saving files — X/Y done" banner — his design
 *    doesn't have an equivalent, so these are kept as-is.
 *
 * NEW, purely additive (no conflict with the above):
 *  - Subfolder drill-down navigation (enter/exit a folder as its own view)
 *  - Search + file-type filter chips
 *  - Recently-opened chips row (tracked locally per material)
 *  - Multi-select mode for bulk export/share (uses fileActions.exportFile,
 *    i.e. "send this file out of the app" — unrelated to offline saving)
 *  - Themed toast/dialog components instead of the plain OS Alert
 *  - Faculty note modal (shown only if the material actually has one)
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Animated,
  Modal,
  Pressable,
  Share,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SidebarDrawer from '../components/SidebarDrawer';
import {
  getMaterialFiles, saveMaterial, removeSavedMaterial,
  starFile, unstarFile, getStarredFiles,
} from '../api/studentApi';
import { openFile, exportFile } from '../utils/fileActions';
import { isAvailableOffline, saveFileOffline, removeFileOffline } from '../utils/fileRepository';
import { getCachedMaterialFiles, setCachedMaterialFiles, flattenMaterialFiles } from '../utils/materialFilesCache';
import { storage } from '../database/db';
import { scopedKey } from '../utils/accountScope';
import { useAuth } from '../context/AuthContext';

// ─── Theme — matches the restyled SavedMaterialsScreen exactly ──────────────
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
  success:      '#4CAF50',
  error:        '#f87171',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, xxl: 20, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18 };

// ─── Subject icon map (identical to SavedMaterialsScreen) ────────────────────
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
  if (n.includes('data') || n.includes('algorithm') || n.includes('program') || n.includes('operating') || n.includes('network') || n.includes('software') || n.includes('computer') || n.includes('web') || n.includes('database') || n.includes('cloud') || n.includes('devops')) return SUBJECT_ICONS.cs;
  if (n.includes('math') || n.includes('calculus') || n.includes('algebra') || n.includes('statistic')) return SUBJECT_ICONS.math;
  if (n.includes('physics') || n.includes('mechanic') || n.includes('electro')) return SUBJECT_ICONS.physics;
  if (n.includes('chem')) return SUBJECT_ICONS.chemistry;
  if (n.includes('bio') || n.includes('life')) return SUBJECT_ICONS.bio;
  if (n.includes('english') || n.includes('communication') || n.includes('language')) return SUBJECT_ICONS.english;
  if (n.includes('history') || n.includes('social')) return SUBJECT_ICONS.history;
  return SUBJECT_ICONS.default;
}

// ─── File type helpers ────────────────────────────────────────────────────────
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
  const name = (file.name || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'ppt';
  if (mime.includes('video') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].some((e) => name.endsWith('.' + e))) return 'video';
  if (mime.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].some((e) => name.endsWith('.' + e))) return 'image';
  if (mime.includes('word') || mime.includes('text') || ['doc', 'docx', 'txt', 'md'].some((e) => name.endsWith('.' + e))) return 'notes';
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

const FILTERS = [
  { key: 'all',   label: 'All',    icon: 'apps-outline' },
  { key: 'pdf',   label: 'PDFs',   icon: 'document-text-outline' },
  { key: 'ppt',   label: 'PPTs',   icon: 'easel-outline' },
  { key: 'notes', label: 'Notes',  icon: 'reader-outline' },
  { key: 'video', label: 'Videos', icon: 'videocam-outline' },
];

// ─── Recently opened — local per-material list, via our own storage module ──
const MAX_RECENT = 5;
const recentKey = (materialId) => scopedKey(`recentFilesFor:${materialId}`);

async function loadRecentFiles(materialId) {
  const list = await storage.get(recentKey(materialId));
  return Array.isArray(list) ? list : [];
}
async function persistRecentFile(materialId, file) {
  try {
    const existing = await loadRecentFiles(materialId);
    const deduped = existing.filter((f) => f._id !== file._id);
    const updated = [{ _id: file._id, name: file.name, mimeType: file.mimeType }, ...deduped].slice(0, MAX_RECENT);
    await storage.set(recentKey(materialId), updated);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE CARD — with our real per-file offline status baked in
// ─────────────────────────────────────────────────────────────────────────────
function FileCard({ file, onPress, onLongPress, onStarPress, isStarred, selectionMode, isSelected, offlineStatus }) {
  const ft = FILE_TYPE[getFileType(file)] || FILE_TYPE.other;

  const checkScale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const checkOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(selectionMode ? 0 : -30)).current;

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: selectionMode ? 0 : -30, duration: 180, useNativeDriver: true }).start();
  }, [selectionMode]);

  useEffect(() => {
    if (isSelected) {
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
        Animated.timing(checkOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(checkScale, { toValue: 0.5, duration: 120, useNativeDriver: true }),
        Animated.timing(checkOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
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

      {/* Offline status — ours, kept regardless of the visual refresh */}
      {!selectionMode && (
        <View style={fc.offlineIcon}>
          {offlineStatus === 'downloading' ? (
            <ActivityIndicator size={13} color={C.accent} />
          ) : offlineStatus === 'saved' ? (
            <Ionicons name="checkmark-circle" size={15} color={C.success} />
          ) : (
            <Ionicons name="time-outline" size={14} color={C.textMuted} />
          )}
        </View>
      )}

      {!selectionMode ? (
        <TouchableOpacity onPress={() => onStarPress(file)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={fc.starBtn}>
          <Ionicons name={isStarred ? 'star' : 'star-outline'} size={17} color={isStarred ? C.accent : C.textMuted} />
        </TouchableOpacity>
      ) : (
        <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={isSelected ? C.accent : C.border} />
      )}
    </TouchableOpacity>
  );
}

const fc = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 8, overflow: 'hidden' },
  rootSelected: { borderColor: C.accent, backgroundColor: 'rgba(222,115,86,0.09)' },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.accent, borderRadius: 2 },
  checkbox: { width: 22, height: 22, borderRadius: R.sm, borderWidth: 1.5, borderColor: C.textMuted, backgroundColor: C.elevated, alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  checkboxSelected: { backgroundColor: C.accent, borderColor: C.accent },
  iconBox: { width: 40, height: 40, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 12, flexShrink: 0 },
  body: { flex: 1, gap: 3 },
  name: { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  nameSelected: { color: C.textPrimary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: T.xs, color: C.textMuted },
  metaDot: { fontSize: T.xs, color: C.textMuted },
  offlineIcon: { paddingHorizontal: 6, width: 26, alignItems: 'center' },
  starBtn: { paddingLeft: 4 },
});

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ visible, icon, iconColor, message, sub }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 140, friction: 9 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 16, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
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

// ─── Themed dialog (replaces the plain OS Alert) ─────────────────────────────
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
                style={[s.dialogBtn, btn.style === 'cancel' && s.dialogBtnCancel, btn.style === 'destructive' && s.dialogBtnDestructive, !btn.style && s.dialogBtnPrimary]}
                onPress={() => { onDismiss(); btn.onPress?.(); }}
                activeOpacity={0.8}
              >
                <Text style={[s.dialogBtnText, btn.style === 'cancel' && s.dialogBtnTextCancel, btn.style === 'destructive' && s.dialogBtnTextDestructive, !btn.style && s.dialogBtnTextPrimary]}>
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

function FacultyNoteModal({ visible, note, onClose }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={s.dialogOverlay} onPress={onClose}>
        <Pressable style={s.dialogBox} onPress={() => {}}>
          <View style={s.noteModalHeader}>
            <View style={s.noteModalIconBox}><Ionicons name="megaphone" size={15} color={C.accent} /></View>
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

// ─── Overflow menu ────────────────────────────────────────────────────────────
function OverflowMenu({
  visible, onClose,
  onRefresh, onSelectFiles, onShareSubject,
  selectionMode, onSelectAll, onDownloadSelected, onShareSelected, onCancelSelection, hasSelection,
}) {
  if (!visible) return null;

  const normalItems = [
    { icon: 'checkbox-outline', label: 'Select Files', onPress: onSelectFiles },
    { icon: 'refresh-outline', label: 'Refresh', onPress: onRefresh },
    { icon: 'share-social-outline', label: 'Share Subject', onPress: onShareSubject },
  ];
  const selectionItems = [
    { icon: 'checkbox-outline', label: 'Select All', onPress: onSelectAll, accent: false },
    { icon: 'share-social-outline', label: 'Export Selected', onPress: onDownloadSelected, accent: hasSelection },
    { icon: 'share-outline', label: 'Share Selected', onPress: onShareSelected, accent: hasSelection },
    { icon: 'close-circle-outline', label: 'Cancel Selection', onPress: onCancelSelection, danger: true },
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
              <TouchableOpacity style={om.item} onPress={() => { onClose(); item.onPress?.(); }} activeOpacity={0.7}>
                <View style={[om.iconWrap, item.accent && om.iconWrapAccent, item.danger && om.iconWrapDanger]}>
                  <Ionicons name={item.icon} size={16} color={item.accent ? C.accent : item.danger ? C.error : C.textSec} />
                </View>
                <Text style={[om.itemText, item.accent && om.itemTextAccent, item.danger && om.itemTextDanger]}>{item.label}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const om = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 88, paddingRight: 14 },
  menu: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, minWidth: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 16, overflow: 'hidden' },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.borderSub },
  menuHeaderText: { fontSize: T.xs, fontWeight: '600', color: C.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  iconWrap: { width: 30, height: 30, borderRadius: R.sm, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  iconWrapAccent: { backgroundColor: C.accentBg, borderColor: C.accentBorder },
  iconWrapDanger: { backgroundColor: 'rgba(248,113,113,0.10)', borderColor: 'rgba(248,113,113,0.25)' },
  itemText: { fontSize: T.sm, fontWeight: '500', color: C.textPrimary },
  itemTextAccent: { color: C.accent },
  itemTextDanger: { color: C.error },
  divider: { height: 1, backgroundColor: C.borderSub, marginHorizontal: 10 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function MaterialAccessScreen({ route, navigation }) {
  const { material: initialMaterial } = route.params || {};
  const { user, logout } = useAuth();

  const [material, setMaterial] = useState(initialMaterial);
  const [files, setFiles] = useState([]);
  const [subFolders, setSubFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [offlineNotice, setOfflineNotice] = useState('');

  const [starredIds, setStarredIds] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [recentFiles, setRecentFiles] = useState([]);
  const [noteVisible, setNoteVisible] = useState(false);

  const [query, setQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [toast, setToast] = useState({ visible: false });
  const [dialog, setDialog] = useState({ visible: false });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overflowVisible, setOverflowVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Our real per-file download status — unchanged mechanism from before.
  const [offlineMap, setOfflineMap] = useState({});      // fileId -> 'saved' | 'downloading' | undefined
  const autoDownloadRunId = useRef(0);

  const toastTimer = useRef(null);
  const searchRef = useRef(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  const showToast = (icon, iconColor, message, sub) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, icon, iconColor, message, sub });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  };
  const showDialog = (title, message, buttons) => setDialog({ visible: true, title, message, buttons });

  const toggleSearch = () => {
    if (searchVisible) {
      setQuery('');
      Animated.timing(searchAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => setSearchVisible(false));
    } else {
      setSearchVisible(true);
      Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start(() => searchRef.current?.focus());
    }
  };

  const allFilesFlat = useCallback((f, sf) => [...(f || []), ...(sf || []).flatMap((x) => x.files || [])], []);

  // ── Our real auto-download loop — unchanged behavior, no manual trigger ──
  const autoDownloadAll = useCallback(async (allFiles) => {
    const runId = ++autoDownloadRunId.current;
    for (const file of allFiles) {
      if (runId !== autoDownloadRunId.current) return;
      const already = await isAvailableOffline(file._id);
      if (already) {
        setOfflineMap((prev) => ({ ...prev, [file._id]: 'saved' }));
        continue;
      }
      setOfflineMap((prev) => ({ ...prev, [file._id]: 'downloading' }));
      try {
        await saveFileOffline(file, material);
        setOfflineMap((prev) => ({ ...prev, [file._id]: 'saved' }));
      } catch {
        setOfflineMap((prev) => ({ ...prev, [file._id]: undefined }));
      }
    }
  }, [material]);

  // ── File listing — cache-first, unchanged ────────────────────────────────
  const loadFiles = useCallback(async () => {
    if (!initialMaterial?._id) {
      setError('No material selected.');
      setLoading(false);
      return;
    }
    setError('');
    setOfflineNotice('');

    let hadCache = false;
    try {
      const cached = await getCachedMaterialFiles(initialMaterial._id);
      if (cached) {
        setFiles(cached.files || []);
        setSubFolders(cached.subFolders || []);
        hadCache = true;
        setLoading(false);
      }
    } catch {}

    try {
      const { data } = await getMaterialFiles(initialMaterial._id);
      setMaterial((prev) => ({ ...prev, ...data.material }));
      const f = data.files || [];
      const sf = data.subFolders || [];
      setFiles(f);
      setSubFolders(sf);
      if (data.material?.isSaved !== undefined) setIsSaved(!!data.material.isSaved);

      try { await setCachedMaterialFiles(initialMaterial._id, { files: f, subFolders: sf }); } catch {}

      autoDownloadAll(allFilesFlat(f, sf));
    } catch (e) {
      if (hadCache) {
        setOfflineNotice('Offline — showing your last saved file list.');
      } else {
        setError(e.response?.data?.message || 'Could not load materials. Connect to the internet and try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [initialMaterial, allFilesFlat, autoDownloadAll]);

  const loadStarred = useCallback(async () => {
    try {
      const result = await storage.getAllByPrefix(scopedKey('starred:'));
      const cachedIds = (result || []).map((entry) => entry.fileId).filter(Boolean);
      if (cachedIds.length) setStarredIds(cachedIds);
    } catch {}
    try {
      const { data } = await getStarredFiles();
      const serverIds = (data.starredFiles || []).map((s) => s.fileId);
      setStarredIds(serverIds);
      for (const f of data.starredFiles || []) {
        await storage.set(scopedKey(`starred:${f.fileId}`), {
          fileId: f.fileId, fileName: f.fileName, mimeType: f.mimeType,
          materialId: f.materialId, subjectName: f.subjectName,
          previewUrl: f.previewUrl || null, downloadUrl: f.downloadUrl || null,
          starredAt: f.starredAt || null,
        });
      }
    } catch {}
  }, []);

  const checkSavedStatus = useCallback(async () => {
    try {
      const cached = await storage.get(scopedKey(`saved:${initialMaterial._id}`));
      setIsSaved(!!cached);
    } catch {}
  }, [initialMaterial]);

  useEffect(() => {
    loadFiles();
    loadStarred();
    checkSavedStatus();
    loadRecentFiles(initialMaterial._id).then(setRecentFiles);
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = () => { setRefreshing(true); loadFiles(); };

  // ── Derived lists ─────────────────────────────────────────────────────────
  const currentFiles = activeFolder ? (activeFolder.files || []) : files;
  const q = query.trim().toLowerCase();

  const filteredFolders = useMemo(() => {
    if (activeFolder) return [];
    return (subFolders || []).filter((sf) => !q || sf.name?.toLowerCase().includes(q));
  }, [subFolders, q, activeFolder]);

  const filteredFiles = useMemo(() => {
    return (currentFiles || []).filter((file) => {
      const matchFilter = activeFilter === 'all' || getFileType(file) === activeFilter;
      const matchQuery = !q || file.name?.toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }, [currentFiles, activeFilter, q]);

  const listData = useMemo(() => [
    ...filteredFolders.map((sf) => ({ ...sf, __isFolder: true })),
    ...filteredFiles,
  ], [filteredFolders, filteredFiles]);

  const isFiltering = q.length > 0 || activeFilter !== 'all';
  const totalCount = allFilesFlat(files, subFolders).length;
  const savedCount = Object.values(offlineMap).filter((v) => v === 'saved').length;
  const isDownloading = Object.values(offlineMap).some((v) => v === 'downloading');

  // ── Star toggle ────────────────────────────────────────────────────────────
  const handleStarToggle = async (file) => {
    const already = starredIds.includes(file._id);
    try {
      if (already) {
        await unstarFile(file._id);
        setStarredIds((prev) => prev.filter((id) => id !== file._id));
        await storage.delete(scopedKey(`starred:${file._id}`));
      } else {
        await starFile({ fileId: file._id, fileName: file.name, mimeType: file.mimeType, materialId: material._id, subjectName: material.subjectName });
        setStarredIds((prev) => [...prev, file._id]);
        await storage.set(scopedKey(`starred:${file._id}`), {
          fileId: file._id, fileName: file.name, mimeType: file.mimeType,
          materialId: material._id, subjectName: material.subjectName,
          previewUrl: file.previewUrl || null, downloadUrl: file.downloadUrl || null,
          starredAt: new Date().toISOString(),
        });
      }
    } catch {
      showDialog('Error', 'Failed to update star.', [{ text: 'OK', style: 'cancel' }]);
    }
  };

  // ── Bookmark toggle — Saved Materials list membership ONLY. Downloading
  //    already happens automatically above regardless of this. ────────────
  const handleBookmarkToggle = async () => {
    setSavingBookmark(true);
    try {
      if (isSaved) {
        await removeSavedMaterial(material._id);
        await storage.delete(scopedKey(`saved:${material._id}`));
        setIsSaved(false);
        showToast('bookmark-outline', C.textSec, 'Removed from Saved Materials', material.subjectName);

        // Actually free the storage those files were using — previously
        // this only removed the bookmark, leaving downloaded files sitting
        // on the device with no way for the student to see or reclaim them.
        try {
          const cached = await getCachedMaterialFiles(material._id);
          const filesToRemove = flattenMaterialFiles(cached);
          for (const f of filesToRemove) {
            await removeFileOffline(f._id);
          }
          // Reflect it on screen immediately — otherwise the status icons
          // next to each file would keep showing a stale "saved" checkmark
          // until the next reload.
          setOfflineMap((prev) => {
            const next = { ...prev };
            for (const f of filesToRemove) delete next[f._id];
            return next;
          });
        } catch {}
      } else {
        await saveMaterial(material._id);
        await storage.set(scopedKey(`saved:${material._id}`), material);
        setIsSaved(true);
        showToast('bookmark', C.accent, 'Added to Saved Materials', material.subjectName);
      }
    } catch {
      showDialog('Error', 'Could not update Saved Materials. Check your connection.', [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setSavingBookmark(false);
    }
  };

  // ── Open / long-press ──────────────────────────────────────────────────────
  const handleFilePress = async (file) => {
    if (selectionMode) {
      setSelectedIds((prev) => (prev.includes(file._id) ? prev.filter((id) => id !== file._id) : [...prev, file._id]));
      return;
    }
    await persistRecentFile(material._id, file);
    setRecentFiles((prev) => [{ _id: file._id, name: file.name, mimeType: file.mimeType }, ...prev.filter((f) => f._id !== file._id)].slice(0, MAX_RECENT));
    await openFile(file, material, navigation);
  };

  const handleFileLongPress = (file) => {
    if (selectionMode) {
      setSelectedIds((prev) => (prev.includes(file._id) ? prev.filter((id) => id !== file._id) : [...prev, file._id]));
      return;
    }
    setSelectionMode(true);
    setSelectedIds([file._id]);
  };

  const enterFolder = (item) => { setActiveFolder({ ...item, files: item.files || [] }); setQuery(''); setActiveFilter('all'); };
  const exitFolder = () => { setActiveFolder(null); setQuery(''); setActiveFilter('all'); };

  const enterSelectionMode = () => { setSelectionMode(true); setSelectedIds([]); setOverflowVisible(false); };
  const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds([]); setOverflowVisible(false); };
  const handleSelectAll = () => setSelectedIds(filteredFiles.map((f) => f._id));
  const handleDeselectAll = () => setSelectedIds([]);

  const handleExportSelected = () => {
    const toExport = filteredFiles.filter((f) => selectedIds.includes(f._id));
    if (!toExport.length) { showToast('alert-circle-outline', C.error, 'No files selected'); return; }
    toExport.forEach((f) => exportFile(f));
    showToast('share-social-outline', C.accent, `Exporting ${toExport.length} file${toExport.length !== 1 ? 's' : ''}…`);
    exitSelectionMode();
  };

  const handleShareSelected = async () => {
    const toShare = filteredFiles.filter((f) => selectedIds.includes(f._id));
    if (!toShare.length) { showToast('alert-circle-outline', C.error, 'No files selected'); return; }
    exitSelectionMode();
    for (const file of toShare) exportFile(file);
  };

  const handleShareSubject = async () => {
    try { await Share.share({ message: `Check out ${material.subjectName} on StudyShala!`, title: material.subjectName }); } catch {}
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.root, s.center]} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  const subStyle = getSubjectStyle(material?.subjectName);
  const hasNote = !!material?.messageToStudents;

  const renderHeader = (isSubFolder = false) => {
    if (selectionMode) {
      const allVisible = filteredFiles.length > 0 && filteredFiles.every((f) => selectedIds.includes(f._id));
      const hasAny = selectedIds.length > 0;
      return (
        <View style={[s.header, s.headerSelection]}>
          <TouchableOpacity style={s.iconBtn} onPress={exitSelectionMode}><Ionicons name="close" size={18} color={C.textSec} /></TouchableOpacity>
          <View style={s.headerMid}>
            <View>
              <Text style={s.headerTitle}>{hasAny ? `${selectedIds.length} Selected` : 'Select Files'}</Text>
              <Text style={s.headerSub}>{hasAny ? `of ${filteredFiles.length} file${filteredFiles.length !== 1 ? 's' : ''}` : 'Tap files to select'}</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={[s.iconBtn, allVisible && s.iconBtnAccent]} onPress={allVisible ? handleDeselectAll : handleSelectAll}>
              <Ionicons name={allVisible ? 'checkbox' : 'checkbox-outline'} size={17} color={allVisible ? C.white : C.textSec} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.iconBtn, hasAny && s.iconBtnAccent]} onPress={handleExportSelected} disabled={!hasAny}>
              <Ionicons name="share-social-outline" size={17} color={hasAny ? C.white : C.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => setOverflowVisible(true)}><Text style={s.overflowDots}>⋮</Text></TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={isSubFolder ? exitFolder : () => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={C.textSec} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <View style={s.headerIconBox}>
            <Ionicons name={isSubFolder ? 'folder-open-outline' : subStyle.icon} size={16} color={C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>{isSubFolder ? activeFolder.name : material?.subjectName}</Text>
            <Text style={s.headerSub} numberOfLines={1}>
              {isSubFolder ? material?.subjectName : [material?.department, material?.semester ? `Sem ${material.semester}` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={toggleSearch}>
            <Ionicons name={searchVisible ? 'close' : 'search-outline'} size={18} color={C.textSec} />
          </TouchableOpacity>
          {!isSubFolder && (
            <TouchableOpacity style={[s.iconBtn, isSaved && s.iconBtnAccent]} onPress={handleBookmarkToggle} disabled={savingBookmark}>
              {savingBookmark
                ? <ActivityIndicator size="small" color={isSaved ? C.white : C.accent} />
                : <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={17} color={isSaved ? C.white : C.textSec} />}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.iconBtn} onPress={() => setOverflowVisible(true)}><Text style={s.overflowDots}>⋮</Text></TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSearchBar = () => (searchVisible ? (
    <Animated.View style={[s.searchWrap, { opacity: searchAnim }]}>
      <Ionicons name="search-outline" size={15} color={C.textMuted} />
      <TextInput
        ref={searchRef} style={s.searchInput} placeholder="Search files, folders…" placeholderTextColor={C.textMuted}
        value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none" returnKeyType="search"
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={15} color={C.textMuted} />
        </TouchableOpacity>
      )}
    </Animated.View>
  ) : null);

  const commonModals = (
    <>
      <Toast {...toast} />
      <ThemedDialog {...dialog} onDismiss={() => setDialog((d) => ({ ...d, visible: false }))} />
      <OverflowMenu
        visible={overflowVisible} onClose={() => setOverflowVisible(false)}
        selectionMode={selectionMode} hasSelection={selectedIds.length > 0}
        onRefresh={onRefresh} onSelectFiles={enterSelectionMode} onShareSubject={handleShareSubject}
        onSelectAll={handleSelectAll} onDownloadSelected={handleExportSelected} onShareSelected={handleShareSelected}
        onCancelSelection={exitSelectionMode}
      />
      <SidebarDrawer visible={sidebarOpen} onClose={() => setSidebarOpen(false)} navigation={navigation} role="student" user={user} onLogout={logout} />
    </>
  );

  const progressBanner = isDownloading && !error && (
    <View style={s.downloadBanner}>
      <ActivityIndicator size="small" color={C.accent} />
      <Text style={s.downloadText}>Saving files for offline access — {savedCount}/{totalCount} done</Text>
    </View>
  );

  if (activeFolder) {
    return (
      <View style={s.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          {renderHeader(true)}
          {progressBanner}
          {!selectionMode && renderSearchBar()}
          <FilterRow activeFilter={activeFilter} onSelect={setActiveFilter} />
          <FlatList
            data={filteredFiles}
            keyExtractor={(item) => item._id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            extraData={selectedIds}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
            ListHeaderComponent={<ResultsHeader count={filteredFiles.length} isFiltering={isFiltering} onClear={() => { setQuery(''); setActiveFilter('all'); }} />}
            renderItem={({ item }) => (
              <FileCard
                file={item} onPress={handleFilePress} onLongPress={handleFileLongPress} onStarPress={handleStarToggle}
                isStarred={starredIds.includes(item._id)} selectionMode={selectionMode} isSelected={selectedIds.includes(item._id)}
                offlineStatus={offlineMap[item._id]}
              />
            )}
            ListEmptyComponent={<EmptyState isFiltering={isFiltering} />}
          />
        </SafeAreaView>
        {commonModals}
      </View>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {renderHeader(false)}
        {progressBanner}

        {!!error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={C.error} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}
        {!error && !!offlineNotice && (
          <View style={s.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={14} color={C.textMuted} />
            <Text style={s.offlineBannerText}>{offlineNotice}</Text>
          </View>
        )}

        <FlatList
          data={listData}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          extraData={selectedIds}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
          ListHeaderComponent={
            <>
              {hasNote && (
                <TouchableOpacity style={s.noteBtn} onPress={() => setNoteVisible(true)} activeOpacity={0.8}>
                  <Ionicons name="megaphone-outline" size={13} color={C.accent} />
                  <Text style={s.noteBtnText}>Note from faculty</Text>
                  <Ionicons name="chevron-forward" size={13} color={C.accent} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}
              {renderSearchBar()}
              <FilterRow activeFilter={activeFilter} onSelect={setActiveFilter} />
              {recentFiles.length > 0 && !isFiltering && <RecentlyOpened files={recentFiles} onPress={handleFilePress} />}
              <ResultsHeader count={listData.length} isFiltering={isFiltering} onClear={() => { setQuery(''); setActiveFilter('all'); }} />
            </>
          }
          renderItem={({ item }) => item.__isFolder ? (
            <FolderCard item={item} onPress={() => enterFolder(item)} />
          ) : (
            <FileCard
              file={item} onPress={handleFilePress} onLongPress={handleFileLongPress} onStarPress={handleStarToggle}
              isStarred={starredIds.includes(item._id)} selectionMode={selectionMode} isSelected={selectedIds.includes(item._id)}
              offlineStatus={offlineMap[item._id]}
            />
          )}
          ListEmptyComponent={<EmptyState isFiltering={isFiltering} />}
        />
      </SafeAreaView>

      {commonModals}
      <FacultyNoteModal visible={noteVisible} note={material?.messageToStudents} onClose={() => setNoteVisible(false)} />
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function RecentlyOpened({ files, onPress }) {
  return (
    <View style={s.recentWrap}>
      <Text style={s.sectionLabel}>Recently opened</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {files.map((file) => {
          const ft = FILE_TYPE[getFileType(file)] || FILE_TYPE.other;
          return (
            <TouchableOpacity key={file._id} style={s.recentChip} onPress={() => onPress(file)} activeOpacity={0.75}>
              <View style={[s.recentChipIcon, { backgroundColor: ft.color + '18' }]}><Ionicons name={ft.icon} size={13} color={ft.color} /></View>
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow} style={s.filterScroll}>
      {FILTERS.map((f) => {
        const active = f.key === activeFilter;
        return (
          <TouchableOpacity key={f.key} style={[s.filterChip, active && s.filterChipActive]} onPress={() => onSelect(f.key)} activeOpacity={0.75}>
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
      <View style={s.folderIconBox}><Ionicons name="folder" size={18} color={C.accent} /></View>
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
      <Text style={s.emptyDesc}>{isFiltering ? 'Try a different search term or clear the filter.' : "Your faculty hasn't uploaded anything yet."}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderSub, gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: R.sm, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  iconBtnAccent: { backgroundColor: C.accent, borderColor: C.accent },
  headerSelection: { borderBottomColor: C.accentBorder, backgroundColor: 'rgba(222,115,86,0.04)' },
  headerMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox: { width: 34, height: 34, borderRadius: R.sm, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  headerSub: { fontSize: T.xs, color: C.textMuted, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  overflowDots: { fontSize: 20, color: C.textSec, lineHeight: 22 },

  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(248,113,113,0.1)', margin: 14, padding: 12, borderRadius: R.sm, borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)' },
  errorText: { flex: 1, fontSize: T.sm, color: C.error, lineHeight: 18 },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.elevated, marginHorizontal: 14, marginTop: 10, padding: 10, borderRadius: R.sm, borderWidth: 1, borderColor: C.border },
  offlineBannerText: { color: C.textMuted, fontSize: T.xs, fontWeight: '600', flex: 1 },
  downloadBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.accentBg, marginHorizontal: 14, marginTop: 10, padding: 10, borderRadius: R.sm, borderWidth: 1, borderColor: C.accentBorder },
  downloadText: { color: C.accent, fontSize: T.xs, fontWeight: '600', flex: 1 },

  noteBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 1, marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: C.accentBg, borderRadius: R.lg, borderWidth: 1, borderColor: C.accentBorder },
  noteBtnText: { fontSize: T.sm, fontWeight: '600', color: C.accent, flex: 1 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 1, marginTop: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: T.base, color: C.textPrimary, padding: 0 },

  filterScroll: { flexGrow: 0 },
  filterRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 1, paddingTop: 8, paddingBottom: 0 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: C.surface, borderRadius: R.full, borderWidth: 1, borderColor: C.border },
  filterChipActive: { backgroundColor: C.accentBg, borderColor: C.accentBorder },
  filterChipText: { fontSize: T.xs, fontWeight: '600', color: C.textMuted },
  filterChipTextActive: { color: C.accent },

  recentWrap: { marginHorizontal: 1, marginTop: 9, marginBottom: 4 },
  sectionLabel: { fontSize: T.xs, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 },
  recentChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.elevated, borderRadius: R.md, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: C.border, maxWidth: 170 },
  recentChipIcon: { width: 24, height: 24, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  recentChipName: { fontSize: T.xs, fontWeight: '500', color: C.textPrimary, flexShrink: 1 },

  resultsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  resultsText: { fontSize: T.xs, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: C.accentBg, borderRadius: R.full, borderWidth: 1, borderColor: C.accentBorder },
  clearBtnText: { fontSize: T.xs, fontWeight: '700', color: C.accent },

  folderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 8 },
  folderIconBox: { width: 36, height: 36, borderRadius: R.sm, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  folderBody: { flex: 1 },
  folderName: { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  folderMeta: { fontSize: T.xs, color: C.textMuted },

  list: { paddingHorizontal: 14, paddingBottom: 40, paddingTop: 4 },

  emptyCard: { backgroundColor: C.surface, borderRadius: R.xl, paddingVertical: 36, alignItems: 'center', borderWidth: 1, borderColor: C.border, marginTop: 12 },
  emptyEmoji: { fontSize: 38, marginBottom: 10 },
  emptyTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  emptyDesc: { fontSize: T.sm, color: C.textMuted, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18 },

  toast: { position: 'absolute', bottom: 26, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface2, borderRadius: R.full, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: C.border, zIndex: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 12, maxWidth: 300 },
  toastIconBox: { width: 28, height: 28, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  toastMsg: { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  toastSub: { fontSize: T.xs, color: C.textMuted, marginTop: 1 },

  dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  dialogBox: { width: '100%', backgroundColor: C.surface, borderRadius: R.xl, padding: 22, borderWidth: 1, borderColor: C.border },
  dialogTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  dialogMsg: { fontSize: T.sm, color: C.textSec, lineHeight: 18, marginBottom: 18 },
  dialogBtns: { flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'flex-end' },
  dialogBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: R.sm, borderWidth: 1, borderColor: C.border },
  dialogBtnCancel: { backgroundColor: C.elevated },
  dialogBtnPrimary: { backgroundColor: C.accent, borderColor: C.accent },
  dialogBtnDestructive: { backgroundColor: 'rgba(248,113,113,0.10)', borderColor: C.error },
  dialogBtnText: { fontSize: T.sm, fontWeight: '600' },
  dialogBtnTextCancel: { color: C.textSec },
  dialogBtnTextPrimary: { color: C.white },
  dialogBtnTextDestructive: { color: C.error },

  noteModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  noteModalIconBox: { width: 30, height: 30, borderRadius: R.sm, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, alignItems: 'center', justifyContent: 'center' },
  noteModalTitle: { flex: 1, fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  noteModalDivider: { height: 1, backgroundColor: C.borderSub, marginBottom: 14 },
  noteModalText: { fontSize: T.sm, color: C.textSec, lineHeight: 20, marginBottom: 20 },
  noteModalCloseBtn: { alignItems: 'center', paddingVertical: 10, backgroundColor: C.accent, borderRadius: R.md },
  noteModalCloseBtnText: { fontSize: T.sm, fontWeight: '700', color: C.white },
});
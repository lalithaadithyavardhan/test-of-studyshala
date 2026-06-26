/**
 * screens/FacultyMaterialsScreen.jsx — StudyShala
 * Redesigned to match MaterialAccessScreen warm dark theme exactly.
 * Accent: #DE7356 · bg: #13120f · surface: #1e1c19
 *
 * New features added:
 *  - Subject-type icon map (mirrors MaterialAccessScreen)
 *  - Stats strip: total subjects, total files across all folders
 *  - Sort: All / Recent / A–Z / Most Files
 *  - Per-card: file count badge, department chip, semester chip, upload date
 *  - Animated search bar (same toggle pattern as MaterialAccessScreen)
 *  - Long-press selection mode with bulk delete
 *  - Toast feedback system (same as MaterialAccessScreen)
 *  - ThemedDialog replacing system Alert for delete confirmation
 *  - Empty state with CTA, search-empty state
 *  - Overflow menu (Sort, Select All, Refresh)
 */

import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  ActivityIndicator, TouchableOpacity, ScrollView,
  Animated, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFolders, deleteFolder } from '../api/facultyApi';

// ─── Theme (pixel-match to MaterialAccessScreen) ─────────────────────────────
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
  success:      '#4ade80',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, xxl: 20, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18 };

// ─── Subject icon map (mirrors MaterialAccessScreen exactly) ─────────────────
const SUBJECT_ICONS = {
  default:   { icon: 'book-outline',        bg: 'rgba(222,115,86,0.14)',  color: '#DE7356' },
  cs:        { icon: 'code-slash-outline',  bg: 'rgba(222,115,86,0.10)',  color: '#C4623F' },
  math:      { icon: 'calculator-outline',  bg: 'rgba(177,173,161,0.12)', color: '#B1ADA1' },
  physics:   { icon: 'planet-outline',      bg: 'rgba(177,173,161,0.10)', color: '#9a9690' },
  chemistry: { icon: 'flask-outline',       bg: 'rgba(222,115,86,0.12)',  color: '#c86a4a' },
  bio:       { icon: 'leaf-outline',        bg: 'rgba(177,173,161,0.10)', color: '#B1ADA1' },
  english:   { icon: 'language-outline',    bg: 'rgba(222,115,86,0.14)',  color: '#DE7356' },
  history:   { icon: 'time-outline',        bg: 'rgba(177,173,161,0.12)', color: '#9a9690' },
};

function getSubjectStyle(name = '') {
  const n = name.toLowerCase();
  if (
    n.includes('data') || n.includes('algorithm') || n.includes('program') ||
    n.includes('operating') || n.includes('network') || n.includes('software') ||
    n.includes('computer') || n.includes('web') || n.includes('database') ||
    n.includes('cloud') || n.includes('devops')
  ) return SUBJECT_ICONS.cs;
  if (n.includes('math') || n.includes('calculus') || n.includes('algebra') || n.includes('statistic'))
    return SUBJECT_ICONS.math;
  if (n.includes('physics') || n.includes('mechanic') || n.includes('electro'))
    return SUBJECT_ICONS.physics;
  if (n.includes('chem')) return SUBJECT_ICONS.chemistry;
  if (n.includes('bio') || n.includes('life')) return SUBJECT_ICONS.bio;
  if (n.includes('english') || n.includes('communication') || n.includes('language'))
    return SUBJECT_ICONS.english;
  if (n.includes('history') || n.includes('social')) return SUBJECT_ICONS.history;
  return SUBJECT_ICONS.default;
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

// ─── Sort options ─────────────────────────────────────────────────────────────
const SORTS = [
  { key: 'all',       label: 'All',        icon: 'apps-outline'           },
  { key: 'recent',    label: 'Recent',     icon: 'time-outline'           },
  { key: 'az',        label: 'A–Z',        icon: 'text-outline'           },
  { key: 'mostfiles', label: 'Most Files', icon: 'documents-outline'      },
];

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL CARD — warm dark, subject icon, chips, file count
// ─────────────────────────────────────────────────────────────────────────────
function MaterialCard({
  material, onPress, onUpload, onDelete,
  selectionMode, isSelected,
}) {
  const subStyle = getSubjectStyle(material.subjectName);
  const fileCount = material.fileCount || material.files?.length || 0;

  const checkScale   = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const checkOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const slideAnim    = useRef(new Animated.Value(selectionMode ? 0 : -34)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: selectionMode ? 0 : -34,
      duration: 180,
      useNativeDriver: true,
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
      style={[mc.root, isSelected && mc.rootSelected]}
      onPress={() => onPress(material)}
      activeOpacity={0.78}
    >
      {isSelected && <View style={mc.accentBar} />}

      {/* Checkbox — slides in during selection mode */}
      {selectionMode && (
        <Animated.View style={[mc.checkboxWrap, { transform: [{ translateX: slideAnim }] }]}>
          <View style={[mc.checkbox, isSelected && mc.checkboxSelected]}>
            <Animated.View style={{ opacity: checkOpacity, transform: [{ scale: checkScale }] }}>
              <Ionicons name="checkmark" size={12} color={C.white} />
            </Animated.View>
          </View>
        </Animated.View>
      )}

      {/* Subject icon */}
      <View style={[mc.iconBox, { backgroundColor: subStyle.bg, borderColor: subStyle.color + '40' }]}>
        <Ionicons name={subStyle.icon} size={20} color={subStyle.color} />
      </View>

      {/* Main content */}
      <View style={mc.body}>
        <Text style={mc.subjectName} numberOfLines={1}>{material.subjectName}</Text>

        {/* Chips row: dept, semester */}
        <View style={mc.chipsRow}>
          {!!material.department && (
            <View style={mc.chip}>
              <Ionicons name="business-outline" size={10} color={C.textMuted} />
              <Text style={mc.chipText}>{material.department}</Text>
            </View>
          )}
          {!!material.semester && (
            <View style={mc.chip}>
              <Ionicons name="layers-outline" size={10} color={C.textMuted} />
              <Text style={mc.chipText}>Sem {material.semester}</Text>
            </View>
          )}
          {!!material.createdAt && (
            <View style={mc.chip}>
              <Ionicons name="calendar-outline" size={10} color={C.textMuted} />
              <Text style={mc.chipText}>{formatDate(material.createdAt)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Right side: file count + actions */}
      <View style={mc.right}>
        {!selectionMode ? (
          <>
            {/* File count badge */}
            <View style={mc.fileBadge}>
              <Ionicons name="document-outline" size={11} color={C.accent} />
              <Text style={mc.fileBadgeText}>{fileCount}</Text>
            </View>

            {/* Upload shortcut */}
            <TouchableOpacity
              style={mc.actionBtn}
              onPress={() => onUpload(material)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={C.textMuted} />
            </TouchableOpacity>

            {/* Delete shortcut */}
            <TouchableOpacity
              style={mc.actionBtn}
              onPress={() => onDelete(material)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={15} color={C.error + 'cc'} />
            </TouchableOpacity>
          </>
        ) : (
          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={isSelected ? C.accent : C.border}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const mc = StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8,
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
  checkboxWrap: { overflow: 'hidden', marginRight: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: R.sm,
    borderWidth: 1.5, borderColor: C.textMuted,
    backgroundColor: C.elevated,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxSelected: { backgroundColor: C.accent, borderColor: C.accent },
  iconBox: {
    width: 42, height: 42, borderRadius: R.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginRight: 12, flexShrink: 0,
  },
  body:        { flex: 1, gap: 5 },
  subjectName: { fontSize: T.sm, fontWeight: '700', color: C.textPrimary },
  chipsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: C.elevated, borderRadius: R.full,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: C.border,
  },
  chipText: { fontSize: T.xs - 1, color: C.textMuted, fontWeight: '500' },
  right: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingLeft: 8, flexShrink: 0,
  },
  fileBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: C.accentBg, borderRadius: R.full,
    paddingHorizontal: 7, paddingVertical: 4,
    borderWidth: 1, borderColor: C.accentBorder,
  },
  fileBadgeText: { fontSize: T.xs, fontWeight: '700', color: C.accent },
  actionBtn: {
    width: 30, height: 30, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// TOAST (identical pattern to MaterialAccessScreen)
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ visible, icon, iconColor, message, sub }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 140, friction: 9 }),
        Animated.timing(opacity,    { toValue: 1, duration: 180, useNativeDriver: true }),
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
// THEMED DIALOG (no system Alert)
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
// OVERFLOW MENU
// ─────────────────────────────────────────────────────────────────────────────
function OverflowMenu({
  visible, onClose,
  selectionMode,
  onRefresh, onSelectAll, onCancelSelection, onDeleteSelected,
  hasSelection, onSort,
}) {
  if (!visible) return null;

  const normalItems = [
    { icon: 'checkbox-outline',      label: 'Select Materials', onPress: () => { onSort('select'); onClose(); } },
    { icon: 'refresh-outline',       label: 'Refresh',          onPress: () => { onRefresh(); onClose(); } },
  ];

  const selectionItems = [
    { icon: 'checkbox-outline',      label: 'Select All',       onPress: () => { onSelectAll(); onClose(); } },
    { icon: 'trash-outline',         label: 'Delete Selected',  onPress: () => { onDeleteSelected(); onClose(); }, danger: true },
    { icon: 'close-outline',         label: 'Cancel Selection', onPress: () => { onCancelSelection(); onClose(); } },
  ];

  const items = selectionMode ? selectionItems : normalItems;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={s.overflowOverlay} onPress={onClose}>
        <Pressable style={s.overflowMenu} onPress={() => {}}>
          {items.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[s.overflowItem, i < items.length - 1 && s.overflowItemBorder]}
              onPress={item.onPress}
              activeOpacity={0.75}
            >
              <View style={[s.overflowIconBox, item.danger && s.overflowIconBoxDanger]}>
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={item.danger ? C.error : C.textSec}
                />
              </View>
              <Text style={[s.overflowLabel, item.danger && s.overflowLabelDanger]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function FacultyMaterialsScreen({ navigation }) {
  const [materials, setMaterials]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [search, setSearch]               = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [activeSort, setActiveSort]       = useState('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds]     = useState([]);
  const [overflowVisible, setOverflowVisible] = useState(false);
  const [toast, setToast]                 = useState({ visible: false });
  const [dialog, setDialog]               = useState({ visible: false });

  const toastTimer  = useRef(null);
  const searchRef   = useRef(null);
  const searchAnim  = useRef(new Animated.Value(0)).current;

  // ── Toast helper ────────────────────────────────────────────────────────
  const showToast = (icon, iconColor, message, sub) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, icon, iconColor, message, sub });
    toastTimer.current = setTimeout(
      () => setToast(t => ({ ...t, visible: false })), 2800
    );
  };

  const showDialog = (title, message, buttons) =>
    setDialog({ visible: true, title, message, buttons });

  // ── Animated search bar (same pattern as MaterialAccessScreen) ──────────
  const toggleSearch = () => {
    if (searchVisible) {
      setSearch('');
      Animated.timing(searchAnim, { toValue: 0, duration: 180, useNativeDriver: false })
        .start(() => setSearchVisible(false));
    } else {
      setSearchVisible(true);
      Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false })
        .start(() => searchRef.current?.focus());
    }
  };

  // ── Data ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const { data } = await getFolders();
      setMaterials(data.folders || []);
    } catch (e) {
      showDialog('Error', 'Failed to fetch materials.', [{ text: 'OK', style: 'cancel' }]);
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const confirmDelete = (material) => {
    showDialog(
      'Delete material?',
      `"${material.subjectName}" and all its files will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(material._id);
              setMaterials(prev => prev.filter(m => m._id !== material._id));
              showToast('trash-outline', C.error, 'Material deleted', material.subjectName);
            } catch (e) {
              showDialog('Error', e.response?.data?.message || 'Failed to delete.', [{ text: 'OK', style: 'cancel' }]);
            }
          },
        },
      ]
    );
  };

  const confirmBulkDelete = () => {
    if (selectedIds.length === 0) return;
    showDialog(
      `Delete ${selectedIds.length} material${selectedIds.length !== 1 ? 's' : ''}?`,
      'All selected subjects and their files will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All', style: 'destructive',
          onPress: async () => {
            const ids = [...selectedIds];
            exitSelectionMode();
            let failed = 0;
            for (const id of ids) {
              try {
                await deleteFolder(id);
                setMaterials(prev => prev.filter(m => m._id !== id));
              } catch { failed++; }
            }
            if (failed > 0) {
              showToast('alert-circle-outline', C.error, `${failed} deletion${failed !== 1 ? 's' : ''} failed`);
            } else {
              showToast('trash-outline', C.error, `${ids.length} material${ids.length !== 1 ? 's' : ''} deleted`);
            }
          },
        },
      ]
    );
  };

  // ── Selection ────────────────────────────────────────────────────────────
  const enterSelectionMode = (preSelectId) => {
    setSelectionMode(true);
    setSelectedIds(preSelectId ? [preSelectId] : []);
    setOverflowVisible(false);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
    setOverflowVisible(false);
  };

  const toggleSelect = (material) => {
    setSelectedIds(prev =>
      prev.includes(material._id)
        ? prev.filter(id => id !== material._id)
        : [...prev, material._id]
    );
  };

  const handleCardPress = (material) => {
    if (selectionMode) {
      toggleSelect(material);
      return;
    }
    navigation.navigate('FacultyMaterialDetail', { material });
  };

  const handleCardLongPress = (material) => {
    if (selectionMode) { toggleSelect(material); return; }
    enterSelectionMode(material._id);
  };

  // ── Filter + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = materials.filter(m =>
      !q ||
      m.subjectName?.toLowerCase().includes(q) ||
      m.facultyName?.toLowerCase().includes(q) ||
      m.department?.toLowerCase().includes(q)
    );
    if (activeSort === 'az') {
      list = [...list].sort((a, b) =>
        (a.subjectName || '').localeCompare(b.subjectName || '')
      );
    } else if (activeSort === 'recent') {
      list = [...list].sort((a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    } else if (activeSort === 'mostfiles') {
      list = [...list].sort((a, b) =>
        (b.fileCount || b.files?.length || 0) - (a.fileCount || a.files?.length || 0)
      );
    }
    return list;
  }, [materials, search, activeSort]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalFiles = useMemo(
    () => materials.reduce((acc, m) => acc + (m.fileCount || m.files?.length || 0), 0),
    [materials]
  );

  const isFiltering = search.trim().length > 0 || activeSort !== 'all';

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[s.root, s.center]} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.textMuted, marginTop: 12, fontSize: T.sm }}>Loading materials…</Text>
      </SafeAreaView>
    );
  }

  const allVisible    = filtered.length > 0 && filtered.every(m => selectedIds.includes(m._id));
  const hasAnySelected = selectedIds.length > 0;

  // ── Header ───────────────────────────────────────────────────────────────
  const renderHeader = () => {
    if (selectionMode) {
      return (
        <View style={[s.header, s.headerSelection]}>
          <TouchableOpacity style={s.iconBtn} onPress={exitSelectionMode} activeOpacity={0.75}>
            <Ionicons name="close" size={18} color={C.textSec} />
          </TouchableOpacity>

          <View style={s.headerMid}>
            <View>
              <Text style={s.headerTitle}>
                {hasAnySelected ? `${selectedIds.length} Selected` : 'Select Materials'}
              </Text>
              <Text style={s.headerSub}>
                {hasAnySelected
                  ? `of ${filtered.length} subject${filtered.length !== 1 ? 's' : ''}`
                  : 'Tap to select'}
              </Text>
            </View>
          </View>

          <View style={s.headerRight}>
            {/* Select all toggle */}
            <TouchableOpacity
              style={[s.iconBtn, allVisible && s.iconBtnAccent]}
              onPress={() =>
                allVisible
                  ? setSelectedIds([])
                  : setSelectedIds(filtered.map(m => m._id))
              }
              activeOpacity={0.75}
            >
              <Ionicons
                name={allVisible ? 'checkbox' : 'checkbox-outline'}
                size={17}
                color={allVisible ? C.white : C.textSec}
              />
            </TouchableOpacity>

            {/* Bulk delete */}
            <TouchableOpacity
              style={[s.iconBtn, hasAnySelected && s.iconBtnDanger]}
              onPress={confirmBulkDelete}
              disabled={!hasAnySelected}
              activeOpacity={0.75}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={hasAnySelected ? C.error : C.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity style={s.iconBtn} onPress={() => setOverflowVisible(true)} activeOpacity={0.75}>
              <Text style={s.overflowDots}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={s.header}>
        <View style={s.headerIconBox}>
          <Ionicons name="folder-open-outline" size={16} color={C.accent} />
        </View>
        <View style={s.headerMid}>
          <Text style={s.headerTitle}>My Materials</Text>
          <Text style={s.headerSub}>
            {materials.length} subject{materials.length !== 1 ? 's' : ''} · {totalFiles} file{totalFiles !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={toggleSearch} activeOpacity={0.75}>
            <Ionicons name={searchVisible ? 'close' : 'search-outline'} size={18} color={C.textSec} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => navigation.navigate('CreateMaterial')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color={C.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => setOverflowVisible(true)} activeOpacity={0.75}>
            <Text style={s.overflowDots}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Animated search bar ──────────────────────────────────────────────────
  const renderSearchBar = () =>
    searchVisible ? (
      <Animated.View style={[s.searchWrap, { opacity: searchAnim }]}>
        <Ionicons name="search-outline" size={15} color={C.textMuted} />
        <TextInput
          ref={searchRef}
          style={s.searchInput}
          placeholder="Search subject, dept, faculty…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={15} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>
    ) : null;

  // ── Sort row ─────────────────────────────────────────────────────────────
  const renderSortRow = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.sortRow}
      style={s.sortScroll}
    >
      {SORTS.map(sort => {
        const active = sort.key === activeSort;
        return (
          <TouchableOpacity
            key={sort.key}
            style={[s.sortChip, active && s.sortChipActive]}
            onPress={() => setActiveSort(sort.key)}
            activeOpacity={0.75}
          >
            <Ionicons name={sort.icon} size={12} color={active ? C.accent : C.textMuted} />
            <Text style={[s.sortChipText, active && s.sortChipTextActive]}>{sort.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Static header — never scrolls */}
        {renderHeader()}

        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          extraData={selectedIds}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListHeaderComponent={
            <>
              {renderSearchBar()}
              {renderSortRow()}

              {/* Results label */}
              {isFiltering ? (
                <View style={s.resultsRow}>
                  <Text style={s.resultsText}>
                    {filtered.length === 0 ? 'No results' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
                  </Text>
                  <TouchableOpacity
                    style={s.clearBtn}
                    onPress={() => { setSearch(''); setActiveSort('all'); }}
                  >
                    <Ionicons name="close-circle-outline" size={12} color={C.accent} />
                    <Text style={s.clearBtnText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={s.sectionLabel}>Subjects</Text>
              )}
            </>
          }
          renderItem={({ item }) => (
            <MaterialCard
              material={item}
              onPress={handleCardPress}
              onUpload={mat => navigation.navigate('UploadFiles', { material: mat })}
              onDelete={confirmDelete}
              selectionMode={selectionMode}
              isSelected={selectedIds.includes(item._id)}
            />
          )}
          ListEmptyComponent={
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>{search ? '🔍' : '📁'}</Text>
              <Text style={s.emptyTitle}>
                {search ? 'No results found' : 'No materials yet'}
              </Text>
              <Text style={s.emptyDesc}>
                {search
                  ? `Nothing matched "${search}". Try a different keyword.`
                  : 'Tap + to create your first subject material.'}
              </Text>
              {!search && (
                <TouchableOpacity
                  style={s.emptyAction}
                  onPress={() => navigation.navigate('CreateMaterial')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color={C.white} />
                  <Text style={s.emptyActionText}>Create material</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </SafeAreaView>

      <Toast {...toast} />
      <ThemedDialog {...dialog} onDismiss={() => setDialog(d => ({ ...d, visible: false }))} />
      <OverflowMenu
        visible={overflowVisible}
        onClose={() => setOverflowVisible(false)}
        selectionMode={selectionMode}
        hasSelection={hasAnySelected}
        onRefresh={onRefresh}
        onSelectAll={() => setSelectedIds(filtered.map(m => m._id))}
        onCancelSelection={exitSelectionMode}
        onDeleteSelected={confirmBulkDelete}
        onSort={key => key === 'select' && enterSelectionMode()}
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

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderSub,
    gap: 8, backgroundColor: C.bg,
  },
  headerSelection: {
    borderBottomColor: C.accentBorder,
    backgroundColor: 'rgba(222,115,86,0.04)',
  },
  headerIconBox: {
    width: 34, height: 34, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerMid:   { flex: 1 },
  headerTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  headerSub:   { fontSize: T.xs, color: C.textMuted, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  iconBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnAccent: { backgroundColor: C.accent, borderColor: C.accent },
  iconBtnDanger: { backgroundColor: 'rgba(248,113,113,0.12)', borderColor: C.error + '60' },

  addBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },

  overflowDots: { fontSize: 20, color: C.textSec, lineHeight: 22 },

  // ── Search bar ──
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginTop: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: T.base, color: C.textPrimary, padding: 0 },

  // ── Sort chips ──
  sortScroll: { flexGrow: 0 },
  sortRow: {
    flexDirection: 'row', gap: 7,
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 0,
  },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 11, paddingVertical: 6,
    backgroundColor: C.surface, borderRadius: R.full,
    borderWidth: 1, borderColor: C.border,
  },
  sortChipActive:     { backgroundColor: C.accentBg, borderColor: C.accentBorder },
  sortChipText:       { fontSize: T.xs, fontWeight: '600', color: C.textMuted },
  sortChipTextActive: { color: C.accent },

  // ── Results / section label ──
  resultsRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14, marginTop: 10, marginBottom: 8,
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
  sectionLabel: {
    fontSize: T.xs, fontWeight: '600', letterSpacing: 0.5,
    textTransform: 'uppercase', color: C.textMuted,
    marginHorizontal: 14, marginTop: 10, marginBottom: 8,
  },

  // ── List ──
  list: { paddingTop: 4, paddingHorizontal: 14, paddingBottom: 40 },

  // ── Empty state ──
  emptyCard: {
    backgroundColor: C.surface, borderRadius: R.xl,
    paddingVertical: 36, alignItems: 'center',
    borderWidth: 1, borderColor: C.border, marginTop: 8,
  },
  emptyEmoji:      { fontSize: 38, marginBottom: 10 },
  emptyTitle:      { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  emptyDesc:       { fontSize: T.sm, color: C.textMuted, textAlign: 'center', paddingHorizontal: 24, lineHeight: 18, marginBottom: 18 },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.accent, borderRadius: R.md,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  emptyActionText: { fontSize: T.sm, fontWeight: '700', color: C.white },

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

  // ── Overflow menu ──
  overflowOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overflowMenu: {
    backgroundColor: C.surface, borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl,
    paddingVertical: 8, paddingHorizontal: 14, paddingBottom: 32,
    borderTopWidth: 1, borderColor: C.border,
  },
  overflowItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14,
  },
  overflowItemBorder: { borderBottomWidth: 1, borderBottomColor: C.borderSub },
  overflowIconBox: {
    width: 34, height: 34, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  overflowIconBoxDanger: {
    backgroundColor: 'rgba(248,113,113,0.10)', borderColor: C.error + '40',
  },
  overflowLabel:       { fontSize: T.sm, fontWeight: '600', color: C.textPrimary },
  overflowLabelDanger: { color: C.error },
});
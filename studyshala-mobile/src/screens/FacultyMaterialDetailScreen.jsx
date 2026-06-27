/**
 * screens/FacultyMaterialDetailScreen.jsx — StudyShala
 *
 * Colours, tokens, header structure, icon-button style, menu sheet —
 * everything copied directly from FileViewerScreen.jsx.
 *
 * Added features vs. the plain FileViewerScreen header:
 *   • Search bar (slides in below header row)
 *   • Three-dot → bottom MenuSheet → "Select items" / "Select all"
 *   • Selection mode: checkboxes on rows, Share + Delete iconBtns on right
 *   • Access code card with Copy pill + WhatsApp pill
 *   • Custom in-app AlertModal — replaces all native Alert.alert() calls
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Linking,
  Animated, Platform, Share, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FileListItem from '../components/FileListItem';
import {
  getFolderDetails, deleteFile, deleteSubFolderFile, deleteSubFolder,
  updateMessage, getFacultyDownloadUrl,
} from '../api/facultyApi';

// ─── Clipboard shim ───────────────────────────────────────────────────────────
let Clipboard;
try { Clipboard = require('@react-native-clipboard/clipboard').default; }
catch { Clipboard = require('react-native').Clipboard; }

// ─────────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────────
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
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18, xxl: 22 };

const HEADER_H = 60;
const APP_URL  = 'https://studyshala.dev';

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM ALERT MODAL — themed to match the app; replaces Alert.alert()
// ─────────────────────────────────────────────────────────────────────────────
function AlertModal({ visible, title, message, buttons = [], onClose }) {
  const scaleAnim   = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1, useNativeDriver: true, tension: 70, friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1, duration: 160, useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const isDestructiveAlert = buttons.some(b => b.style === 'destructive');

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={al.backdrop} />
      </TouchableWithoutFeedback>
      <View style={al.centerer} pointerEvents="box-none">
        <Animated.View
          style={[al.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
        >
          {/* Coloured icon stripe */}
          <View style={[al.iconWrap, isDestructiveAlert && al.iconWrapError]}>
            <Ionicons
              name={isDestructiveAlert ? 'warning-outline' : 'information-circle-outline'}
              size={28}
              color={isDestructiveAlert ? C.error : C.accent}
            />
          </View>

          {/* Title + message */}
          {!!title   && <Text style={al.title}>{title}</Text>}
          {!!message && <Text style={al.message}>{message}</Text>}

          {/* Divider */}
          <View style={al.divider} />

          {/* Buttons — 2 buttons are side-by-side; 3+ stack vertically */}
          <View style={[al.btnRow, buttons.length > 2 && al.btnCol]}>
            {buttons.map((btn, i) => {
              const isDest   = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    al.btn,
                    buttons.length === 2 && i === 0 && al.btnLeft,
                    isDest && al.btnDestructive,
                    buttons.length > 2 && al.btnFull,
                    i < buttons.length - 1 && buttons.length > 2 && al.btnBottomBorder,
                  ]}
                  onPress={() => { onClose?.(); btn.onPress?.(); }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      al.btnText,
                      isDest   && al.btnTextDestructive,
                      isCancel && al.btnTextCancel,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const al = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  centerer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: R.xl + 4,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 20,
  },
  iconWrap: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: C.accentBg,
    borderBottomWidth: 1,
    borderBottomColor: C.accentBorder,
  },
  iconWrapError: {
    backgroundColor: C.errorBg,
    borderBottomColor: C.errorBorder,
  },
  title: {
    fontSize: T.lg,
    fontWeight: '800',
    color: C.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 6,
  },
  message: {
    fontSize: T.base,
    color: C.textSec,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
  },
  btnRow: { flexDirection: 'row' },
  btnCol: { flexDirection: 'column' },
  btn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLeft: {
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  btnFull: {
    flex: undefined,
    width: '100%',
  },
  btnBottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  btnDestructive: {
    backgroundColor: C.errorBg,
  },
  btnText: {
    fontSize: T.md,
    fontWeight: '700',
    color: C.accent,
  },
  btnTextDestructive: {
    color: C.error,
  },
  btnTextCancel: {
    color: C.textSec,
    fontWeight: '500',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// useAlert — hook that provides showAlert() and the AlertNode JSX
// ─────────────────────────────────────────────────────────────────────────────
function useAlert() {
  const [alertState, setAlertState] = useState({
    visible: false, title: '', message: '', buttons: [],
  });

  const showAlert = useCallback((title, message, buttons = [{ text: 'OK' }]) => {
    setAlertState({ visible: true, title, message, buttons });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  const AlertNode = (
    <AlertModal
      visible={alertState.visible}
      title={alertState.title}
      message={alertState.message}
      buttons={alertState.buttons}
      onClose={hideAlert}
    />
  );

  return { showAlert, AlertNode };
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU SHEET
// ─────────────────────────────────────────────────────────────────────────────
function MenuSheet({ visible, onClose, onSelect, onSelectAll }) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 300,
      useNativeDriver: true,
      tension: 65, friction: 11,
    }).start();
  }, [visible]);

  const actions = [
    { icon: 'checkmark-circle-outline', label: 'Select items', onPress: onSelect    },
    { icon: 'albums-outline',           label: 'Select all',   onPress: onSelectAll },
  ];

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={ms.backdrop} />
      </TouchableWithoutFeedback>
      <Animated.View style={[ms.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={ms.handle} />
        {actions.map((a, i) => (
          <TouchableOpacity
            key={i}
            style={[ms.row, i < actions.length - 1 && ms.rowBorder]}
            onPress={() => { onClose(); a.onPress(); }}
            activeOpacity={0.7}
          >
            <View style={ms.rowIcon}>
              <Ionicons name={a.icon} size={18} color={C.accent} />
            </View>
            <Text style={ms.rowLabel}>{a.label}</Text>
            <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: C.overlay },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: C.elevated, alignSelf: 'center', marginBottom: 18,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 15,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.borderSub },
  rowIcon: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: T.md, fontWeight: '600', color: C.textPrimary },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
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

  // Search
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const searchInputRef = useRef(null);
  const searchAnim     = useRef(new Animated.Value(0)).current;

  // Selection
  const [selectMode,  setSelectMode]  = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Menu
  const [menuVisible, setMenuVisible] = useState(false);

  // Copy feedback
  const [codeCopied, setCodeCopied] = useState(false);

  // Custom alert (replaces all Alert.alert calls)
  const { showAlert, AlertNode } = useAlert();

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadDetails = useCallback(async () => {
    try {
      const { data } = await getFolderDetails(initialMaterial._id);
      setMaterial(data.folder);
      setFiles(data.folder.files || []);
      setSubFolders(data.folder.subFolders || []);
    } catch (e) {
      showAlert('Error', e.response?.data?.message || 'Failed to load material.');
    } finally { setLoading(false); }
  }, [initialMaterial._id]);

  useEffect(() => { loadDetails(); }, [loadDetails]);
  useEffect(() => {
    if (openShare) {
      const t = setTimeout(() => handleShareWhatsApp(), 200);
      return () => clearTimeout(t);
    }
  }, [openShare]);

  // ── Search ───────────────────────────────────────────────────────────────
  const toggleSearch = () => {
    const next = !searchVisible;
    setSearchVisible(next);
    if (!next) setSearchQuery('');
    Animated.timing(searchAnim, {
      toValue: next ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start(() => { if (next) searchInputRef.current?.focus(); });
  };

  // ── Derived list ─────────────────────────────────────────────────────────
  const currentFiles = activeFolder ? activeFolder.files : files;
  const allItems = [
    ...(!activeFolder ? subFolders.map(sf => ({ ...sf, __isFolder: true })) : []),
    ...currentFiles,
  ];
  const filteredItems = searchQuery.trim()
    ? allItems.filter(i => (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : allItems;

  // ── Selection ────────────────────────────────────────────────────────────
  const enterSelectMode = () => { setSelectMode(true); setSelectedIds(new Set()); };
  const selectAll       = () => { setSelectMode(true); setSelectedIds(new Set(filteredItems.map(i => i._id))); };
  const exitSelectMode  = () => { setSelectMode(false); setSelectedIds(new Set()); };
  const toggleSelect    = id => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ── Bulk delete ──────────────────────────────────────────────────────────
  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    showAlert(
      `Delete ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}?`,
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await Promise.all(
                filteredItems.filter(i => selectedIds.has(i._id)).map(i => {
                  if (i.__isFolder) return deleteSubFolder(material._id, i._id);
                  if (activeFolder) return deleteSubFolderFile(material._id, activeFolder._id, i._id);
                  return deleteFile(material._id, i._id);
                })
              );
              setSubFolders(prev => prev.filter(s => !selectedIds.has(s._id)));
              setFiles(prev => prev.filter(f => !selectedIds.has(f._id)));
              exitSelectMode();
            } catch (e) {
              showAlert('Error', e.response?.data?.message || 'Failed to delete some items.');
            }
          },
        },
      ]
    );
  };

  const handleBulkShare = async () => {
    const names = filteredItems.filter(i => selectedIds.has(i._id)).map(i => `• ${i.name || ''}`).join('\n');
    try {
      await Share.share({
        message: `Files from ${material.subjectName}:\n${names}\n\nAccess Code: ${material.accessCode || material.departmentCode}\n${APP_URL}`,
      });
    } catch {}
    exitSelectMode();
  };

  // ── Single-item handlers ──────────────────────────────────────────────────
  const handleFilePress = file => {
    if (selectMode) { toggleSelect(file._id); return; }
    navigation.navigate('FileViewer', { file, material });
  };

  const handleFileLongPress = file => {
    if (selectMode) return;
    showAlert(file.name, 'What would you like to do?', [
      {
        text: 'Download', onPress: () => {
          const url = file.downloadUrl || getFacultyDownloadUrl(material._id, file._id);
          if (url) Linking.openURL(url);
        },
      },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteFile(file) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDeleteFile = file => {
    showAlert('Delete File?', `"${file.name}" will be permanently removed.`, [
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
          } catch (e) {
            showAlert('Error', e.response?.data?.message || 'Failed to delete.');
          }
        },
      },
    ]);
  };

  const handleDeleteSubFolder = sf => {
    showAlert(
      'Delete Folder?',
      `"${sf.name}" and all its files will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await deleteSubFolder(material._id, sf._id);
              setSubFolders(prev => prev.filter(s => s._id !== sf._id));
            } catch (e) {
              showAlert('Error', e.response?.data?.message || 'Failed to delete folder.');
            }
          },
        },
      ]
    );
  };

  const handleSaveMessage = async () => {
    setSavingMsg(true);
    try {
      await updateMessage(material._id, msgText);
      setMaterial(prev => ({ ...prev, messageToStudents: msgText }));
      setMsgModalOpen(false);
    } catch (e) {
      showAlert('Error', e.response?.data?.message || 'Failed to save message.');
    } finally { setSavingMsg(false); }
  };

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
      showAlert('WhatsApp Not Found', 'WhatsApp does not appear to be installed on this device.')
    );
  };

  const handleCopyCode = () => {
    const code = material.accessCode || material.departmentCode || '';
    try { Clipboard.setString(code); } catch {}
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1800);
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.loadingOverlay}>
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={s.loadingTitle}>Loading…</Text>
          </View>
        </View>
      </View>
    );
  }

  const code = material.accessCode || material.departmentCode;

  return (
    <View style={s.root}>

      <SafeAreaView edges={['top']} style={{ backgroundColor: C.surface }}>

        {/* ══════════════════════════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════════════════════════ */}
        <View style={s.headerWrap}>
          <View style={s.header}>

            {/* Back / exit-select */}
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => {
                if (selectMode)   { exitSelectMode(); return; }
                if (activeFolder) { setActiveFolder(null); return; }
                navigation.goBack();
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={selectMode ? 'close' : 'arrow-back'}
                size={18}
                color={C.textSec}
              />
            </TouchableOpacity>

            {/* Title block */}
            <View style={s.titleBlock}>
              <Text style={s.titleText} numberOfLines={1}>
                {selectMode
                  ? `${selectedIds.size} selected`
                  : activeFolder
                    ? activeFolder.name
                    : material.subjectName}
              </Text>
              {!selectMode && (
                <Text style={s.titleSub} numberOfLines={1}>
                  {[material.department, material.semester && `Sem ${material.semester}`]
                    .filter(Boolean).join('  ·  ')}
                </Text>
              )}
            </View>

            {/* Normal mode right actions */}
            {!selectMode && (
              <>
                <TouchableOpacity style={s.iconBtn} onPress={toggleSearch} activeOpacity={0.7}>
                  <Ionicons
                    name={searchVisible ? 'close' : 'search-outline'}
                    size={18}
                    color={searchVisible ? C.accent : C.textSec}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={s.iconBtn} onPress={() => setMenuVisible(true)} activeOpacity={0.7}>
                  <Ionicons name="ellipsis-vertical" size={18} color={C.textSec} />
                </TouchableOpacity>
              </>
            )}

            {/* Selection mode right actions */}
            {selectMode && (
              <>
                <TouchableOpacity
                  style={[s.iconBtn, !selectedIds.size && s.iconBtnDim]}
                  onPress={handleBulkShare}
                  disabled={!selectedIds.size}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="share-outline"
                    size={18}
                    color={selectedIds.size ? C.accent : C.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.iconBtn, !selectedIds.size && s.iconBtnDim]}
                  onPress={handleBulkDelete}
                  disabled={!selectedIds.size}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={selectedIds.size ? C.error : C.textMuted}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Search bar — animated slide-down */}
          <Animated.View style={[
            s.searchWrap,
            {
              maxHeight: searchAnim.interpolate({ inputRange: [0,1], outputRange: [0, 52] }),
              opacity: searchAnim,
            },
          ]}>
            <View style={s.searchBar}>
              <Ionicons name="search-outline" size={15} color={C.textMuted} />
              <TextInput
                ref={searchInputRef}
                style={s.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search files and folders…"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {!!searchQuery && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={15} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <FlatList
        data={filteredItems}
        keyExtractor={item => item._id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}

        ListHeaderComponent={!activeFolder ? (
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

            {/* Action chips */}
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
                <Ionicons name="megaphone-outline" size={15} color="#f59e0b" />
                <Text style={[s.actionChipText, { color: '#f59e0b' }]}>Announce</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionChip} onPress={handleShareWhatsApp} activeOpacity={0.75}>
                <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                <Text style={[s.actionChipText, { color: '#25D366' }]}>Share</Text>
              </TouchableOpacity>
            </View>

            {/* Announcement banner */}
            {!!material.messageToStudents && (
              <View style={s.announceBanner}>
                <Ionicons name="megaphone-outline" size={14} color={C.accent} />
                <Text style={s.announceText} numberOfLines={2}>
                  {material.messageToStudents}
                </Text>
              </View>
            )}

            <Text style={s.sectionLabel}>
              {activeFolder ? activeFolder.name : 'Files & Folders'}
            </Text>
          </>
        ) : null}

        renderItem={({ item }) =>
          item.__isFolder ? (
            /* ─ Folder row ─────────────────────────────────────────────── */
            <TouchableOpacity
              style={[s.folderRow, selectMode && selectedIds.has(item._id) && s.rowSelected]}
              onPress={() => {
                if (selectMode) { toggleSelect(item._id); return; }
                setActiveFolder(item);
              }}
              onLongPress={() => { if (!selectMode) { enterSelectMode(); toggleSelect(item._id); } }}
              activeOpacity={0.75}
            >
              {selectMode && (
                <View style={[s.checkbox, selectedIds.has(item._id) && s.checkboxOn]}>
                  {selectedIds.has(item._id) && <Ionicons name="checkmark" size={11} color={C.white} />}
                </View>
              )}
              <View style={s.folderIcon}>
                <Ionicons name="folder" size={20} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.folderName}>{item.name}</Text>
                <Text style={s.folderMeta}>{item.fileCount ?? item.files?.length ?? 0} files</Text>
              </View>
              {!selectMode && (
                <>
                  <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                  <TouchableOpacity
                    onPress={() => handleDeleteSubFolder(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{ paddingLeft: 12 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={C.error} />
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          ) : (
            /* ─ File row ────────────────────────────────────────────────── */
            <View style={[
              s.fileRowWrap,
              selectMode && selectedIds.has(item._id) && s.rowSelected,
            ]}>
              {selectMode && (
                <TouchableOpacity
                  style={s.fileCheckHit}
                  onPress={() => toggleSelect(item._id)}
                >
                  <View style={[s.checkbox, selectedIds.has(item._id) && s.checkboxOn]}>
                    {selectedIds.has(item._id) && <Ionicons name="checkmark" size={11} color={C.white} />}
                  </View>
                </TouchableOpacity>
              )}
              <FileListItem
                file={item}
                onPress={handleFilePress}
                onLongPress={handleFileLongPress}
                showStar={false}
                onDeletePress={handleDeleteFile}
                dark
              />
            </View>
          )
        }

        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>📂</Text>
              <Text style={s.emptyTitle}>{searchQuery ? 'No results' : 'No files yet'}</Text>
              <Text style={s.emptyDesc}>
                {searchQuery
                  ? `Nothing matches "${searchQuery}"`
                  : 'Upload files to share them with your students.'}
              </Text>
            </View>
          </View>
        }
      />

      {/* ── Menu sheet ────────────────────────────────────────────────────── */}
      <MenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onSelect={enterSelectMode}
        onSelectAll={selectAll}
      />

      {/* ── Announce modal ─────────────────────────────────────────────────── */}
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

      {/* Custom Alert Modal — rendered last so it sits above all other layers */}
      {AlertNode}

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  root: { flex: 1, backgroundColor: C.bg },

  // ── Header ────────────────────────────────────────────────────────────────
  headerWrap: {
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  header: {
    height: HEADER_H,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, gap: 8,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnDim: { opacity: 0.4 },
  titleBlock: { flex: 1 },
  titleText: { fontSize: T.base + 1, fontWeight: '700', color: C.textPrimary },
  titleSub:  { fontSize: T.xs, color: C.textMuted, marginTop: 1 },

  // ── Search bar ──────────────────────────────────────────────────────────
  searchWrap: { overflow: 'hidden', paddingHorizontal: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.elevated,
    borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1, fontSize: T.base, color: C.textPrimary, paddingVertical: 0,
  },

  // ── Access code card ───────────────────────────────────────────────────
  codeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    marginHorizontal: 12, marginTop: 14,
    borderRadius: R.md,
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: C.accentBorder,
  },
  codeLeft: { flex: 1, marginRight: 10 },
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

  // ── Action chips ────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row', gap: 8,
    marginHorizontal: 12, marginTop: 10,
  },
  actionChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  actionChipText: { fontSize: T.xs + 1, fontWeight: '700' },

  // ── Announcement banner ─────────────────────────────────────────────────
  announceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accentBg,
    borderWidth: 1, borderColor: C.accentBorder,
    borderRadius: R.sm, padding: 11,
    marginHorizontal: 12, marginTop: 10,
  },
  announceText: { flex: 1, fontSize: T.sm, color: C.accent, lineHeight: 18 },

  // ── Section label ───────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: T.xs, fontWeight: '600', letterSpacing: 0.08,
    textTransform: 'uppercase', color: C.textMuted,
    marginTop: 18, marginBottom: 8, marginHorizontal: 12,
  },

  // ── List ────────────────────────────────────────────────────────────────
  listContent: { paddingBottom: 36 },

  // ── Folder row ──────────────────────────────────────────────────────────
  folderRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.md, borderWidth: 1, borderColor: C.border,
    paddingVertical: 12, paddingLeft: 14, paddingRight: 10,
    marginHorizontal: 12, marginBottom: 8,
  },
  folderIcon: {
    width: 38, height: 38, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  folderName: { fontSize: T.base, fontWeight: '700', color: C.textPrimary },
  folderMeta: { fontSize: T.xs, color: C.textMuted, marginTop: 2 },

  // ── File row wrapper ────────────────────────────────────────────────────
  fileRowWrap: {
    position: 'relative',
    marginHorizontal: 12, marginBottom: 8,
    borderRadius: R.md,
  },
  fileCheckHit: {
    position: 'absolute', left: 10,
    top: 0, bottom: 0, zIndex: 10,
    justifyContent: 'center',
  },

  // ── Selection highlight ─────────────────────────────────────────────────
  rowSelected: {
    backgroundColor: C.accentBg,
    borderColor: C.accentBorder,
  },

  // ── Checkbox ────────────────────────────────────────────────────────────
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: C.border,
    backgroundColor: C.elevated,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  checkboxOn: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },

  // ── Empty state ──────────────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 28 },
  emptyCard: {
    alignItems: 'center', padding: 28, width: '100%',
    backgroundColor: C.surface, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.border,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: T.lg, fontWeight: '800', color: C.textPrimary, marginBottom: 6, textAlign: 'center' },
  emptyDesc:  { fontSize: T.sm, color: C.textMuted, textAlign: 'center', lineHeight: 20 },

  // ── Loading ─────────────────────────────────────────────────────────────
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bg, zIndex: 10,
  },
  loadingCard: {
    alignItems: 'center', padding: 32,
    backgroundColor: C.surface, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.border, minWidth: 180,
  },
  loadingTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginTop: 16 },

  // ── Announce modal ──────────────────────────────────────────────────────
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
  modalTitle: { fontSize: T.base + 3, fontWeight: '800', color: C.textPrimary },
  modalHint:  { fontSize: T.xs, color: C.textMuted, marginTop: 2 },
  modalTextarea: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: R.md,
    padding: 14, fontSize: T.base, color: C.textPrimary,
    backgroundColor: C.bg, minHeight: 120, textAlignVertical: 'top',
  },
  charCount: { fontSize: T.xs, color: C.textMuted, textAlign: 'right', marginTop: 4, marginBottom: 16 },
  modalFooter: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderRadius: R.md, backgroundColor: C.elevated,
    borderWidth: 1, borderColor: C.border,
  },
  modalCancelText: { fontSize: T.md, fontWeight: '700', color: C.textSec },
  modalSaveBtn:    { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: R.md, backgroundColor: C.accent },
  modalSaveText:   { fontSize: T.md, fontWeight: '700', color: C.white },
});
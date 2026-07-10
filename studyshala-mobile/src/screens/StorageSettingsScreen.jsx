/**
 * screens/StorageSettingsScreen.jsx
 * ===================================
 * Reached from the sidebar (SETTINGS > Storage Settings — that menu entry
 * already existed; this fills in the screen it points to).
 *
 * Shows:
 *  - Which account is currently logged in (so it's unambiguous whose
 *    personal lists — saved/starred/recent — this device is showing)
 *  - Where new downloads are being saved (default app storage, or a
 *    custom folder — Android only)
 *  - Total space used by downloaded files, and a list of what's there
 *  - "Change folder" (Android) — never moves existing files, only
 *    affects new downloads and re-downloads from that point on
 *  - "Clear downloads" — removes the shared download pool on this
 *    device (file bytes are shared across accounts by design; this does
 *    not touch any account's personal saved/starred lists)
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getAllOfflineFiles, removeFileOffline } from '../utils/fileRepository';
import { getStorageLocation, isCustomFolderSupported, pickCustomFolder, resetToDefaultFolder } from '../utils/storageLocation';

const C = {
  bg: '#13120f', surface: '#1e1c19', elevated: '#2a2724', border: '#2e2c28',
  accent: '#DE7356', accentBg: 'rgba(222,115,86,0.12)', accentBorder: 'rgba(222,115,86,0.28)',
  textPrimary: '#e8e4de', textSec: '#b1ada1', textMuted: '#6b6760', white: '#ffffff', error: '#f87171',
};
const R = { sm: 8, md: 10, lg: 14, xl: 16, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16 };

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function StorageSettingsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [location, setLocation] = useState({ type: 'default' });
  const [clearing, setClearing] = useState(false);
  const [changingFolder, setChangingFolder] = useState(false);

  const load = useCallback(async () => {
    const [offlineFiles, loc] = await Promise.all([getAllOfflineFiles(), getStorageLocation()]);
    setFiles(offlineFiles);
    setLocation(loc);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalBytes = files.reduce((sum, f) => sum + (f.expectedSize || 0), 0);

  const handleChangeFolder = async () => {
    setChangingFolder(true);
    const picked = await pickCustomFolder();
    setChangingFolder(false);
    if (picked) {
      setLocation(picked);
      Alert.alert(
        'Folder updated',
        `New downloads will be saved to "${picked.label}" from now on. Files already downloaded stay exactly where they are.`
      );
    }
  };

  const handleUseDefault = async () => {
    await resetToDefaultFolder();
    setLocation({ type: 'default' });
    Alert.alert('Switched to default storage', 'New downloads will be saved to the app\u2019s own storage from now on. Earlier downloads stay where they are.');
  };

  const handleClearDownloads = () => {
    Alert.alert(
      'Clear all downloads?',
      `This removes ${files.length} downloaded file${files.length !== 1 ? 's' : ''} (${formatSize(totalBytes)}) from this device. Your Saved Materials and Starred lists are not affected — files will simply need to download again next time they're opened.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            for (const f of files) {
              try { await removeFileOffline(f.fileId); } catch {}
            }
            await load();
            setClearing(false);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center} edges={['top']}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={C.textSec} />
        </TouchableOpacity>
        <Text style={s.title}>Storage Settings</Text>
      </View>

      <FlatList
        data={files}
        keyExtractor={(f) => f.fileId}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            <View style={s.card}>
              <View style={s.cardRow}>
                <View style={s.cardIconBox}><Ionicons name="person-circle-outline" size={18} color={C.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardLabel}>Signed in as</Text>
                  <Text style={s.cardValue}>{user?.name || user?.email || 'Unknown account'}</Text>
                  {!!user?.email && <Text style={s.cardSub}>{user.email}</Text>}
                </View>
              </View>
            </View>

            <View style={s.card}>
              <View style={s.cardRow}>
                <View style={s.cardIconBox}><Ionicons name="folder-outline" size={18} color={C.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardLabel}>New downloads are saved to</Text>
                  <Text style={s.cardValue}>{location.type === 'custom' ? location.label : "StudyShala's app storage (default)"}</Text>
                  <Text style={s.cardSub}>Changing this never moves files you've already downloaded.</Text>
                </View>
              </View>

              {isCustomFolderSupported() ? (
                <View style={s.folderBtnRow}>
                  <TouchableOpacity style={s.folderBtn} onPress={handleChangeFolder} disabled={changingFolder}>
                    {changingFolder ? <ActivityIndicator size="small" color={C.accent} /> : (
                      <>
                        <Ionicons name="folder-open-outline" size={15} color={C.accent} />
                        <Text style={s.folderBtnText}>Choose folder…</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {location.type === 'custom' && (
                    <TouchableOpacity style={s.folderBtnSecondary} onPress={handleUseDefault}>
                      <Text style={s.folderBtnSecondaryText}>Use default</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={s.notSupportedText}>Custom folders aren't available on iOS — files are stored in StudyShala's private app storage.</Text>
              )}
            </View>

            <View style={s.card}>
              <View style={s.cardRow}>
                <View style={s.cardIconBox}><Ionicons name="server-outline" size={18} color={C.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardLabel}>Space used by downloads</Text>
                  <Text style={s.cardValue}>{formatSize(totalBytes)} · {files.length} file{files.length !== 1 ? 's' : ''}</Text>
                  <Text style={s.cardSub}>Shared across any account signed in on this device — re-downloading isn't needed if you switch accounts.</Text>
                </View>
              </View>
              {files.length > 0 && (
                <TouchableOpacity style={s.clearBtn} onPress={handleClearDownloads} disabled={clearing}>
                  {clearing ? <ActivityIndicator size="small" color={C.error} /> : (
                    <>
                      <Ionicons name="trash-outline" size={14} color={C.error} />
                      <Text style={s.clearBtnText}>Clear all downloads</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {files.length > 0 && <Text style={s.sectionLabel}>Downloaded files</Text>}
          </>
        }
        renderItem={({ item }) => (
          <View style={s.fileRow}>
            <Ionicons name="document-outline" size={16} color={C.textMuted} />
            <Text style={s.fileName} numberOfLines={1}>{item.name}</Text>
            <Text style={s.fileSize}>{formatSize(item.expectedSize)}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Ionicons name="cloud-offline-outline" size={36} color={C.textMuted} />
            <Text style={s.emptyText}>Nothing downloaded yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  iconBtn: { width: 36, height: 36, borderRadius: R.sm, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: T.md, fontWeight: '700', color: C.textPrimary },

  list: { padding: 14, paddingBottom: 40 },
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12 },
  cardRow: { flexDirection: 'row', gap: 12 },
  cardIconBox: { width: 34, height: 34, borderRadius: R.sm, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardLabel: { fontSize: T.xs, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  cardValue: { fontSize: T.base, color: C.textPrimary, fontWeight: '700', marginTop: 3 },
  cardSub: { fontSize: T.xs, color: C.textMuted, marginTop: 4, lineHeight: 15 },

  folderBtnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  folderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, borderRadius: R.md, paddingVertical: 9, paddingHorizontal: 12 },
  folderBtnText: { fontSize: T.sm, fontWeight: '700', color: C.accent },
  folderBtnSecondary: { justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.border },
  folderBtnSecondaryText: { fontSize: T.sm, fontWeight: '600', color: C.textSec },
  notSupportedText: { fontSize: T.xs, color: C.textMuted, marginTop: 10, lineHeight: 16 },

  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 9, borderRadius: R.md, backgroundColor: 'rgba(248,113,113,0.1)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)' },
  clearBtnText: { fontSize: T.sm, fontWeight: '700', color: C.error },

  sectionLabel: { fontSize: T.xs, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
  fileName: { flex: 1, fontSize: T.sm, color: C.textPrimary },
  fileSize: { fontSize: T.xs, color: C.textMuted },

  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, gap: 10 },
  emptyText: { color: C.textMuted, fontSize: T.sm },
});
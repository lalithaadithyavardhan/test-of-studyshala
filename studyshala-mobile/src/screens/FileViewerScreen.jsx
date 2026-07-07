/**
 * screens/FileViewerScreen.jsx
 * ==============================
 * Two entry modes, set by fileActions.openFile():
 *
 *  - source: 'local'  → file is fully on-disk (offline-capable).
 *      Images → <Image>, always worked, no library needed.
 *      PDF    → rendered natively via `react-native-pdf`'s <Pdf> component.
 *               This is a real PDF-rendering engine (not the phone's
 *               WebView), so it works the same on every device and fully
 *               offline. REQUIRES the custom dev client — this native
 *               module cannot run inside plain Expo Go.
 *      Everything else (doc/docx/ppt/pptx/xls/xlsx/...) → handed to the
 *               OS's own document app via React Native's built-in
 *               Linking.openURL(). Core React Native, not an Expo native
 *               module, so it works in Expo Go too. A content:// URI
 *               passed to it triggers Android's native "choose an app"
 *               resolution directly.
 *
 *  - source: 'remote' → no local copy yet, but online. Streams
 *      file.previewUrl (a Google Drive preview link from the backend)
 *      inside a WebView. Requires internet — expected, since this branch
 *      only runs when nothing is saved locally.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import Pdf from 'react-native-pdf';
import * as FileSystem from 'expo-file-system';
import { C, R, T } from '../components/theme';

const isImage = (mime = '') => mime.startsWith('image/');
const isPdf = (mime = '', name = '') =>
  mime.includes('pdf') || name.toLowerCase().endsWith('.pdf');

export default function FileViewerScreen({ route, navigation }) {
  const { file, material, source, localUri } = route.params || {};
  const name = file?.name || file?.fileName || 'File';
  const mime = file?.mimeType || '';

  const [openError, setOpenError] = useState('');
  const [launching, setLaunching] = useState(false);

  // An app-private file:// path can't be read by other apps directly.
  // getContentUriAsync() wraps it via Android's FileProvider into a
  // content:// URI that they CAN read. iOS has no such restriction, so
  // file:// is used as-is there. Only needed for the "open externally"
  // path below — react-native-pdf reads the local file:// path directly.
  const resolveShareableUri = useCallback(async (rawUri) => {
    if (!rawUri) return null;
    if (Platform.OS !== 'android') return rawUri;
    try {
      return await FileSystem.getContentUriAsync(rawUri);
    } catch (e) {
      console.log('[FileViewer] getContentUriAsync failed:', e?.message);
      return null;
    }
  }, []);

  // Word/PPT/Excel/etc — no in-app renderer exists for these, so hand off
  // to whatever document app is already on the phone.
  const openWithNativeApp = useCallback(async () => {
    setOpenError('');
    setLaunching(true);
    try {
      const shareableUri = await resolveShareableUri(localUri);
      if (!shareableUri) throw new Error('Could not prepare this file to open.');
      await Linking.openURL(shareableUri);
    } catch (e) {
      console.log('[FileViewer] Could not open file:', e?.message);
      setOpenError('No app on this device can open this file type.');
    } finally {
      setLaunching(false);
    }
  }, [localUri, resolveShareableUri]);

  useEffect(() => {
    if (source === 'local' && !isImage(mime) && !isPdf(mime, name)) {
      openWithNativeApp();
    }
  }, [source, mime, name, openWithNativeApp]);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{name}</Text>
        {source === 'local' && (
          <View style={s.offlineBadge}>
            <Ionicons name="cloud-offline-outline" size={12} color={C.success} />
          </View>
        )}
      </View>

      {source === 'local' && isImage(mime) && (
        <View style={s.imageWrap}>
          <Image source={{ uri: localUri }} style={s.image} resizeMode="contain" />
        </View>
      )}

      {source === 'local' && isPdf(mime, name) && !openError && (
        <Pdf
          source={{ uri: localUri }}
          style={s.pdf}
          trustAllCerts={false}
          onError={(e) => {
            console.log('[FileViewer] Pdf render error:', e);
            setOpenError('Could not render this PDF. It may be corrupted — try saving it again.');
          }}
        />
      )}

      {source === 'local' && isPdf(mime, name) && !!openError && (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={40} color={C.danger} />
          <Text style={s.errorText}>{openError}</Text>
        </View>
      )}

      {source === 'local' && !isImage(mime) && !isPdf(mime, name) && (
        <View style={s.center}>
          {launching ? (
            <>
              <ActivityIndicator color={C.accent} size="large" />
              <Text style={s.hint}>Opening {name}…</Text>
            </>
          ) : (
            <>
              <Ionicons name="document-attach-outline" size={48} color={C.textMuted} />
              {!!openError && <Text style={s.errorText}>{openError}</Text>}
              <TouchableOpacity style={s.btn} onPress={openWithNativeApp}>
                <Ionicons name="open-outline" size={17} color={C.white} />
                <Text style={s.btnText}>Open with…</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {source === 'remote' && (
        file?.previewUrl ? (
          <WebView
            source={{ uri: file.previewUrl }}
            style={{ flex: 1 }}
            startInLoadingState
            renderLoading={() => (
              <View style={s.center}>
                <ActivityIndicator color={C.accent} size="large" />
              </View>
            )}
          />
        ) : (
          <View style={s.center}>
            <Ionicons name="cloud-offline-outline" size={48} color={C.textMuted} />
            <Text style={s.hint}>No preview link available for this file.</Text>
          </View>
        )
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  offlineBadge: {
    width: 24, height: 24, borderRadius: R.pill,
    backgroundColor: 'rgba(52,211,153,0.12)', alignItems: 'center', justifyContent: 'center',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 30 },
  hint: { color: C.textSecondary, fontSize: T.sm, textAlign: 'center' },
  errorText: { color: C.danger, fontSize: T.sm, textAlign: 'center' },

  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accent, borderRadius: R.md,
    paddingVertical: 12, paddingHorizontal: 20, marginTop: 4,
  },
  btnText: { color: C.white, fontWeight: '700', fontSize: T.base },

  imageWrap: { flex: 1, backgroundColor: C.black },
  image: { flex: 1 },
  pdf: { flex: 1, width: '100%', backgroundColor: C.bg },
});
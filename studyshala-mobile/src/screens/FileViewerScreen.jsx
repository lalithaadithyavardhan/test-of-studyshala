/**
 * screens/FileViewerScreen.jsx
 * ==============================
 * Two entry modes, set by fileActions.openFile():
 *
 *  - source: 'local'  → file is fully on-disk (offline-capable).
 *      Images render inline. Everything else (pdf/doc/ppt/video/...) is
 *      handed to the OS's own viewer — Android via expo-intent-launcher,
 *      iOS via the expo-sharing "Open in" sheet — since neither platform's
 *      WebView reliably renders arbitrary local office/pdf files without
 *      extra native libraries. This keeps the offline path simple and
 *      actually working, per the "functionality first" brief.
 *
 *  - source: 'remote' → no local copy yet, but online. Streams
 *      file.previewUrl (a Google Drive preview link from the backend)
 *      inside a WebView. Requires internet — that's expected, since this
 *      branch only runs when nothing is saved locally.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { C, R, T } from '../components/theme';

const isImage = (mime = '') => mime.startsWith('image/');

export default function FileViewerScreen({ route, navigation }) {
  const { file, material, source, localUri } = route.params || {};
  const [openError, setOpenError] = useState('');
  const [launching, setLaunching] = useState(false);
  const name = file?.name || file?.fileName || 'File';
  const mime = file?.mimeType || '';

  const openViaShareSheet = useCallback(async () => {
    const available = await Sharing.isAvailableAsync();
    if (!available) throw new Error('Sharing not available');
    await Sharing.shareAsync(localUri, { mimeType: mime, dialogTitle: name });
  }, [localUri, mime, name]);

  const openWithNativeApp = useCallback(async () => {
    setOpenError('');
    setLaunching(true);
    try {
      if (Platform.OS === 'android') {
        try {
          // Required lazily, not at the top of the file: if the native
          // module is missing (plain Expo Go, no dev client), requiring
          // it throws "Cannot find native module ExpoIntentLauncher" the
          // moment it's evaluated. A top-level `import` would throw that
          // as soon as this screen loads, before we ever get a chance to
          // catch it — requiring it here means the throw happens inside
          // this try block instead, where we can fall back gracefully.
          const IntentLauncher = require('expo-intent-launcher');
          const contentUri = await FileSystem.getContentUriAsync(localUri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: mime || undefined,
          });
        } catch (intentErr) {
          // IntentLauncher's native module isn't present when running in
          // plain Expo Go (it needs a custom dev client). Fall back to the
          // share sheet, which IS available in Expo Go, instead of crashing.
          const missingNativeModule =
            String(intentErr?.message || '').includes('Cannot find native module');
          if (missingNativeModule) {
            await openViaShareSheet();
          } else {
            throw intentErr;
          }
        }
      } else {
        await openViaShareSheet();
      }
    } catch (e) {
      setOpenError('No app on this device can open this file type.');
    } finally {
      setLaunching(false);
    }
  }, [localUri, mime, openViaShareSheet]);

  useEffect(() => {
    if (source === 'local' && !isImage(mime)) {
      openWithNativeApp();
    }
  }, [source, mime, openWithNativeApp]);

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

      {source === 'local' && !isImage(mime) && (
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
});
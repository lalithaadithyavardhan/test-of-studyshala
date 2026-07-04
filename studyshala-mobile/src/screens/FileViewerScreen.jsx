/**
 * screens/FileViewerScreen.jsx — StudyShala
 * Warm dark theme matching StudentDashboard
 *   bg #13120f · surface #1e1c19 · accent #DE7356
 *
 * Supports:
 *  - PDF / Word / Excel / PowerPoint  → Google Docs Viewer inside WebView
 *  - Images (jpg/png/gif/webp/svg)    → WebView with HTML pinch-zoom wrapper
 *                                       (fixes auth-header URLs + SVG rendering)
 *  - Videos (mp4/webm)                → HTML5 <video> WebView
 *  - Audio (mp3/m4a/wav/ogg)          → HTML5 <audio> WebView
 *  - Text / HTML / unknown            → WebView
 *
 * OFFLINE CACHE FIX (this version):
 *  The previous "offline" build fed the raw app-private `file://...cache/...`
 *  path straight into <WebView>. On Android, WebView runs in its own process
 *  and is NOT allowed to read files out of your app's private storage via
 *  file://, even though your own JS/native code can — this is what produced
 *  `net::ERR_ACCESS_DENIED` for every cached file.
 *
 *  Fix: on Android, cached file:// paths are converted to a content:// URI
 *  via FileSystem.getContentUriAsync() (uses Android's FileProvider under the
 *  hood) before being passed to WebView. iOS WKWebView has no such
 *  restriction, so file:// is used as-is there. Everything else (the proven
 *  remote-URL viewing path, unchanged from the working old version) is left
 *  untouched.
 *
 * REMOTE URL FALLBACK FIX (this version):
 *  Files opened via a local-cache fast path (e.g. from StarredScreen) arrive
 *  here with only a `localPath` — no previewUrl/downloadUrl. On Expo Go,
 *  local file:// paths can't be converted to a WebView-safe content:// URI
 *  (FileProvider limitation), so resolvedLocalUri fails, and previously the
 *  screen fell back to buildViewUrl() with nothing to build from — an empty
 *  string fed straight into WebView, producing a silent blank/black screen.
 *  Fix: when a file arrives with no previewUrl/downloadUrl, fetch fresh ones
 *  from getMaterialFiles() the same way fileActions.openFile() already does,
 *  and hold the loading state until either a real URL is ready or we can
 *  honestly show the "couldn't open" error screen.
 *
 * Header behaviour:
 *  - Auto-hides after 3 s of inactivity (animated slide-up)
 *  - Tap anywhere on content  → toggle header visibility
 *  - Header always visible during loading / error states
 *
 * Header actions:
 *  - Back button
 *  - File name + subject subtitle (truncated)
 *  - Three-dot menu  →  Share link  |  Save to device  |  Open in browser
 *
 * Save to device uses expo-file-system + expo-media-library (images)
 * or expo-file-system + expo-sharing (other files).
 * All expo-* calls are wrapped in try/catch so the screen never crashes
 * if a package is missing from the project.
 */

import React, {
  useState, useRef, useCallback, useEffect,
} from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, TouchableWithoutFeedback,
  ActivityIndicator, Animated, Platform,
  Share, Modal, Linking, Alert,
  Dimensions, StatusBar,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue, useAnimatedStyle,
  withSpring, runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { getMaterialFiles } from '../api/studentApi';

// ─── Theme ───────────────────────────────────────────────────────────────────
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
  success:      '#4ade80',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18, xxl: 22 };

const HEADER_H     = 60;   // px, excluding safe-area top
const AUTO_HIDE_MS = 3000; // ms before header auto-hides

// ─── Shared pinch-zoom viewport injection ─────────────────────────────────────
const PINCH_ZOOM_INJECTED_JS = `
(function() {
  var meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
  document.head.appendChild(meta);
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  var style = document.createElement('style');
  style.textContent = 'html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: #13120f; }';
  document.head.appendChild(style);
})();
true;
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Derive file type category from mimeType or file name extension */
function getFileType(file) {
  const mime = (file.mimeType || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const ext  = name.split('.').pop();

  if (mime.startsWith('image/') || ['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext))
    return 'image';
  if (mime.startsWith('video/') || ['mp4','webm','mov','avi','mkv'].includes(ext))
    return 'video';
  if (mime.startsWith('audio/') || ['mp3','m4a','wav','ogg','flac','aac'].includes(ext))
    return 'audio';
  if (mime === 'application/pdf' || ext === 'pdf')
    return 'pdf';
  if (mime.includes('word') || ['doc','docx'].includes(ext))
    return 'office';
  if (mime.includes('sheet') || mime.includes('excel') || ['xls','xlsx','csv'].includes(ext))
    return 'office';
  if (mime.includes('presentation') || mime.includes('powerpoint') || ['ppt','pptx'].includes(ext))
    return 'office';
  if (mime.startsWith('text/') || ['txt','md','json','xml','html'].includes(ext))
    return 'text';
  return 'webview'; // fallback
}

/**
 * Build the URL WebView will load.
 *  - PDF / Office docs: wrapped with Google's public Docs Viewer, since the
 *    raw Drive /preview link often finishes "loading" before its own
 *    JS-heavy viewer has rendered anything inside a plain WebView.
 *  - Everything else (image/video/audio/text): raw previewUrl/downloadUrl,
 *    which Drive renders directly and reliably.
 */
function buildViewUrl(file, type) {
  if (type === 'pdf' || type === 'office') {
    const source = file.downloadUrl || file.previewUrl;
    if (source) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(source)}&embedded=true`;
    }
  }
  return file.previewUrl || file.downloadUrl || '';
}

/**
 * Build a direct-download URL for image files.
 *
 * Google Drive "preview" and "view" URLs return an HTML page, not raw bytes.
 * FileSystem.downloadAsync() happily downloads that HTML, writes it as .jpg,
 * and MediaLibrary then rejects the corrupt file — this is the primary reason
 * image downloads silently fail.
 */
function buildImageDownloadUrl(file) {
  const candidates = [file.downloadUrl, file.previewUrl].filter(Boolean);

  for (const url of candidates) {
    if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) {
      return url;
    }

    let fileId = null;
    const pathMatch  = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (pathMatch)  fileId = pathMatch[1];

    if (!fileId) {
      const paramMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (paramMatch) fileId = paramMatch[1];
    }

    if (fileId) {
      return `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
    }
  }

  return candidates[0] || '';
}

/**
 * Resolve a cached app-private path into a URI that WebView is actually
 * allowed to load.
 *
 *  - Android: WebView cannot read file:// paths under the app's private
 *    storage (this is what caused ERR_ACCESS_DENIED). Convert to a
 *    content:// URI via FileSystem.getContentUriAsync(), which uses
 *    Android's FileProvider under the hood and IS readable by WebView.
 *  - iOS: WKWebView can read file:// from the app sandbox directly, so the
 *    path is returned unchanged.
 *
 * Returns null if resolution fails, so callers can fall back to the remote
 * URL instead of feeding WebView a guaranteed-broken URI.
 */
async function resolveLocalUriForWebView(rawPath) {
  if (!rawPath) return null;
  const normalized = rawPath.startsWith('file://') ? rawPath : `file://${rawPath}`;

  if (Platform.OS !== 'android') {
    return normalized; // iOS: file:// works fine
  }

  if (!FileSystem || typeof FileSystem.getContentUriAsync !== 'function') {
    console.log('[FVS] getContentUriAsync unavailable — cannot safely load cached file on Android');
    return null;
  }

  const withoutScheme = normalized.replace('file://', '');
  const decodedPath   = decodeURIComponent(withoutScheme); // e.g. real space
  const encodedPath   = withoutScheme;                     // e.g. literal %20

  // Don't assume which form matches what's actually on disk — different Expo/
  // Android versions have gone back and forth on this. Ask the filesystem
  // directly which one is real, and use that. This is what "isn't writable"
  // and the FileNotFoundException on copyAsync were both actually reporting:
  // not a permissions issue, just the wrong candidate path.
  let realPath = null;
  try {
    const decodedInfo = await FileSystem.getInfoAsync(decodedPath).catch(() => ({}));
    if (decodedInfo.exists) {
      realPath = decodedPath;
    } else {
      const encodedInfo = await FileSystem.getInfoAsync(encodedPath).catch(() => ({}));
      if (encodedInfo.exists) realPath = encodedPath;
    }
  } catch (e) {
    console.log('[FVS] resolveLocalUriForWebView: existence check error:', e?.message);
  }

  console.log('[FVS] resolveLocalUriForWebView: on-disk match =', realPath || 'NEITHER FORM EXISTS', {
    decodedPath, encodedPath,
  });

  if (!realPath) {
    // Genuinely missing from disk (deleted outside the app, storage cleared,
    // etc). No point trying getContentUriAsync/copyAsync on a path that
    // doesn't exist — go straight to the remote fallback.
    return null;
  }

  try {
    const contentUri = await FileSystem.getContentUriAsync(realPath);
    console.log('[FVS] resolveLocalUriForWebView: content:// =', contentUri);
    return contentUri;
  } catch (e) {
    console.log('[FVS] resolveLocalUriForWebView ERROR (direct path):', e?.message, realPath);
  }

  // Fallback: some Android/Expo builds reject content-URI generation for
  // paths nested under documentDirectory (e.g. StudyShala/Saved/<id>/...)
  // even for a path that FileSystem.getInfoAsync just confirmed exists.
  // cacheDirectory is consistently covered by the FileProvider config when
  // documentDirectory subfolders sometimes aren't, so copy there and retry.
  try {
    const fileName = realPath.split('/').pop();
    const cachePath = FileSystem.cacheDirectory + fileName;
    const cacheInfo = await FileSystem.getInfoAsync(cachePath).catch(() => ({}));
    if (!cacheInfo.exists) {
      await FileSystem.copyAsync({ from: realPath, to: cachePath });
    }
    const contentUri = await FileSystem.getContentUriAsync(cachePath);
    console.log('[FVS] resolveLocalUriForWebView: content:// via cache copy =', contentUri);
    return contentUri;
  } catch (e2) {
    console.log('[FVS] resolveLocalUriForWebView ERROR (cache-copy fallback):', e2?.message);
    return null;
  }
}

// ─── Local cache repository ──────────────────────────────────────────────────
let fileRepository = null;
try { fileRepository = require('../database/fileRepository').fileRepository; } catch (_) {}

// ─── Optional expo packages (static imports — Metro needs literal strings) ────
let FileSystem   = null;
let MediaLibrary = null;
let Sharing      = null;
try { FileSystem   = require('expo-file-system');   } catch (_) {}
try {
  const m = require('expo-media-library');
  const base = (m && m.default) ? m.default : m;
  MediaLibrary = Object.assign({}, base, {
    requestPermissionsAsync : m.requestPermissionsAsync  ?? base.requestPermissionsAsync,
    getPermissionsAsync     : m.getPermissionsAsync      ?? base.getPermissionsAsync,
    saveToLibraryAsync      : m.saveToLibraryAsync       ?? base.saveToLibraryAsync,
    createAssetAsync        : m.createAssetAsync         ?? base.createAssetAsync,
  });
} catch (e) { console.log('[MediaLibrary] require error:', e); }
try { Sharing      = require('expo-sharing');       } catch (_) {}

// ─── Menu Sheet ──────────────────────────────────────────────────────────────
function MenuSheet({ visible, onClose, onShare, onSave, onBrowser }) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 300,
      useNativeDriver: true,
      tension: 65, friction: 11,
    }).start();
  }, [visible]);

  const actions = [
    { icon: 'share-outline',    label: 'Share link',      onPress: onShare   },
    { icon: 'download-outline', label: 'Save to device',  onPress: onSave    },
    { icon: 'open-outline',     label: 'Open in browser', onPress: onBrowser },
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
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 12,
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

// ─── Image Viewer — Gesture Handler + Reanimated pinch / pan / double-tap ────
function ImageViewer({ uri, onTap, onLoadEnd, onError }) {
  const scale      = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx         = useSharedValue(0);
  const ty         = useSharedValue(0);
  const savedTx    = useSharedValue(0);
  const savedTy    = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const SPRING = { damping: 20, stiffness: 200 };

  const resetZoom = () => {
    'worklet';
    scale.value      = withSpring(1, SPRING);
    savedScale.value = 1;
    tx.value         = withSpring(0, SPRING);
    ty.value         = withSpring(0, SPRING);
    savedTx.value    = 0;
    savedTy.value    = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      'worklet';
      scale.value = Math.max(1, Math.min(5, savedScale.value * e.scale));
    })
    .onEnd(() => {
      'worklet';
      if (scale.value < 1) {
        scale.value   = withSpring(1, SPRING);
        tx.value      = withSpring(0, SPRING);
        ty.value      = withSpring(0, SPRING);
        savedTx.value = 0;
        savedTy.value = 0;
      }
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      'worklet';
      if (scale.value <= 1.01) return;
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      if (scale.value <= 1.01) {
        tx.value = withSpring(0, SPRING);
        ty.value = withSpring(0, SPRING);
        savedTx.value = 0;
        savedTy.value = 0;
        return;
      }
      tx.value      = withSpring(tx.value + e.velocityX * 0.08, SPRING);
      ty.value      = withSpring(ty.value + e.velocityY * 0.08, SPRING);
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      'worklet';
      if (scale.value > 1.2) {
        resetZoom();
      } else {
        scale.value      = withSpring(2.5, SPRING);
        savedScale.value = 2.5;
      }
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .requireExternalGestureToFail(doubleTap)
    .onEnd(() => {
      'worklet';
      if (scale.value <= 1.05) runOnJS(onTap)();
    });

  const composed = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTap, singleTap),
    Gesture.Simultaneous(pinchGesture, panGesture),
  );

  const injectedJS = `
(function() {
  var s = document.createElement('style');
  s.textContent =
    'html,body{margin:0!important;padding:0!important;background:#000!important;overflow:hidden!important;}' +
    'img{max-width:100vw!important;max-height:100vh!important;width:auto!important;height:auto!important;object-fit:contain!important;display:block!important;}' +
    '[role="toolbar"],[aria-label*="toolbar"],[class*="toolbar"],[class*="header"],[class*="nav"]{display:none!important;}';
  document.head.appendChild(s);
})();
true;
`;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.black }}>
      <GestureDetector gesture={composed}>
        <Reanimated.View style={[{ flex: 1 }, animStyle]}>
          <WebView
            source={{ uri }}
            style={{ flex: 1, backgroundColor: C.black }}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            allowFileAccess
            allowUniversalAccessFromFileURLs
            scalesPageToFit={false}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            injectedJavaScript={injectedJS}
            onLoadEnd={onLoadEnd}
            onError={onError}
            onHttpError={onError}
            originWhitelist={['*']}
            setSupportMultipleWindows={false}
            renderToHardwareTextureAndroid
            androidLayerType="hardware"
            pointerEvents="none"
          />
        </Reanimated.View>
      </GestureDetector>

      <View style={iv.toolbar} pointerEvents="box-none">
        <TouchableOpacity
          style={iv.btn}
          onPress={() => {
            scale.value      = withSpring(1, { damping: 20, stiffness: 200 });
            savedScale.value = 1;
            tx.value         = withSpring(0, { damping: 20, stiffness: 200 });
            ty.value         = withSpring(0, { damping: 20, stiffness: 200 });
            savedTx.value    = 0;
            savedTy.value    = 0;
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="contract-outline" size={20} color={C.white} />
        </TouchableOpacity>
      </View>

      <Text style={iv.hint}>Pinch to zoom · Double-tap to fit</Text>
    </GestureHandlerRootView>
  );
}

const iv = StyleSheet.create({
  toolbar: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.70)',
    borderRadius: R.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  btn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: R.full,
  },
  hint: {
    position: 'absolute',
    bottom: 88,
    alignSelf: 'center',
    fontSize: T.xs,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
  },
});

// ─── Video Viewer (HTML5 <video> in WebView) ──────────────────────────────────
function MediaViewer({ uri, type, onTap }) {
  const { width: screenW, height: screenH } = Dimensions.get('window');

  let html;
  if (type === 'audio') {
    html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              height: 100vh;
              background: #13120f;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              color: #e8e4de;
              padding: 24px;
              -webkit-overflow-scrolling: touch;
            }
            .icon { font-size: 64px; margin-bottom: 24px; opacity: 0.6; }
            audio { width: 100%; outline: none; }
            audio::-webkit-media-controls-panel { background: #1e1c19; }
          </style>
        </head>
        <body>
          <div class="icon">🎵</div>
          <audio controls playsinline>
            <source src="${uri}" />
            Your browser does not support the audio element.
          </audio>
        </body>
      </html>
    `;
  } else {
    html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: 100%; height: 100%;
              background: #13120f;
              display: flex;
              align-items: center;
              justify-content: center;
              -webkit-overflow-scrolling: touch;
            }
            video {
              width: 100%;
              height: 100%;
              max-width: ${screenW}px;
              max-height: ${screenH}px;
              object-fit: contain;
              background: #000;
            }
          </style>
        </head>
        <body>
          <video
            controls
            playsinline
           webkit-playsinline
            x-webkit-airplay="allow"
          >
            <source src="${uri}" />
            Your browser does not support the video element.
          </video>
        </body>
      </html>
    `;
  }

  return (
    <TouchableWithoutFeedback onPress={onTap}>
      <View style={{ flex: 1, backgroundColor: C.black }}>
        <WebView
          source={{ html }}
          style={{ flex: 1, backgroundColor: C.black }}
          javaScriptEnabled
          domStorageEnabled={false}
          scalesPageToFit={false}
          scrollEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo
          allowFileAccess
          allowUniversalAccessFromFileURLs
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          onLoadEnd={() => {}}
          onError={() => {}}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─── File type meta ───────────────────────────────────────────────────────────
const FILE_TYPE_ICON = {
  image:   'image-outline',
  video:   'videocam-outline',
  audio:   'musical-notes-outline',
  pdf:     'document-outline',
  office:  'document-text-outline',
  text:    'code-slash-outline',
  webview: 'globe-outline',
};
const FILE_TYPE_LABEL = {
  image:   'Image',
  video:   'Video',
  audio:   'Audio',
  pdf:     'PDF Document',
  office:  'Office Document',
  text:    'Text File',
  webview: 'Web Content',
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function FileViewerScreen({ route, navigation }) {
  const { file, material } = route.params ?? {};
  const insets = useSafeAreaInsets();

  useEffect(() => {
    console.log('[FVS] mount params:', {
      fileId: file?._id, name: file?.name,
      localPath: file?.localPath,
      previewUrl: file?.previewUrl, downloadUrl: file?.downloadUrl,
      materialId: material?._id || file?.materialId,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [saveStatus,    setSaveStatus]    = useState('');

  const headerAnim   = useRef(new Animated.Value(1)).current;
  const hideTimerRef = useRef(null);

  const loadingRef  = useRef(loading);
  const errorRef    = useRef(error);
  const menuOpenRef = useRef(menuOpen);
  useEffect(() => { loadingRef.current  = loading;  }, [loading]);
  useEffect(() => { errorRef.current    = error;    }, [error]);
  useEffect(() => { menuOpenRef.current = menuOpen; }, [menuOpen]);

  const fileType = getFileType(file ?? {});

  // ── Offline cache state ───────────────────────────────────────────────────
  // rawLocalPath: whatever fileRepository / route param gives us (app-private file://)
  // resolvedLocalUri: the WebView-safe URI derived from rawLocalPath (content:// on
  //   Android, file:// on iOS). null until resolved or if resolution fails.
  const [rawLocalPath,     setRawLocalPath]     = useState(file?.localPath || null);
  const [resolvedLocalUri, setResolvedLocalUri] = useState(null);
  const [localResolutionDone, setLocalResolutionDone] = useState(!file?.localPath);
  const pollTimerRef = useRef(null);

  // Whenever rawLocalPath changes, resolve it to a URI WebView can actually load.
  useEffect(() => {
    let cancelled = false;
    if (!rawLocalPath) {
      setResolvedLocalUri(null);
      setLocalResolutionDone(true);
      return;
    }
    setLocalResolutionDone(false);
    (async () => {
      const resolved = await resolveLocalUriForWebView(rawLocalPath);
      if (!cancelled) {
        setResolvedLocalUri(resolved);
        setLocalResolutionDone(true);
      }
    })();
    return () => { cancelled = true; };
  }, [rawLocalPath]);

  // ── Remote URL fallback ───────────────────────────────────────────────────
  // Files opened with only a localPath (no previewUrl/downloadUrl — this is
  // how fileActions.openFile()'s Step 1 fast path hands off a saved file)
  // need a fresh remote URL fetched here whenever local resolution can't be
  // used (e.g. Expo Go's content:// / FileProvider limitation). Without this,
  // resolvedLocalUri fails, buildViewUrl() has nothing to build from, and
  // WebView silently loads an empty string — the black-screen bug.
  const [remoteUrls, setRemoteUrls] = useState({ previewUrl: null, downloadUrl: null });
  const [remoteFetchDone, setRemoteFetchDone] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const needsRemote = !file?.previewUrl && !file?.downloadUrl;
    const materialId  = material?._id || file?.materialId;

    if (!needsRemote || !materialId) {
      if (needsRemote && !materialId) {
        console.log('[FVS] remote fallback skipped — no materialId available on file/material params');
      }
      setRemoteFetchDone(true);
      return;
    }

    setRemoteFetchDone(false);
    (async () => {
      try {
        const res = await getMaterialFiles(materialId);
        const data = res?.data || {};
        const allFiles = [
          ...(data.files || []),
          ...(data.subFolders || []).flatMap(sf => sf.files || []),
        ];
        const fresh = allFiles.find(f2 =>
          String(f2._id) === String(file?._id) ||
          String(f2.fileId) === String(file?._id) ||
          String(f2.id) === String(file?._id),
        );
        console.log('[FVS] remote fallback fetch result:', {
          materialId, fileId: file?._id, totalFilesFetched: allFiles.length,
          matched: !!fresh, freshPreviewUrl: fresh?.previewUrl, freshDownloadUrl: fresh?.downloadUrl,
        });
        if (fresh && !cancelled) {
          setRemoteUrls({
            previewUrl:  fresh.previewUrl  || null,
            downloadUrl: fresh.downloadUrl || null,
          });
        }
      } catch (e) {
        console.log('[FVS] remote URL refresh failed:', e?.message);
      } finally {
        if (!cancelled) setRemoteFetchDone(true);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // effectiveFile: the file object actually used for building the view URL —
  // route params first, remote refresh filling in only what's missing.
  const effectiveFile = {
    ...file,
    previewUrl:  file?.previewUrl  || remoteUrls.previewUrl,
    downloadUrl: file?.downloadUrl || remoteUrls.downloadUrl,
  };

  // Android WebView cannot render .docx/.pptx/.xlsx at all — it's an HTML
  // renderer, not an Office document engine. The Google Docs Viewer wrapper
  // (buildViewUrl) only works for the REMOTE case because it hands the file
  // to Google's own servers to render; a local content:// URI can't be
  // reached by Google's servers, so there is no way to render a genuinely
  // local Office file inside this WebView, full stop. The only real fix is
  // to hand the file off to a native document-viewer app already on the
  // device (Google Docs, WPS Office, Microsoft Office, etc.) via the OS's
  // own "open with" resolution — exactly what Linking.openURL() does for a
  // content:// URI on Android.
  const needsNativeHandoff = fileType === 'office' && !!resolvedLocalUri;

  useEffect(() => {
    if (needsNativeHandoff) setLoading(false);
  }, [needsNativeHandoff]);

  const handleOpenLocalDocument = () => {
    Linking.openURL(resolvedLocalUri).catch(() => {
      Alert.alert(
        'No document viewer found',
        'Install a document viewer app (Google Docs, WPS Office, Microsoft Word/PowerPoint, etc.) to open this file offline.',
      );
    });
  };

  // viewUrl: prefer the resolved cached URI; if cache resolution hasn't
  // finished yet OR failed, fall back to the proven remote previewUrl —
  // never feed WebView a raw app-private file:// path.
  const viewUrl   = resolvedLocalUri || buildViewUrl(effectiveFile, fileType);
  // urlsReady: both the local-cache resolution attempt and the remote-URL
  // refresh attempt (if one was needed) have finished — only once both are
  // done do we know whether viewUrl is genuinely empty or just not ready yet.
  const urlsReady = localResolutionDone && remoteFetchDone;
  const isLoading = loading;

  // If everything that could produce a URL has finished and we still don't
  // have one, show the honest error screen instead of a silent blank WebView.
  useEffect(() => {
    if (urlsReady && !viewUrl && !error) {
      setLoading(false);
      setError(true);
    }
  }, [urlsReady, viewUrl, error]);

  // ── Header show / hide ────────────────────────────────────────────────────
  const hideHeader = useCallback(() => {
    setHeaderVisible(false);
    Animated.timing(headerAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  }, [headerAnim]);

  const showHeader = useCallback(() => {
    setHeaderVisible(true);
    Animated.timing(headerAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!loadingRef.current && !errorRef.current && !menuOpenRef.current) {
        hideHeader();
      }
    }, AUTO_HIDE_MS);
  }, [headerAnim, hideHeader]);

  const toggleHeader = useCallback(() => {
    setHeaderVisible(prev => {
      if (prev) {
        clearTimeout(hideTimerRef.current);
        Animated.timing(headerAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
        return false;
      } else {
        showHeader();
        return true;
      }
    });
  }, [headerAnim, showHeader]);

  useEffect(() => {
    if (!loading && !error) showHeader();
    return () => clearTimeout(hideTimerRef.current);
  }, [loading, error]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (menuOpen) {
      clearTimeout(hideTimerRef.current);
      showHeader();
    }
  }, [menuOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Check fileRepository on mount + poll if download is in progress ───────
  useEffect(() => {
    let cancelled = false;

    const checkCache = async () => {
      try {
        if (file?._id && fileRepository) {
          const rec = await fileRepository.getById(file._id);
          if (rec?.localPath && rec?.downloaded && !cancelled) {
            setRawLocalPath(rec.localPath);
          }
          await fileRepository.updateLastOpened(file._id);
        }
      } catch (e) {
        console.log('[FVS] checkCache ERROR:', e?.message);
      }
    };
    checkCache();

    if (file?.isDownloading && !file?.localPath && file?._id && fileRepository) {
      const poll = async () => {
        if (cancelled) return;
        try {
          const rec = await fileRepository.getById(file._id);
          if (rec?.localPath && rec?.downloaded) {
            if (!cancelled) setRawLocalPath(rec.localPath);
            return;
          }
        } catch (_) {}
        if (!cancelled) pollTimerRef.current = setTimeout(poll, 1500);
      };
      pollTimerRef.current = setTimeout(poll, 1500);
    }

    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────

  const downloadToCache = async () => {
    if (!FileSystem) throw new Error('expo-file-system not available');
    const url = effectiveFile?.downloadUrl || effectiveFile?.previewUrl;
    if (!url) throw new Error('No download URL');
    const ext      = (file?.name || 'file').split('.').pop() || 'bin';
    const fileName = `studyshala_${Date.now()}.${ext}`;
    const localUri = FileSystem.cacheDirectory + fileName;
    const result   = await FileSystem.downloadAsync(url, localUri);
    if (result.status !== 200) throw new Error(`Download failed: HTTP ${result.status}`);
    return result.uri;
  };

  const handleShare = async () => {
    try {
      if (Sharing) {
        const localUri  = await downloadToCache();
        const canShare  = await Sharing.isAvailableAsync();
        if (canShare) { await Sharing.shareAsync(localUri, { mimeType: file?.mimeType || '*/*', dialogTitle: file?.name || 'Share file' }); return; }
      }
      await Share.share({ message: `${file?.name ?? 'File'}\n${effectiveFile?.downloadUrl ?? effectiveFile?.previewUrl ?? ''}` });
    } catch (e) {
      await Share.share({ message: `${file?.name ?? 'File'}\n${effectiveFile?.downloadUrl ?? effectiveFile?.previewUrl ?? ''}` });
    }
  };

  const handleOpenBrowser = () => {
    const url = effectiveFile?.previewUrl || effectiveFile?.downloadUrl;
    if (url) Linking.openURL(url).catch(() => {});
  };

  const handleSave = async () => {
    const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const ext = (file?.name || '').split('.').pop().toLowerCase();
    const isImage = fileType === 'image' && IMAGE_EXTS.includes(ext);

    if (isImage) {
      if (!FileSystem) {
        setSaveStatus('error:expo-file-system not installed');
        setTimeout(() => setSaveStatus(''), 3500);
        return;
      }

      const url = buildImageDownloadUrl(effectiveFile);
      if (!url) {
        setSaveStatus('error:No download URL available');
        setTimeout(() => setSaveStatus(''), 3500);
        return;
      }

      setSaveStatus('downloading:0');
      const fileName = `studyshala_${Date.now()}.${ext}`;
      const localUri = FileSystem.cacheDirectory + fileName;

      try {
        const task = FileSystem.createDownloadResumable(
          url,
          localUri,
          {},
          ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
            if (totalBytesExpectedToWrite > 0) {
              const pct = Math.min(99, Math.round(
                (totalBytesWritten / totalBytesExpectedToWrite) * 100,
              ));
              setSaveStatus(`downloading:${pct}`);
            }
          },
        );

        const result = await task.downloadAsync();

        if (!result) throw new Error('Download returned no result');
        if (result.status !== 200) {
          throw new Error(`Server returned HTTP ${result.status} — check the download URL`);
        }

        setSaveStatus('downloading:100');

        if (!MediaLibrary) {
          throw new Error('expo-media-library not installed');
        }

        let perm;
        if (typeof MediaLibrary.requestPermissionsAsync === 'function') {
          perm = await MediaLibrary.requestPermissionsAsync();
        } else if (typeof MediaLibrary.getPermissionsAsync === 'function') {
          perm = await MediaLibrary.getPermissionsAsync();
          if (perm.status !== 'granted') {
            throw new Error(
              'expo-media-library: requestPermissionsAsync is not available — ' +
              'please run: npx expo install expo-media-library  and rebuild the app'
            );
          }
        } else {
          throw new Error(
            'expo-media-library: no permission API found — ' +
            'please run: npx expo install expo-media-library  and rebuild the app'
          );
        }

        if (perm.status === 'denied') {
          throw new Error('Photo library permission denied — enable it in Settings');
        }
        if (perm.status !== 'granted') {
          throw new Error(`Permission not granted (status: ${perm.status})`);
        }

        if (typeof MediaLibrary.saveToLibraryAsync === 'function') {
          await MediaLibrary.saveToLibraryAsync(result.uri);
        } else if (typeof MediaLibrary.createAssetAsync === 'function') {
          await MediaLibrary.createAssetAsync(result.uri);
        } else {
          throw new Error('expo-media-library: neither saveToLibraryAsync nor createAssetAsync found');
        }

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2500);

      } catch (err) {
        const msg = err?.message || String(err) || 'Unknown error';
        setSaveStatus(`error:${msg}`);
        setTimeout(() => setSaveStatus(''), 4000);
      }
      return;
    }

    setSaveStatus('saving');
    try {
      const localUri = await downloadToCache();

      if ((fileType === 'image' || fileType === 'video') && MediaLibrary) {
        const perm = await MediaLibrary.requestPermissionsAsync();
        if (perm.status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(localUri);
          setSaveStatus('saved');
          return;
        }
      }

      if (Sharing) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(localUri, { mimeType: file?.mimeType || '*/*', dialogTitle: `Save ${file?.name || 'file'}` });
          setSaveStatus('saved');
          return;
        }
      }

      Linking.openURL(effectiveFile?.downloadUrl || effectiveFile?.previewUrl || '').catch(() => {});
      setSaveStatus('saved');
    } catch (_) {
      setSaveStatus('error');
    } finally {
      setTimeout(() => setSaveStatus(''), 2500);
    }
  };

  // ── Render content by type ────────────────────────────────────────────────
  const renderContent = () => {
    if (error) return null;
    if (needsNativeHandoff) return null; // handled by its own screen below
    if (!viewUrl) return null; // still resolving local/remote URL — loading overlay stays visible

    if (fileType === 'image') {
      return (
        <ImageViewer
          uri={viewUrl}
          onTap={toggleHeader}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            // If a resolved cached URI just failed, drop back to the remote
            // URL instead of showing a hard error — the user still gets to
            // view the file as long as they're online.
            if (resolvedLocalUri) {
              console.log('[FVS] cached image failed to load — falling back to remote URL');
              setResolvedLocalUri(null);
              setRawLocalPath(null);
              return;
            }
            setLoading(false);
            setError(true);
          }}
        />
      );
    }

    if (fileType === 'video' || fileType === 'audio') {
      return <MediaViewer uri={viewUrl} type={fileType} onTap={toggleHeader} />;
    }

    return (
      <WebView
        source={{ uri: viewUrl }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          if (resolvedLocalUri) {
            console.log('[FVS] cached doc failed to load — falling back to remote URL');
            setResolvedLocalUri(null);
            setRawLocalPath(null);
            return;
          }
          setLoading(false);
          setError(true);
        }}
        style={s.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState={false}
        allowsFullscreenVideo
        allowFileAccess
        allowUniversalAccessFromFileURLs
        scalesPageToFit={Platform.OS === 'android'}
        setSupportMultipleWindows={false}
        injectedJavaScript={PINCH_ZOOM_INJECTED_JS}
        onTouchEnd={toggleHeader}
        renderToHardwareTextureAndroid
        androidLayerType="hardware"
        scrollEnabled
        nestedScrollEnabled
        overScrollMode="always"
      />
    );
  };

  // ── Animated header ───────────────────────────────────────────────────────
  const headerHeight  = HEADER_H + insets.top;
  const headerTranslateY = headerAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [-headerHeight - 4, 0],
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.surface} />

      <View style={[s.content, { paddingTop: insets.top }]}>
        {renderContent()}

        {isLoading && !error && (
          <View style={s.loadingOverlay}>
            <View style={s.loadingCard}>
              <ActivityIndicator size="large" color={C.accent} />
              <Text style={s.loadingTitle}>Opening file…</Text>
              <Text style={s.loadingDesc}>{FILE_TYPE_LABEL[fileType] || 'Loading'}</Text>
            </View>
          </View>
        )}

        {needsNativeHandoff && (
          <View style={s.errorWrap}>
            <View style={s.errorCard}>
              <View style={s.errorIconWrap}>
                <Ionicons name="document-text-outline" size={36} color={C.accent} />
              </View>
              <Text style={s.errorTitle}>Open with a document app</Text>
              <Text style={s.errorDesc}>
                This file is saved on your device and ready to view offline — Word,
                PowerPoint and Excel files open through your phone's own document
                viewer app rather than inside StudyShala.
              </Text>
              <TouchableOpacity style={s.errorBtn} onPress={handleOpenLocalDocument} activeOpacity={0.85}>
                <Ionicons name="open-outline" size={16} color={C.white} />
                <Text style={s.errorBtnText}>Open Document</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {error && (
          <View style={s.errorWrap}>
            <View style={s.errorCard}>
              <View style={s.errorIconWrap}>
                <Ionicons name="document-text-outline" size={36} color={C.accent} />
              </View>
              <Text style={s.errorTitle}>Couldn't open file</Text>
              <Text style={s.errorDesc}>
                This file type may not support in-app preview. Try opening it in your browser.
              </Text>
              <TouchableOpacity style={s.errorBtn} onPress={handleOpenBrowser} activeOpacity={0.85}>
                <Ionicons name="open-outline" size={16} color={C.white} />
                <Text style={s.errorBtnText}>Open in Browser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.errorBtnSecondary} onPress={handleShare}>
                <Ionicons name="share-outline" size={16} color={C.accent} />
                <Text style={s.errorBtnSecondaryText}>Share Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Animated.View
        style={[
          s.headerWrap,
          { paddingTop: insets.top, transform: [{ translateY: headerTranslateY }] },
        ]}
        pointerEvents={headerVisible ? 'box-none' : 'none'}
      >
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={C.textSec} />
          </TouchableOpacity>

          <View style={s.titleBlock}>
            <Text style={s.titleText} numberOfLines={1}>
              {file?.name || 'File Viewer'}
            </Text>
            {!!material?.subjectName && (
              <Text style={s.titleSub} numberOfLines={1}>{material.subjectName}</Text>
            )}
          </View>

          {!!saveStatus && (() => {
            const isDownloading = saveStatus.startsWith('downloading:');
            const isErrorMsg    = saveStatus.startsWith('error:');
            const isBareError   = saveStatus === 'error';
            const isError       = isErrorMsg || isBareError;
            const isSaved       = saveStatus === 'saved';
            const isSaving      = saveStatus === 'saving';

            const pct      = isDownloading ? parseInt(saveStatus.split(':')[1], 10) : 0;
            const errorMsg = isErrorMsg    ? saveStatus.slice(6) : 'Failed';

            return (
              <View style={[
                s.statusPill,
                isError && s.statusPillError,
                isDownloading && s.statusPillDownload,
              ]}>
                {isSaving ? (
                  <ActivityIndicator size={11} color={C.accent} />
                ) : isDownloading ? (
                  <>
                    <Ionicons name="arrow-down-circle-outline" size={13} color={C.accent} />
                    <Text style={s.statusText}>Downloading {pct}%</Text>
                    <View style={s.downloadTrack}>
                      <View style={[s.downloadFill, { width: `${pct}%` }]} />
                    </View>
                  </>
                ) : (
                  <Ionicons
                    name={isSaved ? 'checkmark-circle' : 'alert-circle'}
                    size={13}
                    color={isSaved ? C.success : C.error}
                  />
                )}
                {!isDownloading && (
                  <Text
                    style={[s.statusText, isError && { color: C.error }]}
                    numberOfLines={1}
                  >
                    {isSaving ? 'Saving…' : isSaved ? 'Saved!' : errorMsg}
                  </Text>
                )}
              </View>
            );
          })()}

          <TouchableOpacity style={s.iconBtn} onPress={() => setMenuOpen(true)}>
            <Ionicons name="ellipsis-vertical" size={18} color={C.textSec} />
          </TouchableOpacity>
        </View>

        <View style={s.typeBadgeRow}>
          <View style={s.typeBadge}>
            <Ionicons name={FILE_TYPE_ICON[fileType] || 'document-outline'} size={11} color={C.accent} />
            <Text style={s.typeBadgeText}>{FILE_TYPE_LABEL[fileType] || 'File'}</Text>
          </View>
          {!loading && !error && (
            <Text style={s.tapHint}>Tap to {headerVisible ? 'hide' : 'show'} controls</Text>
          )}
        </View>
      </Animated.View>

      <MenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onShare={handleShare}
        onSave={handleSave}
        onBrowser={handleOpenBrowser}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  content: { flex: 1 },
  webview:  { flex: 1, backgroundColor: C.bg },

  headerWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
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
  titleBlock: { flex: 1 },
  titleText: { fontSize: T.base + 1, fontWeight: '700', color: C.textPrimary },
  titleSub:  { fontSize: T.xs, color: C.textMuted, marginTop: 1 },

  typeBadgeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 8, gap: 8,
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.accentBg, borderRadius: R.full,
    paddingVertical: 3, paddingHorizontal: 9,
    borderWidth: 1, borderColor: C.accentBorder,
  },
  typeBadgeText: { fontSize: T.xs, color: C.accent, fontWeight: '600' },
  tapHint:       { fontSize: T.xs, color: C.textMuted },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.accentBg, borderRadius: R.full,
    paddingVertical: 4, paddingHorizontal: 8,
    borderWidth: 1, borderColor: C.accentBorder,
  },
  statusPillError: { backgroundColor: 'rgba(248,113,113,0.09)', borderColor: 'rgba(248,113,113,0.3)' },
  statusPillDownload: { paddingVertical: 6, paddingHorizontal: 10, maxWidth: 200 },
  statusText: { fontSize: T.xs, color: C.accent, fontWeight: '600', flexShrink: 1 },

  downloadTrack: {
    width: 48, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(222,115,86,0.22)', overflow: 'hidden',
  },
  downloadFill: {
    height: 3, borderRadius: 2,
    backgroundColor: C.accent,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bg, zIndex: 10,
  },
  loadingCard: {
    alignItems: 'center', padding: 32,
    backgroundColor: C.surface, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.border,
    minWidth: 180,
  },
  loadingTitle: { fontSize: T.md, fontWeight: '700', color: C.textPrimary, marginTop: 16 },
  loadingDesc:  { fontSize: T.sm, color: C.textMuted, marginTop: 4 },

  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  errorCard: {
    alignItems: 'center', padding: 28, width: '100%',
    backgroundColor: C.surface, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.border,
  },
  errorIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  errorTitle: { fontSize: T.lg, fontWeight: '800', color: C.textPrimary, marginBottom: 8, textAlign: 'center' },
  errorDesc:  { fontSize: T.sm, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  errorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accent, borderRadius: R.md,
    paddingVertical: 12, paddingHorizontal: 22, marginBottom: 10, width: '100%',
    justifyContent: 'center',
  },
  errorBtnText: { fontSize: T.base, fontWeight: '700', color: C.white },
  errorBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accentBg, borderRadius: R.md,
    paddingVertical: 12, paddingHorizontal: 22, width: '100%',
    justifyContent: 'center', borderWidth: 1, borderColor: C.accentBorder,
  },
  errorBtnSecondaryText: { fontSize: T.base, fontWeight: '600', color: C.accent },
});
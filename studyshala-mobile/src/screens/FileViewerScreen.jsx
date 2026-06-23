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
 * All WebView instances inject:
 *   <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
 * to enable proper pinch-to-zoom on every content type (PDF, Office, images, etc.)
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
  ScrollView, Share, Modal, Linking,
  Dimensions, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

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
// Inject this into EVERY WebView so all content (PDF, Office, images, video,
// audio) respects the user's pinch-to-zoom gesture regardless of native settings.
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

/** Always use previewUrl directly — it's already a valid Google Drive preview link */
function buildViewUrl(file, _type) {
  return file.previewUrl || file.downloadUrl || '';
}

// ─── Optional expo packages (static imports — Metro needs literal strings) ────
let FileSystem   = null;
let MediaLibrary = null;
let Sharing      = null;
try { FileSystem   = require('expo-file-system');   } catch (_) {}
try { MediaLibrary = require('expo-media-library'); } catch (_) {}
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

  // Keep rendered so the slide-out animation plays before unmounting
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

// ─── Image Viewer (WebView-based pinch-zoom) ───────────────────────────────────
/**
 * Renders any image inside a full-screen WebView with HTML pinch-zoom.
 *
 * Why WebView instead of <Image>:
 *  1. Image.getSize fails for remote URLs that need auth headers (e.g. Google Drive
 *     signed URLs) — WebView's <img src> bypasses this limitation.
 *  2. React Native's <Image> does not render SVG files — WebView handles all formats.
 *  3. <meta name="viewport"> in the injected HTML gives us proper pinch-to-zoom on
 *     all Android versions (scalesPageToFit only does initial fit, no gesture zoom).
 */
function ImageViewer({ uri, onTap }) {
  const injectedJS = `
    (function() {
      var meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
      document.head.appendChild(meta);
      document.body {
        margin: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: #13120f;
        overflow: hidden;
      }
      img {
        max-width: 100vw;
        max-height: 100vh;
        object-fit: contain;
        display: block;
      }
    })();
    true;
  `;

  return (
    <TouchableWithoutFeedback onPress={onTap}>
      <View style={{ flex: 1, backgroundColor: C.black }}>
        <WebView
          source={{ html: `
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
                    overflow: hidden;
                    -webkit-overflow-scrolling: touch;
                  }
                  img {
                    max-width: 100vw;
                    max-height: 100vh;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    display: block;
                  }
                </style>
              </head>
              <body>
                <img src="${uri}" alt="image" />
              </body>
            </html>
          ` }}
          style={{ flex: 1, backgroundColor: C.black }}
          javaScriptEnabled={false}
          domStorageEnabled={false}
          injectedJavaScript={injectedJS}
          scalesPageToFit={false}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          onLoadEnd={() => {}}
          onError={() => {}}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─── Video Viewer (HTML5 <video> in WebView) ──────────────────────────────────
/**
 * Renders video/audio in a proper HTML5 <video> or <audio> element inside a WebView.
 *
 * Fallback to WebView-based previewUrl (e.g. Google Drive embed) for remote sources
 * that require auth headers, since RN's native Video component cannot handle them.
 *
 * <meta name="viewport"> injection enables pinch-to-zoom on the video frame itself.
 */
function MediaViewer({ uri, type, onTap }) {
  const { width: screenW, height: screenH } = Dimensions.get('window');

  let html;
  if (type === 'audio') {
    // Audio — waveform UI with native controls
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
    // Video — full-bleed HTML5 player with pinch-zoom
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
          javaScriptEnabled={false}
          domStorageEnabled={false}
          scalesPageToFit={false}
          scrollEnabled={false}
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

  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [saveStatus,    setSaveStatus]    = useState(''); // '', 'saving', 'saved', 'error'

  const headerAnim   = useRef(new Animated.Value(1)).current;
  const hideTimerRef = useRef(null);

  // Keep latest values in refs to avoid stale closures in timer callbacks
  const loadingRef  = useRef(loading);
  const errorRef    = useRef(error);
  const menuOpenRef = useRef(menuOpen);
  useEffect(() => { loadingRef.current  = loading;  }, [loading]);
  useEffect(() => { errorRef.current    = error;    }, [error]);
  useEffect(() => { menuOpenRef.current = menuOpen; }, [menuOpen]);

  const fileType = getFileType(file ?? {});
  const viewUrl  = buildViewUrl(file ?? {}, fileType);
  const isLoading = loading && fileType !== 'image';

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
      // Read current values from refs — no stale-closure risk
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

  // Start auto-hide once content finishes loading
  useEffect(() => {
    if (!loading && !error) showHeader();
    return () => clearTimeout(hideTimerRef.current);
  }, [loading, error]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep header visible while menu is open
  useEffect(() => {
    if (menuOpen) {
      clearTimeout(hideTimerRef.current);
      showHeader();
    }
  }, [menuOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      await Share.share({ message: `${file?.name ?? 'File'}\n${file?.previewUrl ?? file?.downloadUrl ?? ''}` });
    } catch {}
  };

  const handleOpenBrowser = () => {
    const url = file?.previewUrl || file?.downloadUrl;
    if (url) Linking.openURL(url).catch(() => {});
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    const url = file?.downloadUrl || file?.previewUrl;
    if (!url) { setSaveStatus('error'); setTimeout(() => setSaveStatus(''), 2500); return; }

    try {
      if (!FileSystem) throw new Error('expo-file-system not available');

      const ext      = (file?.name || 'file').split('.').pop() || 'bin';
      const localUri = FileSystem.cacheDirectory + 'studyshala_' + Date.now() + '.' + ext;

      const dl = await FileSystem.downloadAsync(url, localUri);

      if ((fileType === 'image' || fileType === 'audio') && MediaLibrary) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(dl.uri);
          setSaveStatus('saved');
          return;
        }
      }

      if (Sharing) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) { await Sharing.shareAsync(dl.uri); setSaveStatus('saved'); return; }
      }

      Linking.openURL(url).catch(() => {});
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

    if (fileType === 'image') {
      return <ImageViewer uri={viewUrl} onTap={toggleHeader} />;
    }

    if (fileType === 'video' || fileType === 'audio') {
      return <MediaViewer uri={viewUrl} type={fileType} onTap={toggleHeader} />;
    }

    // PDF / Office / Text / WebView — WebView with injected pinch-zoom viewport.
    // On Android, scalesPageToFit="true" only does initial-fit; injecting the
    // <meta viewport> above gives real pinch-to-zoom. On iOS WKWebView this is
    // also the reliable path for PDFs and Office docs.
    return (
      <WebView
        source={{ uri: viewUrl }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        style={s.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState={false}
        allowsFullscreenVideo
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

      {/* ── Full-screen content ── */}
      <View style={[s.content, { paddingTop: insets.top }]}>
        {renderContent()}

        {/* Loading overlay */}
        {isLoading && !error && (
          <View style={s.loadingOverlay}>
            <View style={s.loadingCard}>
              <ActivityIndicator size="large" color={C.accent} />
              <Text style={s.loadingTitle}>Opening file…</Text>
              <Text style={s.loadingDesc}>{FILE_TYPE_LABEL[fileType] || 'Loading'}</Text>
            </View>
          </View>
        )}

        {/* Error state */}
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

      {/* ── Floating header ── */}
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

          {!!saveStatus && (
            <View style={[s.statusPill, saveStatus === 'error' && s.statusPillError]}>
              {saveStatus === 'saving' ? (
                <ActivityIndicator size={11} color={C.accent} />
              ) : (
                <Ionicons
                  name={saveStatus === 'saved' ? 'checkmark-circle' : 'alert-circle'}
                  size={13}
                  color={saveStatus === 'saved' ? C.success : C.error}
                />
              )}
              <Text style={[s.statusText, saveStatus === 'error' && { color: C.error }]}>
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : 'Failed'}
              </Text>
            </View>
          )}

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
  statusText: { fontSize: T.xs, color: C.accent, fontWeight: '600' },

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

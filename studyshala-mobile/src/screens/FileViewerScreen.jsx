/**
 * screens/FileViewerScreen.jsx — StudyShala Dark Theme
 * Opens any file URL inside the app via WebView.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../components/theme';

export default function FileViewerScreen({ route, navigation }) {
  const { file, material } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{file.name || 'File Viewer'}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* WebView */}
      <View style={s.webviewContainer}>
        {loading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={s.loadingText}>Loading file…</Text>
          </View>
        )}
        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={48} color={C.accent} />
            <Text style={s.errorTitle}>Couldn't load file</Text>
            <Text style={s.errorDesc}>Try downloading it instead.</Text>
          </View>
        ) : (
          <WebView
            source={{ uri: file.previewUrl }}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
            style={s.webview}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: T.base + 1, fontWeight: '700', color: C.textPrimary, marginHorizontal: 10 },
  webviewContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: C.bg },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bg, zIndex: 10,
  },
  loadingText: { marginTop: 12, color: C.textSecondary, fontSize: T.base },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorTitle: { fontSize: T.lg, fontWeight: '700', color: C.textPrimary, marginTop: 16 },
  errorDesc: { fontSize: T.base, color: C.textMuted, marginTop: 6 },
});
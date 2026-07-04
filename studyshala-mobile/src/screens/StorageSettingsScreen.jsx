/**
 * screens/StorageSettingsScreen.jsx — StudyShala
 * ==================================================
 * Simplified for the single-tier offline model: there is no more cache
 * size limit, no expiry setting, and no "Clear Cache" button, because
 * there's no cache tier left to manage. The only storage StudyShala uses
 * is permanently saved materials, and the only way to free that space is
 * to remove a saved material — which happens on the Saved Materials
 * screen, not here. This screen is now just: how much space are my saved
 * materials using, and where do downloads get mirrored to.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { downloadManager } from '../services/downloadManager';
import { storageLocationService } from '../services/storageLocationService';

const C = {
  bg:          '#13120f',
  surface:     '#1e1c19',
  elevated:    '#2a2724',
  border:      '#2e2c28',
  accent:      '#DE7356',
  accentBg:    'rgba(222,115,86,0.09)',
  accentBdr:   'rgba(222,115,86,0.25)',
  textPrimary: '#e8e4de',
  textSec:     '#b1ada1',
  textMuted:   '#6b6760',
  danger:      '#f87171',
  success:     '#4ade80',
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
  return mb.toFixed(1) + ' MB';
};

export default function StorageSettingsScreen({ navigation }) {
  const [stats,         setStats]         = useState({ savedSize: 0, freeStorage: 0 });
  const [downloadMode,  setDownloadMode]  = useState('internal');
  const [downloadLabel, setDownloadLabel] = useState('Internal Storage');
  const [locationBusy,  setLocationBusy]  = useState(false);
  const pickerSupported = storageLocationService.isExternalPickerSupported();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [s, mode, label] = await Promise.all([
      downloadManager.getStorageStats(),
      storageLocationService.getMode(),
      storageLocationService.getLabel(),
    ]);
    setStats(s);
    setDownloadMode(mode);
    setDownloadLabel(label);
  };

  const handleChooseFolder = async () => {
    setLocationBusy(true);
    try {
      const result = await storageLocationService.chooseExternalFolder();
      if (result.success) {
        setDownloadMode('external');
        setDownloadLabel(result.label);
        Alert.alert('Folder set', `New downloads will also be saved to "${result.label}".`);
      } else if (result.reason === 'not_supported') {
        Alert.alert('Not available', "Choosing a custom folder isn't supported on this device.");
      } else if (result.reason !== 'denied') {
        Alert.alert("Couldn't set folder", result.message || 'Please try again.');
      }
    } finally {
      setLocationBusy(false);
    }
  };

  const handleResetToInternal = () => {
    Alert.alert(
      'Reset to Internal Storage?',
      "New downloads will go back to the app's internal folder only. Files already mirrored to your custom folder stay there.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset', style: 'destructive',
          onPress: async () => {
            setLocationBusy(true);
            try {
              await storageLocationService.resetToInternal();
              setDownloadMode('internal');
              setDownloadLabel('Internal Storage');
            } finally {
              setLocationBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={C.textSec} />
        </TouchableOpacity>
        <View style={s.headerIconBox}>
          <Ionicons name="server-outline" size={16} color={C.accent} />
        </View>
        <View>
          <Text style={s.headerTitle}>Storage Settings</Text>
          <Text style={s.headerSub}>Manage offline storage</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Storage Usage */}
        <Text style={s.sectionTitle}>Storage Usage</Text>
        <View style={s.card}>
          <Row label="Saved for Offline" value={formatBytes(stats.savedSize)}  icon="cloud-done-outline"    color={C.success} />
          <Row label="Free Storage"      value={formatBytes(stats.freeStorage)} icon="phone-portrait-outline" color={C.textSec} last />
        </View>
        <Text style={s.inputHint}>
          This is the total size of every material you've saved for offline use. To free up space, remove a saved material from the Saved screen.
        </Text>
        <TouchableOpacity
          style={s.linkBtn}
          onPress={() => navigation.navigate('SavedMaterials')}
        >
          <Ionicons name="bookmark-outline" size={15} color={C.accent} />
          <Text style={s.linkBtnText}>Manage saved materials</Text>
          <Ionicons name="chevron-forward" size={15} color={C.textMuted} />
        </TouchableOpacity>

        {/* Download Location */}
        <Text style={s.sectionTitle}>Download Location</Text>
        <View style={s.card}>
          <Row label="Current Folder" value={downloadLabel} icon="folder-outline" color={C.accent} last={!pickerSupported} />
          {pickerSupported && (
            <Text style={s.inputHint}>
              Saved materials always stay safely inside the app too — this just also copies them to a folder you pick, so they show up in your device's file manager.
            </Text>
          )}
        </View>

        {pickerSupported ? (
          <View style={s.card}>
            <TouchableOpacity
              style={s.dangerBtn}
              onPress={handleChooseFolder}
              disabled={locationBusy}
            >
              <Ionicons name="folder-open-outline" size={16} color={C.accent} />
              <Text style={[s.dangerBtnText, { color: C.accent }]}>
                {downloadMode === 'external' ? 'Change Folder' : 'Choose a Folder'}
              </Text>
            </TouchableOpacity>
            {downloadMode === 'external' && (
              <TouchableOpacity
                style={[s.dangerBtn, { borderTopWidth: 1, borderTopColor: C.border }]}
                onPress={handleResetToInternal}
                disabled={locationBusy}
              >
                <Ionicons name="refresh-outline" size={16} color={C.danger} />
                <Text style={s.dangerBtnText}>Reset to Internal Storage</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={s.inputHint}>
            On iPhone, apps can't save files outside their own private storage — that's an Apple restriction, not a missing feature. Your saved materials stay safely inside StudyShala and always work offline.
          </Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, icon, color, last }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <View style={s.rowLeft}>
        <Ionicons name={icon} size={15} color={color} />
        <Text style={s.rowLabel}>{label}</Text>
      </View>
      <Text style={[s.rowValue, { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1 },
  content: { padding: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerIconBox: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBdr,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  headerSub:   { fontSize: 11, color: C.textMuted, marginTop: 1 },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 20, marginBottom: 8,
  },
  card: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, marginBottom: 4,
  },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 14, color: C.textSec, fontWeight: '500' },
  rowValue: { fontSize: 14, fontWeight: '700' },

  inputHint: { fontSize: 11, color: C.textMuted, paddingTop: 8, paddingBottom: 4 },

  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 13, marginTop: 8,
  },
  linkBtnText: { flex: 1, fontSize: 14, color: C.accent, fontWeight: '600' },

  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  dangerBtnText: { fontSize: 14, color: C.danger, fontWeight: '600' },
});
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Switch, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { downloadManager } from '../services/downloadManager';
import { cacheManager } from '../services/cacheManager';
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

const CACHE_OPTIONS = [
  { label: '30 Days', value: 30  },
  { label: '60 Days', value: 60  },
  { label: '90 Days', value: 90  },
  { label: 'Never',   value: -1  },
];

export default function StorageSettingsScreen({ navigation }) {
  const [stats,         setStats]         = useState({ offlineSize: 0, cacheSize: 0, freeStorage: 0 });
  const [cacheDays,     setCacheDays]     = useState(90);
  const [maxCacheMB,    setMaxCacheMB]    = useState(1024);
  const [maxCacheInput, setMaxCacheInput] = useState('1024');
  const [downloadMode,  setDownloadMode]  = useState('internal');
  const [downloadLabel, setDownloadLabel] = useState('Internal Storage');
  const [locationBusy,  setLocationBusy]  = useState(false);
  const pickerSupported = storageLocationService.isExternalPickerSupported();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [s, days, maxMB, mode, label] = await Promise.all([
      downloadManager.getStorageStats(),
      cacheManager.getCacheDays(),
      cacheManager.getMaxCacheSize(),
      storageLocationService.getMode(),
      storageLocationService.getLabel(),
    ]);
    setStats(s);
    setCacheDays(days);
    setMaxCacheMB(maxMB);
    setMaxCacheInput(String(maxMB));
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

  const handleCacheDaysChange = async (val) => {
    setCacheDays(val);
    await cacheManager.setCacheDays(val);
  };

  const handleMaxCacheSubmit = async () => {
    const mb = parseInt(maxCacheInput);
    if (isNaN(mb) || mb < 100) {
      Alert.alert('Invalid', 'Minimum cache size is 100 MB.');
      setMaxCacheInput(String(maxCacheMB));
      return;
    }
    setMaxCacheMB(mb);
    await cacheManager.setMaxCacheSize(mb);
    Alert.alert('Saved', `Max cache size set to ${mb} MB.`);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This removes temporarily cached files. Saved offline materials are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive',
          onPress: async () => {
            await cacheManager.clearAllCache();
            await loadAll();
            Alert.alert('Done', 'Cache cleared successfully.');
          },
        },
      ]
    );
  };

  const usedPercent = stats.cacheSize && maxCacheMB
    ? Math.min(100, Math.round((stats.cacheSize / (maxCacheMB * 1024 * 1024)) * 100))
    : 0;

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
          <Text style={s.headerSub}>Manage cache & downloads</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Storage Usage */}
        <Text style={s.sectionTitle}>Storage Usage</Text>
        <View style={s.card}>
          <Row label="Offline Saved"  value={formatBytes(stats.offlineSize)} icon="cloud-done-outline"      color={C.success} />
          <Row label="Cache Used"     value={formatBytes(stats.cacheSize)}   icon="albums-outline"           color={C.accent}  />
          <Row label="Free Storage"   value={formatBytes(stats.freeStorage)} icon="phone-portrait-outline"   color={C.textSec} last />
        </View>

        {/* Cache bar */}
        <View style={s.card}>
          <View style={s.barRow}>
            <Text style={s.barLabel}>
              Cache {formatBytes(stats.cacheSize)} / {maxCacheMB >= 1024 ? (maxCacheMB / 1024).toFixed(1) + ' GB' : maxCacheMB + ' MB'}
            </Text>
            <Text style={s.barPercent}>{usedPercent}%</Text>
          </View>
          <View style={s.barTrack}>
            <View style={[s.barFill, {
              width: `${usedPercent}%`,
              backgroundColor: usedPercent > 80 ? C.danger : C.accent,
            }]} />
          </View>
          <Text style={s.storagePath}>📁 StudyShala/Cache  ·  StudyShala/Downloads</Text>
        </View>

        {/* Download Location */}
        <Text style={s.sectionTitle}>Download Location</Text>
        <View style={s.card}>
          <Row label="Current Folder" value={downloadLabel} icon="folder-outline" color={C.accent} last={!pickerSupported} />
          {pickerSupported && (
            <Text style={s.inputHint}>
              Downloads always stay safely inside the app too — this just also copies them to a folder you pick, so they show up in your device's file manager.
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
            On iPhone, apps can't save files outside their own private storage — that's an Apple restriction, not a missing feature. Your downloads stay safely inside StudyShala and always work offline.
          </Text>
        )}

        {/* Max Cache Size */}
        <Text style={s.sectionTitle}>Max Cache Size</Text>
        <View style={s.card}>
          <Text style={s.inputLabel}>Set limit in MB (default: 1024 MB = 1 GB)</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={maxCacheInput}
              onChangeText={setMaxCacheInput}
              keyboardType="numeric"
              placeholder="e.g. 1024"
              placeholderTextColor={C.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleMaxCacheSubmit}
            />
            <TouchableOpacity style={s.saveBtn} onPress={handleMaxCacheSubmit}>
              <Text style={s.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.inputHint}>Minimum 100 MB · Files exceeding this limit won't be cached</Text>
        </View>

        {/* Auto Delete Cache */}
        <Text style={s.sectionTitle}>Auto Delete Cache</Text>
        <View style={s.card}>
          {CACHE_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.value}
              style={[s.optionRow, i === CACHE_OPTIONS.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => handleCacheDaysChange(opt.value)}
            >
              <Text style={[s.optionLabel, cacheDays === opt.value && { color: C.accent }]}>
                {opt.label}
              </Text>
              <View style={[s.radio, cacheDays === opt.value && s.radioSelected]}>
                {cacheDays === opt.value && <View style={s.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Manage */}
        <Text style={s.sectionTitle}>Manage</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.dangerBtn} onPress={handleClearCache}>
            <Ionicons name="trash-outline" size={16} color={C.danger} />
            <Text style={s.dangerBtnText}>Clear Cache</Text>
          </TouchableOpacity>
        </View>

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

  barRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 8 },
  barLabel:   { fontSize: 12, color: C.textSec, fontWeight: '500' },
  barPercent: { fontSize: 12, color: C.accent, fontWeight: '700' },
  barTrack: {
    height: 6, backgroundColor: C.elevated,
    borderRadius: 3, overflow: 'hidden', marginBottom: 10,
  },
  barFill:     { height: 6, borderRadius: 3 },
  storagePath: { fontSize: 11, color: C.textMuted, paddingBottom: 14, fontWeight: '500' },

  inputLabel: { fontSize: 12, color: C.textMuted, paddingTop: 14, marginBottom: 8 },
  inputRow:   { flexDirection: 'row', gap: 10, marginBottom: 8 },
  input: {
    flex: 1, backgroundColor: C.elevated, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: C.textPrimary, fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: C.accent, borderRadius: 10,
    paddingHorizontal: 18, justifyContent: 'center',
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  inputHint:   { fontSize: 11, color: C.textMuted, paddingBottom: 14 },

  optionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  optionLabel: { fontSize: 14, color: C.textSec, fontWeight: '500' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: C.accent },
  radioDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },

  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  dangerBtnText: { fontSize: 14, color: C.danger, fontWeight: '600' },
});
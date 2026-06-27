import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch
} from 'react-native';
import { downloadManager } from '../services/downloadManager';
import { cacheManager } from '../services/cacheManager';

const formatBytes = (bytes) => {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb > 1024) return (mb / 1024).toFixed(1) + ' GB';
  return mb.toFixed(1) + ' MB';
};

const CACHE_OPTIONS = [
  { label: '30 Days', value: 30 },
  { label: '60 Days', value: 60 },
  { label: '90 Days', value: 90 },
  { label: 'Never', value: -1 },
];

export default function StorageSettingsScreen() {
  const [stats, setStats] = useState({ offlineSize: 0, cacheSize: 0, freeStorage: 0 });
  const [cacheDays, setCacheDays] = useState(60);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    loadStats();
    loadSettings();
  }, []);

  const loadStats = async () => {
    const s = await downloadManager.getStorageStats();
    setStats(s);
  };

  const loadSettings = async () => {
    const days = await cacheManager.getCacheDays();
    setCacheDays(days);
  };

  const handleCacheDaysChange = async (val) => {
    setCacheDays(val);
    await cacheManager.setCacheDays(val);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all temporarily cached files. Saved offline materials will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await cacheManager.clearAllCache();
            await loadStats();
            Alert.alert('Done', 'Cache cleared successfully.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Storage Usage</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Offline Saved</Text>
          <Text style={styles.value}>{formatBytes(stats.offlineSize)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cache</Text>
          <Text style={styles.value}>{formatBytes(stats.cacheSize)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Free Storage</Text>
          <Text style={styles.value}>{formatBytes(stats.freeStorage)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Auto Delete Cache</Text>
      <View style={styles.card}>
        {CACHE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.optionRow}
            onPress={() => handleCacheDaysChange(opt.value)}
          >
            <Text style={styles.label}>{opt.label}</Text>
            <View style={[styles.radio, cacheDays === opt.value && styles.radioSelected]} />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Download Settings</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>WiFi Only Downloads</Text>
          <Switch value={wifiOnly} onValueChange={setWifiOnly} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Auto Sync</Text>
          <Switch value={autoSync} onValueChange={setAutoSync} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Manage</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.button} onPress={handleClearCache}>
          <Text style={styles.buttonText}>Clear Cache</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#888', marginTop: 20, marginBottom: 8, textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  label: { fontSize: 15, color: '#333' },
  value: { fontSize: 15, color: '#666' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ccc' },
  radioSelected: { borderColor: '#4A90E2', backgroundColor: '#4A90E2' },
  button: { paddingVertical: 12, alignItems: 'center' },
  buttonText: { fontSize: 15, color: '#e74c3c', fontWeight: '600' },
});

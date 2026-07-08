/**
 * screens/SavedMaterialsScreen.jsx
 * ===================================
 * Materials the student tapped "Save for Later" on (EnterCodeScreen).
 * Cache-first (works offline), then refreshes from the server — same
 * pattern already used by DashboardScreen's recent-files list and
 * HistoryScreen, via the `storage` local cache under the `saved:` prefix.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from '../components/theme';
import MaterialCard from '../components/MaterialCard';
import { getSavedMaterials, removeSavedMaterial } from '../api/studentApi';
import { storage } from '../database/db';
import { syncMaterialOffline, isMaterialFullyOffline } from '../utils/materialSync';

const describeError = (e) => {
  // Axios: a genuine "device has no route to the server" failure has no
  // e.response at all and the message is exactly "Network Error".
  if (!e?.response && e?.message === 'Network Error') {
    return 'No internet connection';
  }
  if (e?.code === 'ECONNABORTED') {
    return "Server is taking too long to respond (it may be waking up — try again in a moment)";
  }
  if (e?.response?.status === 401) {
    return 'Your session may have expired — please log out and log back in';
  }
  if (e?.response?.status === 403) {
    return "This account isn't recognized as a student account — please log out and log back in";
  }
  if (e?.response?.status >= 500) {
    return 'Server error — try again shortly';
  }
  if (e?.response) {
    return `Request failed (${e.response.status})`;
  }
  return 'Could not reach the server';
};

// Only genuine connectivity/server-availability problems are worth
// silently retrying in the background. A 401/403 means the request
// reached the server fine and was deliberately rejected — retrying with
// the same token will just get rejected again, forever. Those need the
// user to actually re-authenticate, not a background retry loop.
const isRetryable = (e) => {
  if (!e?.response && e?.message === 'Network Error') return true;
  if (e?.code === 'ECONNABORTED') return true;
  if (e?.response?.status >= 500) return true;
  return false;
};

export default function SavedMaterialsScreen({ navigation }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [offlineReason, setOfflineReason] = useState('');
  const [canAutoRetry, setCanAutoRetry] = useState(false);
  const retryTimerRef = useRef(null);
  const [syncStatus, setSyncStatus] = useState({}); // materialId -> 'syncing' | 'complete'

  // Auto-download every file for every saved material, in the background.
  // Already-saved files are skipped inside syncMaterialOffline, so this is
  // cheap to re-run every time this screen opens — it just picks up
  // anything new or previously interrupted.
  const autoSyncAll = useCallback(async (list) => {
    for (const m of list) {
      const already = await isMaterialFullyOffline(m._id);
      if (already) {
        setSyncStatus((prev) => ({ ...prev, [m._id]: 'complete' }));
        continue;
      }
      setSyncStatus((prev) => ({ ...prev, [m._id]: 'syncing' }));
      syncMaterialOffline(m).then((res) => {
        setSyncStatus((prev) => ({ ...prev, [m._id]: res.success ? 'complete' : 'idle' }));
      });
    }
  }, []);

  const load = useCallback(async () => {
    // Step 1 — instant local cache (works with zero internet)
    try {
      const cached = await storage.getAllByPrefix('saved:');
      if (cached?.length) {
        setMaterials(cached);
        autoSyncAll(cached);
      }
    } catch {}

    // Step 2 — fresh data from server
    try {
      const { data } = await getSavedMaterials();
      const list = data.materials || [];
      setMaterials(list);
      setOfflineOnly(false);
      setCanAutoRetry(false);
      autoSyncAll(list);

      // Step 3 — resync local cache
      try { await storage.deleteAllByPrefix('saved:'); } catch {}
      for (const m of list) {
        try { await storage.set(`saved:${m._id}`, m); } catch {}
      }
    } catch (e) {
      console.log('[SavedMaterials] getSavedMaterials failed:', {
        message: e?.message,
        code: e?.code,
        status: e?.response?.status,
        responseData: e?.response?.data,
        url: e?.config?.url,
        baseURL: e?.config?.baseURL,
      });
      setOfflineOnly(true);
      setOfflineReason(describeError(e));
      setCanAutoRetry(isRetryable(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [autoSyncAll]);

  // Reload every time this screen comes into focus, not just on first
  // mount — e.g. coming back from EnterCodeScreen after saving something
  // new, or simply returning to the tab after connectivity changed.
  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      };
    }, [load])
  );

  // Background auto-retry: only for genuine connectivity/server-availability
  // failures (see isRetryable above) — never for a 401/403, since retrying
  // with the same rejected token would just fail identically forever and
  // silently spam the server. Stops as soon as a load() succeeds.
  useEffect(() => {
    if (offlineOnly && canAutoRetry) {
      retryTimerRef.current = setTimeout(() => {
        load();
      }, 15000);
    }
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [offlineOnly, canAutoRetry, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleRemove = async (material) => {
    // Optimistic local removal so it works even if offline; server call
    // is best-effort and will simply fail silently without connectivity.
    setMaterials((prev) => prev.filter((m) => m._id !== material._id));
    storage.delete(`saved:${material._id}`).catch(() => {});
    removeSavedMaterial(material._id).catch(() => {});
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={s.title}>Saved Materials</Text>
      </View>

      {offlineOnly && (
        <View style={s.offlineBanner}>
          <Ionicons
            name={canAutoRetry ? 'cloud-offline-outline' : 'alert-circle-outline'}
            size={14}
            color={C.warning}
          />
          <Text style={s.offlineText}>
            {offlineReason || 'Offline'} — showing your last saved list.
            {canAutoRetry ? ' Retrying automatically…' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={materials}
        keyExtractor={(m) => m._id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        renderItem={({ item }) => (
          <View>
            <MaterialCard
              material={item}
              role="student"
              onPress={(m) => navigation.navigate('MaterialAccess', { material: m })}
              onRemove={handleRemove}
              offlineStatus={syncStatus[item._id] === 'complete' ? 'saved' : null}
            />
            {syncStatus[item._id] === 'syncing' && (
              <View style={s.syncingRow}>
                <ActivityIndicator size="small" color={C.accent} />
                <Text style={s.syncingText}>Saving files for offline access…</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="bookmark-outline" size={40} color={C.textMuted} />
            <Text style={s.emptyText}>No saved materials yet.</Text>
            <Text style={s.emptySub}>Materials you save for later will show up here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: T.md, fontWeight: '700', color: C.textPrimary },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(251,191,36,0.1)', marginHorizontal: 14, marginTop: 12,
    padding: 10, borderRadius: R.sm, borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)',
  },
  offlineText: { color: C.warning, fontSize: T.xs, fontWeight: '600' },

  list: { padding: 14 },
  syncingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: -6, marginBottom: 12, paddingHorizontal: 4,
  },
  syncingText: { color: C.textSecondary, fontSize: T.xs },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 90, gap: 8 },
  emptyText: { color: C.textSecondary, fontSize: T.md, fontWeight: '600' },
  emptySub: { color: C.textMuted, fontSize: T.sm, textAlign: 'center' },
});
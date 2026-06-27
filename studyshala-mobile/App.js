import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { runMigrations } from './src/database/migrations';
import { cacheManager } from './src/services/cacheManager';

export default function App() {
  useEffect(() => {
    // Initialize SQLite database and run cache cleanup on startup
    const init = async () => {
      try {
        await runMigrations();
        await cacheManager.runCleanup();
      } catch (e) {
        console.warn('App init error:', e);
      }
    };
    init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

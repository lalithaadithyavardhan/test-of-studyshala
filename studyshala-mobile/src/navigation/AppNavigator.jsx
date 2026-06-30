/**
 * navigation/AppNavigator.jsx
 * =============================
 * Root navigator using Stack navigation.
 * SidebarDrawer handles navigation inside screens.
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { cacheManager } from '../services/cacheManager';
import { offlineSyncService } from '../services/offlineSyncService';
import { materialRepository } from '../database/materialRepository';
import { getMaterialFiles } from '../api/studentApi';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';

// Student screens
import DashboardScreen from '../screens/DashboardScreen';
import EnterCodeScreen from '../screens/EnterCodeScreen';
import SavedMaterialsScreen from '../screens/SavedMaterialsScreen';
import StarredScreen from '../screens/StarredScreen';
import HistoryScreen from '../screens/HistoryScreen';
import MaterialAccessScreen from '../screens/MaterialAccessScreen';
import FileViewerScreen from '../screens/FileViewerScreen';

import StorageSettingsScreen from '../screens/StorageSettingsScreen';

import DownloadsScreen from '../screens/DownloadsScreen';

// Faculty screens
import FacultyDashboardScreen from '../screens/FacultyDashboardScreen';
import FacultyMaterialsScreen from '../screens/FacultyMaterialsScreen';
import CreateMaterialScreen from '../screens/CreateMaterialScreen';
import FacultyMaterialDetailScreen from '../screens/FacultyMaterialDetailScreen';
import UploadFilesScreen from '../screens/UploadFilesScreen';

const RootStack = createNativeStackNavigator();
const StudentStack = createNativeStackNavigator();
const FacultyStack = createNativeStackNavigator();

function StudentRoot() {
  return (
    <StudentStack.Navigator screenOptions={{ headerShown: false }}>
      <StudentStack.Screen
        name="Dashboard"
        component={DashboardScreen}
      />

      <StudentStack.Screen
        name="EnterCode"
        component={EnterCodeScreen}
      />

      <StudentStack.Screen
        name="SavedMaterials"
        component={SavedMaterialsScreen}
      />

      <StudentStack.Screen
        name="Starred"
        component={StarredScreen}
      />

      <StudentStack.Screen
        name="History"
        component={HistoryScreen}
      />

      <StudentStack.Screen
        name="MaterialAccess"
        component={MaterialAccessScreen}
      />

      <StudentStack.Screen
        name="FileViewer"
        component={FileViewerScreen}
      />

      <StudentStack.Screen
        name="StorageSettings"
        component={StorageSettingsScreen}
      />

      <StudentStack.Screen name="Downloads" component={DownloadsScreen} />

    </StudentStack.Navigator>
  );
}

function FacultyRoot() {
  return (
    <FacultyStack.Navigator screenOptions={{ headerShown: false }}>
      <FacultyStack.Screen
        name="FacultyDashboard"
        component={FacultyDashboardScreen}
      />

      <FacultyStack.Screen
        name="FacultyMaterials"
        component={FacultyMaterialsScreen}
      />

      <FacultyStack.Screen
        name="CreateMaterial"
        component={CreateMaterialScreen}
      />

      <FacultyStack.Screen
        name="FacultyMaterialDetail"
        component={FacultyMaterialDetailScreen}
      />

      <FacultyStack.Screen
        name="UploadFiles"
        component={UploadFilesScreen}
      />

      <FacultyStack.Screen
        name="FileViewer"
        component={FileViewerScreen}
      />
    </FacultyStack.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading, user } = useAuth();

  // ── Startup tasks (fire-and-forget, never block the UI) ──────────────────
  useEffect(() => {
    // 1. Evict expired cache files from disk + materialRepository
    cacheManager.runCleanup().catch(() => {});

    // 2. Evict individually-starred expired files (not covered by materialRepository)
    offlineSyncService.evictExpiredCache().catch(() => {});

    // 3. Background sync: re-download changed files for all saved materials
    (async () => {
      try {
        const savedMaterials = await materialRepository.getAllSaved();
        if (savedMaterials.length) {
          offlineSyncService.backgroundSync(
            savedMaterials,
            (materialId) => getMaterialFiles(materialId),
          ).catch(() => {});
        }
      } catch {}
    })();
  }, []); // Run once on mount

  if (loading) {
    return (
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen
            name="Splash"
            component={SplashScreen}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen
            name="Login"
            component={LoginScreen}
          />
        ) : user?.role === 'faculty' || user?.role === 'admin' ? (
          <RootStack.Screen
            name="FacultyRoot"
            component={FacultyRoot}
          />
        ) : (
          <RootStack.Screen
            name="StudentRoot"
            component={StudentRoot}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
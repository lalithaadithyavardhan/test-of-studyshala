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
import { downloadManager } from '../services/downloadManager';
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
  // Single-tier offline model: there's no cache to clean up or expire
  // anymore. downloadManager owns the entire auto-sync lifecycle — an
  // immediate pass on mount, plus another pass every time connectivity is
  // regained (see downloadManager.initAutoSync). This component doesn't
  // need to know anything about connectivity APIs; it just wires the
  // lifecycle up and tears it down on unmount.
  useEffect(() => {
    // Self-heal any 0-byte files left behind by older download logic before
    // auto-sync starts, so a corrupt record can't be "verified" as fine by
    // sync just because a re-check happens to skip it.
    downloadManager.cleanupCorruptFiles();
    const unsubscribe = downloadManager.initAutoSync(getMaterialFiles);
    return unsubscribe;
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
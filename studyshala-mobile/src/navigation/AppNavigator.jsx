/**
 * navigation/AppNavigator.jsx
 * =============================
 * Root navigator using Stack navigation.
 * SidebarDrawer handles navigation inside screens.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { ServerStatusProvider } from '../context/ServerStatusContext';
import ServerStatusBanner from '../components/ServerStatusBanner';

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

  const linking = {
    prefixes: ['studyshala://'],
    config: {
      screens: {
        // Deep link lands here; AuthContext's Linking listener
        // handles the token extraction and login independently,
        // so no screen mapping is needed — this just prevents
        // React Navigation from throwing on an unrecognised URL.
      },
    },
  };

  return (
    <ServerStatusProvider>
      <NavigationContainer linking={linking}>
        <ServerStatusBanner />
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {loading ? (
            <RootStack.Screen
              name="Splash"
              component={SplashScreen}
            />
          ) : !isAuthenticated ? (
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
    </ServerStatusProvider>
  );
}
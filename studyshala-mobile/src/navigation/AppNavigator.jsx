/**
 * navigation/AppNavigator.jsx
 * =============================
 * Root navigator. Three layers:
 *   1. Auth gate — Splash while restoring session, LoginScreen if logged out.
 *   2. Role gate — once logged in, render StudentTabs or FacultyTabs based
 *      on user.role (set by mobileAuthController.js on the backend).
 *   3. Each role's tab navigator is wrapped in its own stack so screens
 *      like MaterialAccess / CreateMaterial can push full-screen over tabs.
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';

// Student screens
import DashboardScreen from '../screens/DashboardScreen';
import EnterCodeScreen from '../screens/EnterCodeScreen';
import SavedMaterialsScreen from '../screens/SavedMaterialsScreen';
import StarredScreen from '../screens/StarredScreen';
import HistoryScreen from '../screens/HistoryScreen';
import MaterialAccessScreen from '../screens/MaterialAccessScreen';

// Faculty screens
import FacultyDashboardScreen from '../screens/FacultyDashboardScreen';
import FacultyMaterialsScreen from '../screens/FacultyMaterialsScreen';
import CreateMaterialScreen from '../screens/CreateMaterialScreen';
import FacultyMaterialDetailScreen from '../screens/FacultyMaterialDetailScreen';
import UploadFilesScreen from '../screens/UploadFilesScreen';

const RootStack = createNativeStackNavigator();
const StudentTab = createBottomTabNavigator();
const StudentStack = createNativeStackNavigator();
const FacultyTab = createBottomTabNavigator();
const FacultyStack = createNativeStackNavigator();

// ── Student tab bar ──────────────────────────────────────────────────────
function StudentTabs() {
  return (
    <StudentTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard: 'home',
            EnterCode: 'key',
            SavedMaterials: 'bookmark',
            Starred: 'star',
            History: 'time',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <StudentTab.Screen name="Dashboard" component={DashboardScreen} />
      <StudentTab.Screen name="EnterCode" component={EnterCodeScreen} options={{ title: 'Enter Code' }} />
      <StudentTab.Screen name="SavedMaterials" component={SavedMaterialsScreen} options={{ title: 'Saved' }} />
      <StudentTab.Screen name="Starred" component={StarredScreen} />
      <StudentTab.Screen name="History" component={HistoryScreen} />
    </StudentTab.Navigator>
  );
}

function StudentRoot() {
  return (
    <StudentStack.Navigator screenOptions={{ headerShown: false }}>
      <StudentStack.Screen name="StudentTabs" component={StudentTabs} />
      <StudentStack.Screen
        name="MaterialAccess"
        component={MaterialAccessScreen}
        options={{ presentation: 'card' }}
      />
    </StudentStack.Navigator>
  );
}

// ── Faculty tab bar ──────────────────────────────────────────────────────
function FacultyTabs() {
  return (
    <FacultyTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#0891B2',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarIcon: ({ color, size }) => {
          const icons = {
            FacultyDashboard: 'home',
            FacultyMaterials: 'folder-open',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <FacultyTab.Screen name="FacultyDashboard" component={FacultyDashboardScreen} options={{ title: 'Dashboard' }} />
      <FacultyTab.Screen name="FacultyMaterials" component={FacultyMaterialsScreen} options={{ title: 'My Materials' }} />
    </FacultyTab.Navigator>
  );
}

function FacultyRoot() {
  return (
    <FacultyStack.Navigator screenOptions={{ headerShown: false }}>
      <FacultyStack.Screen name="FacultyTabs" component={FacultyTabs} />
      <FacultyStack.Screen name="CreateMaterial" component={CreateMaterialScreen} options={{ presentation: 'modal' }} />
      <FacultyStack.Screen name="FacultyMaterialDetail" component={FacultyMaterialDetailScreen} />
      <FacultyStack.Screen name="UploadFiles" component={UploadFilesScreen} options={{ presentation: 'modal' }} />
    </FacultyStack.Navigator>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Splash" component={SplashScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
        ) : user?.role === 'faculty' || user?.role === 'admin' ? (
          <RootStack.Screen name="FacultyRoot" component={FacultyRoot} />
        ) : (
          <RootStack.Screen name="StudentRoot" component={StudentRoot} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

/**
 * navigation/AppNavigator.jsx
 * =============================
 * Top-level navigation:
 *  - Not authenticated -> LoginScreen
 *  - Authenticated     -> Bottom tabs (Dashboard, Enter Code, Saved,
 *                          Starred, History), with MaterialAccess pushed
 *                          as a stack screen on top of the tabs.
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import EnterCodeScreen from '../screens/EnterCodeScreen';
import SavedMaterialsScreen from '../screens/SavedMaterialsScreen';
import StarredScreen from '../screens/StarredScreen';
import HistoryScreen from '../screens/HistoryScreen';
import MaterialAccessScreen from '../screens/MaterialAccessScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: 'home',
  EnterCode: 'key',
  SavedMaterials: 'bookmark',
  Starred: 'star',
  History: 'time',
};

function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? TAB_ICONS[route.name] : `${TAB_ICONS[route.name]}-outline`}
            size={size - 2}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="EnterCode" component={EnterCodeScreen} options={{ title: 'Enter Code' }} />
      <Tab.Screen
        name="SavedMaterials"
        component={SavedMaterialsScreen}
        options={{ title: 'Saved' }}
      />
      <Tab.Screen name="Starred" component={StarredScreen} options={{ title: 'Starred' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="StudentTabs" component={StudentTabs} />
            <Stack.Screen
              name="MaterialAccess"
              component={MaterialAccessScreen}
              options={{ presentation: 'card' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

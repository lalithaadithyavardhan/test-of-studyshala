import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/config';

import LoginScreen from '../screens/LoginScreen';

// Student
import StudentEnterCodeScreen from '../screens/student/StudentEnterCodeScreen';
import StudentMaterialAccessScreen from '../screens/student/StudentMaterialAccessScreen';
import StudentSavedMaterialsScreen from '../screens/student/StudentSavedMaterialsScreen';
import StudentHistoryScreen from '../screens/student/StudentHistoryScreen';
import StudentStarredScreen from '../screens/student/StudentStarredScreen';

// Faculty
import FacultyDashboardScreen from '../screens/faculty/FacultyDashboardScreen';
import FacultyMaterialsScreen from '../screens/faculty/FacultyMaterialsScreen';

// Admin
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

// Shared
import BrowseMaterialsScreen from '../screens/shared/BrowseMaterialsScreen';

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

function StudentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="StudentEnterCode" component={StudentEnterCodeScreen} options={{ title: 'Enter Access Code' }} />
      <Stack.Screen name="StudentMaterialAccess" component={StudentMaterialAccessScreen} options={{ title: 'Materials' }} />
      <Stack.Screen name="StudentSavedMaterials" component={StudentSavedMaterialsScreen} options={{ title: 'Saved' }} />
      <Stack.Screen name="StudentHistory" component={StudentHistoryScreen} options={{ title: 'History' }} />
      <Stack.Screen name="StudentStarred" component={StudentStarredScreen} options={{ title: 'Starred' }} />
      <Stack.Screen name="BrowseMaterials" component={BrowseMaterialsScreen} options={{ title: 'Browse' }} />
    </Stack.Navigator>
  );
}

function FacultyStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="FacultyDashboard" component={FacultyDashboardScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="FacultyMaterials" component={FacultyMaterialsScreen} options={{ title: 'My Materials' }} />
      <Stack.Screen name="BrowseMaterials" component={BrowseMaterialsScreen} options={{ title: 'Browse' }} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin' }} />
      <Stack.Screen name="BrowseMaterials" component={BrowseMaterialsScreen} options={{ title: 'Browse' }} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : user.role === 'faculty' ? (
        <FacultyStack />
      ) : user.role === 'admin' ? (
        <AdminStack />
      ) : (
        <StudentStack />
      )}
    </NavigationContainer>
  );
}

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/config';

// Generic scaffold so every screen has consistent spacing + a working logout
// button while you build out real UI for each one. Swap this out per-screen
// as you port over the logic from studyshalaFrontend/src/pages/*.
export default function ScreenScaffold({ title, subtitle, children }) {
  const { logout, user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.userTag}>{user?.name} · {user?.role}</Text>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  logout: { color: COLORS.danger, fontWeight: '600' },
  userTag: { fontSize: 12, color: COLORS.textMuted, marginTop: 12, marginBottom: 16 },
  body: { flex: 1 },
});

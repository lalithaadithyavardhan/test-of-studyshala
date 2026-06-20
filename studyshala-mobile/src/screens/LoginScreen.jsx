import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/config';

const ROLES = [
  { key: 'student', label: 'Student', color: COLORS.student },
  { key: 'faculty', label: 'Faculty', color: COLORS.faculty },
];

export default function LoginScreen() {
  const { login } = useAuth();
  const [role, setRole] = useState('student');
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      await login(role);
      // Navigation updates automatically — RootNavigator watches `user` from context
    } catch (err) {
      const message =
        err?.response?.data?.message === 'not_admin'
          ? 'This account is not authorized for admin access.'
          : err?.message || 'Sign-in failed. Please try again.';
      Alert.alert('Sign-in failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>StudyShala</Text>
        <Text style={styles.subtitle}>Empowering education through seamless material sharing</Text>

        <View style={styles.roleRow}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[
                styles.roleButton,
                { borderColor: r.color },
                role === r.key && { backgroundColor: r.color },
              ]}
              onPress={() => setRole(r.key)}
            >
              <Text style={[styles.roleText, role === r.key && { color: '#fff' }]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Sign in once — you'll stay signed in on this device.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  title: { fontSize: 32, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 36 },
  roleRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 28 },
  roleButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  roleText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  googleButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  note: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 20 },
});

/**
 * screens/LoginScreen.jsx
 * ========================
 * Mirrors studyshalaFrontend's Login.jsx role-selection UX, adapted to
 * native Google Sign-In (no browser redirect needed on mobile — see
 * README for why). Calls POST /api/auth/google/mobile, which IS wired
 * into the real backend (mobileAuthController.js / authRoutes.js).
 *
 * Role is picked once, then remembered (SecureStore 'lastRole') so it's
 * pre-selected — never forced — on every later visit, same as the
 * website's localStorage 'lastRole' behavior.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, GOOGLE_WEB_CLIENT_ID } from '../config/config';

const ROLES = [
  {
    key: 'student',
    label: 'Student',
    desc: 'Access materials with a code',
    icon: 'school-outline',
  },
  {
    key: 'faculty',
    label: 'Faculty',
    desc: 'Upload & manage materials',
    icon: 'easel-outline',
  },
];

export default function LoginScreen() {
  const { login, lastRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState(lastRole || null);
  const [loading, setLoading] = useState(false);

  const isPlaceholderUrl = API_BASE_URL.includes('YOUR_BACKEND');

  useEffect(() => {
    GoogleSignin.configure({
      // ⚠️ Replace with your real Web Client ID from Google Cloud Console
      // (same one used as GOOGLE_CLIENT_ID on the backend).
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  useEffect(() => {
    if (lastRole) setSelectedRole(lastRole);
  }, [lastRole]);

  const handleGoogleLogin = async () => {
    if (isPlaceholderUrl) {
      Alert.alert(
        'Backend URL not set',
        'Open src/config/config.js and set API_BASE_URL to your real Render backend URL.'
      );
      return;
    }
    if (!selectedRole) {
      Alert.alert('Pick a role', 'Please select Student or Faculty first.');
      return;
    }

    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo?.data?.idToken ?? userInfo?.idToken;

      if (!idToken) {
        Alert.alert('Sign-in failed', 'No ID token received from Google. Please try again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/google/mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, role: selectedRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Sign-in failed',
          data.message || `Server error (${response.status}). Please try again.`
        );
        return;
      }

      await login(data.user, data.token);
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User pressed back — no alert needed
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Please wait', 'Sign-in is already in progress.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          'Google Play Services required',
          'Please update Google Play Services and try again.'
        );
      } else {
        Alert.alert('Sign-in error', error.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>📚</Text>
        </View>
        <Text style={styles.title}>StudyShala</Text>
        <Text style={styles.subtitle}>
          Empowering education through seamless material sharing
        </Text>

        {isPlaceholderUrl && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Backend URL not configured. Edit{' '}
              <Text style={styles.warningCode}>src/config/config.js</Text>
            </Text>
          </View>
        )}

        {/* ── Role selection ── */}
        <View style={styles.roleRow}>
          {ROLES.map((r) => {
            const active = selectedRole === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.roleCard, active && styles.roleCardActive]}
                onPress={() => setSelectedRole(r.key)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={r.icon}
                  size={26}
                  color={active ? '#4F46E5' : '#9CA3AF'}
                  style={{ marginBottom: 6 }}
                />
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>
                  {r.label}
                </Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
                {active && (
                  <View style={styles.roleTick}>
                    <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.googleButton,
            (loading || !selectedRole) && styles.googleButtonDisabled,
          ]}
          onPress={handleGoogleLogin}
          disabled={loading || !selectedRole}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#374151" />
          ) : (
            <>
              <View style={styles.googleIconBox}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>
                {selectedRole
                  ? `Continue as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`
                  : 'Select a role to continue'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footnote}>
          {selectedRole === 'faculty'
            ? '🔒 Verified by your institution'
            : 'Sign in with your college Google account to access your study materials.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  logoCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  logoEmoji: { fontSize: 40 },
  title: { fontSize: 30, fontWeight: '800', color: '#1F2937', marginBottom: 6 },
  subtitle: {
    fontSize: 15, color: '#6B7280', textAlign: 'center',
    marginBottom: 28, lineHeight: 21,
  },
  warningBox: {
    backgroundColor: '#FEF3C7', borderRadius: 10,
    padding: 12, marginBottom: 20, width: '100%',
  },
  warningText: { color: '#92400E', fontSize: 13, lineHeight: 18 },
  warningCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 22,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    position: 'relative',
  },
  roleCardActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  roleLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  roleLabelActive: { color: '#4F46E5' },
  roleDesc: {
    fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 3, lineHeight: 14,
  },
  roleTick: { position: 'absolute', top: 8, right: 8 },
  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 24, width: '100%',
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  googleButtonDisabled: { opacity: 0.6 },
  googleIconBox: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  googleG: { color: '#fff', fontWeight: '800', fontSize: 13 },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  footnote: {
    marginTop: 22, fontSize: 12, color: '#9CA3AF',
    textAlign: 'center', paddingHorizontal: 12,
  },
});

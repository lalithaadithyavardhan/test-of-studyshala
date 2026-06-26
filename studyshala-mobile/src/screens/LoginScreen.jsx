/**
 * screens/LoginScreen.jsx — StudyShala Dark Theme
 * Dark base #0f0f0f · Accent #e87c3a · Matches HTML reference.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  GoogleSignin, statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, GOOGLE_WEB_CLIENT_ID } from '../config/config';
import { C, R, T } from '../components/theme';

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

export default function LoginScreen({ navigation }) {
  const { login, lastRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState(lastRole || null);
  const [loading, setLoading] = useState(false);

  const isPlaceholderUrl = API_BASE_URL.includes('YOUR_BACKEND');

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  useEffect(() => {
    if (lastRole) setSelectedRole(lastRole);
  }, [lastRole]);

  const handleGoogleLogin = async () => {
    if (isPlaceholderUrl) {
      Alert.alert('Backend URL not set', 'Open src/config/config.js and set API_BASE_URL.');
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
      if (!idToken) { Alert.alert('Sign-in failed', 'No ID token from Google.'); return; }
      const response = await fetch(`${API_BASE_URL}/api/auth/google/mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, role: selectedRole }),
      });
      const data = await response.json();
      if (!response.ok) { Alert.alert('Sign-in failed', data.message || `Error ${response.status}`); return; }

      // ── Save auth state ──
      await login(data.user, data.token);

      // ── Navigate based on role + profile status ──
      const role = data.user?.role;
      const profileCompleted = data.user?.profileCompleted;

      if (role === 'faculty') {
        navigation.replace('Dashboard');
      } else if (role === 'student' && profileCompleted) {
        navigation.replace('Dashboard');
      } else if (role === 'student' && !profileCompleted) {
        navigation.replace('CompleteProfile');
      }

    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) { /* silent */ }
      else if (error.code === statusCodes.IN_PROGRESS) Alert.alert('Please wait', 'Sign-in already in progress.');
      else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) Alert.alert('Update required', 'Please update Google Play Services.');
      else Alert.alert('Sign-in error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Brand ── */}
        <View style={s.brand}>
          <View style={s.logoWrap}>
            <View style={s.logoBg}>
              <Text style={s.logoText}>S</Text>
            </View>
            {/* accent dot */}
            <View style={s.logoDot} />
          </View>
          <Text style={s.appName}>StudyShala</Text>
          <Text style={s.appTagline}>Your college study companion</Text>
        </View>

        {/* ── Warning ── */}
        {isPlaceholderUrl && (
          <View style={s.warning}>
            <Ionicons name="warning-outline" size={16} color={C.warning} />
            <Text style={s.warningText}>
              Backend URL not set.{' '}
              <Text style={s.warningCode}>Edit config/config.js</Text>
            </Text>
          </View>
        )}

        {/* ── Role label ── */}
        <Text style={s.sectionLabel}>I am a…</Text>

        {/* ── Role cards ── */}
        <View style={s.roleRow}>
          {ROLES.map((r) => {
            const active = selectedRole === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[s.roleCard, active && s.roleCardActive]}
                onPress={() => setSelectedRole(r.key)}
                activeOpacity={0.8}
              >
                {/* tick */}
                {active && (
                  <View style={s.tick}>
                    <Ionicons name="checkmark" size={11} color={C.bg} />
                  </View>
                )}
                <View style={[s.roleIconBox, active && s.roleIconBoxActive]}>
                  <Ionicons
                    name={r.icon}
                    size={28}
                    color={active ? C.accent : C.textSecondary}
                  />
                </View>
                <Text style={[s.roleLabel, active && s.roleLabelActive]}>{r.label}</Text>
                <Text style={s.roleDesc}>{r.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Google button ── */}
        <TouchableOpacity
          style={[s.googleBtn, (!selectedRole || loading) && s.googleBtnDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading || !selectedRole}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={C.accent} />
          ) : (
            <>
              <View style={s.googleIconBox}>
                <Text style={s.googleG}>G</Text>
              </View>
              <Text style={s.googleBtnText}>
                {selectedRole
                  ? `Continue as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`
                  : 'Select a role to continue'}
              </Text>
              {!!selectedRole && (
                <Ionicons name="arrow-forward" size={17} color={C.textSecondary} />
              )}
            </>
          )}
        </TouchableOpacity>

        <Text style={s.footnote}>
          {selectedRole === 'faculty'
            ? '🔒 Verified by your institution\'s Google account'
            : '✨ Sign in with your college Google account'}
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },

  // Brand
  brand: { alignItems: 'center', marginBottom: 40 },
  logoWrap: { position: 'relative', marginBottom: 18 },
  logoBg: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 36, fontWeight: '800', color: C.accent },
  logoDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.accent,
    borderWidth: 2,
    borderColor: C.bg,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  appTagline: { fontSize: T.base, color: C.textSecondary },

  // Warning
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.warning + '60',
  },
  warningText: { flex: 1, color: C.warning, fontSize: T.sm, lineHeight: 18 },
  warningCode: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700' },

  // Section label
  sectionLabel: {
    fontSize: T.xs,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Role cards
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  roleCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: 'center',
    position: 'relative',
  },
  roleCardActive: {
    borderColor: C.accent,
    backgroundColor: C.accentBg,
  },
  tick: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconBox: {
    width: 52,
    height: 52,
    borderRadius: R.md,
    backgroundColor: C.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  roleIconBoxActive: { backgroundColor: C.surface },
  roleLabel: { fontSize: T.md, fontWeight: '700', color: C.textSecondary, marginBottom: 4 },
  roleLabelActive: { color: C.accent },
  roleDesc: { fontSize: T.xs, color: C.textMuted, textAlign: 'center', lineHeight: 16 },

  // Google button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 10,
    marginBottom: 16,
  },
  googleBtnDisabled: { opacity: 0.45 },
  googleIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: { color: C.white, fontWeight: '800', fontSize: T.sm },
  googleBtnText: { flex: 1, fontSize: T.base, fontWeight: '600', color: C.textPrimary },

  footnote: { textAlign: 'center', fontSize: T.sm, color: C.textMuted, lineHeight: 18 },
});
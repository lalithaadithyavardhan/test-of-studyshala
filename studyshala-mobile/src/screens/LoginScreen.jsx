/**
 * screens/LoginScreen.jsx — StudyShala Dark Theme
 *
 *   Background  #13120f  warm dark (not cold black)
 *   Surface     #1e1c19  warm card surface
 *   Border      #2e2c28  normal border
 *   Accent      #DE7356  Claude Peach / terra-cotta — the ONE brand color
 *   TextPrimary #e8e4de  warm white
 *   TextSec     #b1ada1  warm gray
 *   TextMuted   #6b6760  readable dim
 *
 * Student and Faculty now share the SAME accent color (peach). There is no
 * separate "faculty gray" anymore — role differentiation comes from the
 * icon + copy, not a second color. The selection state itself is animated
 * (border, fill, icon tint, label tint, tick-mark, scale) instead of an
 * instant style swap, and the screen has a soft one-time entrance animation
 * on the logo + a gentle breathing glow — this is the very first thing a
 * user sees, so it's worth the extra polish even though it only plays once.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform, ScrollView, Image, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  GoogleSignin, statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, GOOGLE_WEB_CLIENT_ID } from '../config/config';
import { C, R, T } from '../components/theme';

// ── Single brand accent, used for BOTH roles ──
const ACCENT = '#DE7356';
const ACCENT_SOFT = 'rgba(222,115,86,0.14)';
const ACCENT_TRANSPARENT = 'rgba(222,115,86,0)';

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

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
// NOTE: Ionicons doesn't forward a ref that supports setNativeProps, so
// Animated.createAnimatedComponent(Ionicons) can't animate `color` directly
// (throws "setNativeProps is not a function"). Instead we crossfade two
// plain icons on top of each other and animate opacity, which IS safe since
// opacity is a normal Animated.View style prop, not a component prop.

function RoleCard({ role, active, onPress }) {
  // selectAnim: JS-driven — drives colors (border/background/icon-box/label),
  // which can't run on the native driver.
  const selectAnim = useRef(new Animated.Value(active ? 1 : 0)).current;
  // selectScale: native-driven — drives ONLY the card's scale-on-select.
  // Kept as a SEPARATE value from selectAnim on purpose: composing a
  // JS-driven node with a native-driven one (e.g. via Animated.multiply)
  // throws "Attempting to run JS driven animation on animated node that
  // has been moved to native". This value only ever runs with
  // useNativeDriver: true, so it can safely combine with pressAnim below.
  const selectScale = useRef(new Animated.Value(active ? 1 : 0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(selectAnim, {
      toValue: active ? 1 : 0,
      useNativeDriver: false, // driving color props, can't use native driver
      friction: 7,
      tension: 90,
    }).start();
    Animated.spring(selectScale, {
      toValue: active ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 90,
    }).start();
  }, [active]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.96, useNativeDriver: true, friction: 6, tension: 220,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1, useNativeDriver: true, friction: 5, tension: 140,
    }).start();
  };

  const borderColor = selectAnim.interpolate({ inputRange: [0, 1], outputRange: [C.border, ACCENT] });
  const backgroundColor = selectAnim.interpolate({ inputRange: [0, 1], outputRange: [C.surface, ACCENT_SOFT] });
  const iconBoxBg = selectAnim.interpolate({ inputRange: [0, 1], outputRange: [C.elevated, ACCENT_SOFT] });
  const iconBoxBorder = selectAnim.interpolate({ inputRange: [0, 1], outputRange: [ACCENT_TRANSPARENT, ACCENT] });
  const iconInactiveOpacity = selectAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const labelColor = selectAnim.interpolate({ inputRange: [0, 1], outputRange: [C.textSecondary, ACCENT] });
  const cardScale = selectScale.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const shadowOpacity = selectAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });
  const iconLift = selectAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: Animated.multiply(cardScale, pressAnim) }] }}>
      <AnimatedTouchable
        style={[
          s.roleCard,
          {
            borderColor,
            backgroundColor,
            shadowColor: ACCENT,
            shadowOpacity,
          },
        ]}
        onPress={() => onPress(role.key)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            s.tick,
            {
              backgroundColor: ACCENT,
              opacity: selectAnim,
              transform: [{ scale: selectAnim }],
            },
          ]}
        >
          <Ionicons name="checkmark" size={12} color={C.bg} />
        </Animated.View>

        <Animated.View
          style={[
            s.roleIconBox,
            {
              backgroundColor: iconBoxBg,
              borderColor: iconBoxBorder,
              transform: [{ translateY: iconLift }],
            },
          ]}
        >
          <View style={s.iconStack}>
            <Animated.View style={[s.iconLayer, { opacity: iconInactiveOpacity }]}>
              <Ionicons name={role.icon} size={26} color={C.textSecondary} />
            </Animated.View>
            <Animated.View style={[s.iconLayer, { opacity: selectAnim }]}>
              <Ionicons name={role.icon} size={26} color={ACCENT} />
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.Text style={[s.roleLabel, { color: labelColor }]}>{role.label}</Animated.Text>
        <Text style={s.roleDesc}>{role.desc}</Text>
      </AnimatedTouchable>
    </Animated.View>
  );
}

export default function LoginScreen() {
  const { login, lastRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState(lastRole || null);
  const [loading, setLoading] = useState(false);

  const isPlaceholderUrl = API_BASE_URL.includes('YOUR_BACKEND');

  // ── One-time entrance animation (logo + brand copy) ──
  const mountAnim = useRef(new Animated.Value(0)).current;
  // ── Continuous soft "breathing" glow behind the logo ──
  const glowAnim = useRef(new Animated.Value(0)).current;
  // ── CTA press feedback ──
  const ctaPressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });

    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0, duration: 1900, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ]),
    ).start();
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
      await login(data.user, data.token);
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) { /* silent */ }
      else if (error.code === statusCodes.IN_PROGRESS) Alert.alert('Please wait', 'Sign-in already in progress.');
      else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) Alert.alert('Update required', 'Please update Google Play Services.');
      else Alert.alert('Sign-in error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleCtaPressIn = () => {
    Animated.spring(ctaPressAnim, { toValue: 0.97, useNativeDriver: true, friction: 6, tension: 220 }).start();
  };
  const handleCtaPressOut = () => {
    Animated.spring(ctaPressAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 140 }).start();
  };

  const logoOpacity = mountAnim;
  const logoScale = mountAnim.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const brandOpacity = mountAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });
  const brandTranslate = mountAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.26] });
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Brand ── */}
        <View style={s.brand}>
          <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <Animated.View
              style={[s.logoGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
            />
            <View style={s.logoBg}>
              <Image
                source={require('../../assets/logo.png')}
                style={s.logoImage}
                resizeMode="cover"
              />
            </View>
          </Animated.View>
          <Animated.View style={{ opacity: brandOpacity, transform: [{ translateY: brandTranslate }] }}>
            <Text style={s.appName}>StudyShala</Text>
            <Text style={s.appTagline}>Your college study companion</Text>
          </Animated.View>
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
          {ROLES.map((r) => (
            <RoleCard
              key={r.key}
              role={r}
              active={selectedRole === r.key}
              onPress={setSelectedRole}
            />
          ))}
        </View>

        {/* ── Google button ── */}
        <Animated.View style={{ transform: [{ scale: ctaPressAnim }] }}>
          <AnimatedTouchable
            style={[
              s.googleBtn,
              selectedRole ? s.googleBtnActive : s.googleBtnDisabled,
            ]}
            onPress={handleGoogleLogin}
            onPressIn={handleCtaPressIn}
            onPressOut={handleCtaPressOut}
            disabled={loading || !selectedRole}
            activeOpacity={1}
          >
            {loading ? (
              <ActivityIndicator color={selectedRole ? C.bg : C.accent} />
            ) : (
              <>
                <View style={s.googleIconBox}>
                  <Text style={s.googleG}>G</Text>
                </View>
                <Text style={[s.googleBtnText, selectedRole && { color: C.bg }]}>
                  {selectedRole
                    ? `Continue as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`
                    : 'Select a role to continue'}
                </Text>
                {!!selectedRole && (
                  <Ionicons name="arrow-forward" size={17} color={C.bg} />
                )}
              </>
            )}
          </AnimatedTouchable>
        </Animated.View>

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
  logoWrap: {
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: ACCENT,
  },
  logoBg: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  appTagline: { fontSize: T.base, color: C.textSecondary, textAlign: 'center' },

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
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    position: 'relative',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
  },
  tick: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },
  roleIconBox: {
    width: 56,
    height: 56,
    borderRadius: R.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconStack: { width: 26, height: 26 },
  iconLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  roleLabel: { fontSize: T.md, fontWeight: '700', marginBottom: 4 },
  roleDesc: { fontSize: T.xs, color: C.textMuted, textAlign: 'center', lineHeight: 16 },

  // Google button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 10,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  googleBtnActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.35,
  },
  googleBtnDisabled: { opacity: 0.45 },
  googleIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: { color: '#4285F4', fontWeight: '800', fontSize: T.sm },
  googleBtnText: { flex: 1, fontSize: T.base, fontWeight: '700', color: C.textPrimary, textAlign: 'center' },

  footnote: { textAlign: 'center', fontSize: T.sm, color: C.textMuted, lineHeight: 18 },
});
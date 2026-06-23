/**
 * screens/EnterCodeScreen.jsx — StudyShala
 *
 * Warm dark theme matching StudentDashboard:
 *   bg #13120f · surface #1e1c19 · accent #DE7356
 *
 * Features:
 *  - 8-box OTP-style character input (like the reference mockup)
 *  - Keyboard-avoiding that scrolls content up instead of clipping it
 *  - Shake animation on wrong code
 *  - Matches dashboard color tokens 1:1
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { validateAccessCode } from '../api/studentApi';

// ─── Theme (mirrors StudentDashboard exactly) ────────────────────────────────
const C = {
  bg:           '#13120f',
  surface:      '#1e1c19',
  surface2:     '#252320',
  elevated:     '#2a2724',
  border:       '#2e2c28',
  borderSub:    '#2a2724',
  accent:       '#DE7356',
  accentBg:     'rgba(222,115,86,0.09)',
  accentBorder: 'rgba(222,115,86,0.25)',
  textPrimary:  '#e8e4de',
  textSec:      '#b1ada1',
  textMuted:    '#6b6760',
  white:        '#ffffff',
  error:        '#f87171',
  errorBg:      'rgba(248,113,113,0.09)',
};

const R  = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, full: 999 };
const T  = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18, xxl: 22 };
const CODE_LEN = 8;
const BOX_GAP  = 7;
const { width: SCREEN_W } = Dimensions.get('window');
// Each box takes equal share of (screen − padding − gaps)
const BOX_SIZE = Math.floor((SCREEN_W - 48 - BOX_GAP * (CODE_LEN - 1)) / CODE_LEN);

// ─── Component ───────────────────────────────────────────────────────────────
export default function EnterCodeScreen({ navigation }) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const inputRef  = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Shake ──────────────────────────────────────────────────────────────────
  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 55, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const trimmed = code.trim();
    if (!trimmed) { setError('Please enter an access code.'); shake(); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await validateAccessCode(trimmed);
      if (data.valid) {
        const parentNav = navigation.getParent() || navigation;
        parentNav.navigate('MaterialAccess', { material: data.material });
        setCode('');
      } else {
        setError(data.message || 'Code not found. Double-check with your faculty.');
        shake();
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Something went wrong. Please try again.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const chars     = code.toUpperCase().slice(0, CODE_LEN).split('');
  const canSubmit = chars.length === CODE_LEN && !loading;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* KeyboardAvoidingView pushes the ScrollView up — nothing gets clipped */}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* ── Back header (fixed above scroll) ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={C.textSec} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Access Code</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Icon badge ── */}
          <View style={s.badgeWrap}>
            <View style={s.badgeOuter}>
              <View style={s.badgeInner}>
                <Ionicons name="key" size={30} color={C.accent} />
              </View>
            </View>
          </View>

          {/* ── Heading ── */}
          <Text style={s.title}>Enter your{'\n'}access code.</Text>
          <Text style={s.subtitle}>
            Get the {CODE_LEN}-character code from your faculty and type it below
            to unlock your study materials instantly.
          </Text>

          {/* ── OTP boxes ── */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
          >
            {/* Hidden real input — drives the boxes */}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(t) => {
                setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN));
                if (error) setError('');
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType="default"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              style={s.hiddenInput}
              caretHidden
            />

            {/* Visual card */}
            <Animated.View
              style={[s.boxCard, error && s.boxCardError, { transform: [{ translateX: shakeAnim }] }]}
            >
              {/* Label row */}
              <View style={s.boxLabelRow}>
                <View style={s.boxIconPill}>
                  <Ionicons name="key-outline" size={14} color={C.accent} />
                </View>
                <View>
                  <Text style={s.boxLabel}>Access Code</Text>
                  <Text style={s.boxMeta}>{CODE_LEN} characters · case-insensitive</Text>
                </View>
              </View>

              <View style={s.divider} />

              {/* Boxes */}
              <View style={s.boxRow}>
                {Array.from({ length: CODE_LEN }).map((_, i) => {
                  const char    = chars[i] ?? '';
                  const active  = i === chars.length && !error;
                  const filled  = !!char;
                  return (
                    <View
                      key={i}
                      style={[
                        s.box,
                        active && s.boxActive,
                        filled && s.boxFilled,
                        error  && s.boxError,
                      ]}
                    >
                      <Text style={[s.boxChar, !char && s.boxPlaceholder]}>
                        {char || ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* ── Error ── */}
          {!!error && (
            <View style={s.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color={C.error} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Unlock button ── */}
          <TouchableOpacity
            style={[s.btn, !canSubmit && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Ionicons name="lock-open-outline" size={18} color={C.white} />
                <Text style={s.btnText}>Unlock Materials</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── Hint ── */}
          <View style={s.hint}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={C.accent} />
            <Text style={s.hintText}>
              Ask your faculty or check the class WhatsApp group for the code.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.borderSub,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: T.base + 1, fontWeight: '700', color: C.textPrimary },

  // Scroll
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },

  // Badge
  badgeWrap:  { alignItems: 'flex-start', marginBottom: 20 },
  badgeOuter: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: C.accentBg, borderWidth: 1.5, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeInner: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Heading
  title: {
    fontSize: 30, fontWeight: '800', color: C.textPrimary,
    lineHeight: 36, letterSpacing: -0.6, marginBottom: 10,
  },
  subtitle: {
    fontSize: T.sm + 1, color: C.textSec, lineHeight: 20, marginBottom: 28,
  },

  // Hidden input
  hiddenInput: {
    position: 'absolute', width: 1, height: 1, opacity: 0,
  },

  // OTP card
  boxCard: {
    backgroundColor: C.surface, borderRadius: R.xl,
    borderWidth: 1.5, borderColor: C.border,
    padding: 16, marginBottom: 10,
  },
  boxCardError: { borderColor: C.error },

  boxLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  boxIconPill: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  boxLabel: { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  boxMeta:  { fontSize: T.xs, color: C.textMuted, marginTop: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  divider: { height: 1, backgroundColor: C.borderSub, marginBottom: 14 },

  boxRow: {
    flexDirection: 'row', gap: BOX_GAP,
  },
  box: {
    width: BOX_SIZE, height: BOX_SIZE + 8,
    borderRadius: R.md, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  boxActive: {
    borderColor: C.accent,
    backgroundColor: C.accentBg,
  },
  boxFilled: {
    borderColor: C.border,
    backgroundColor: C.surface2,
  },
  boxError: { borderColor: C.error },
  boxChar: {
    fontSize: T.xl, fontWeight: '800', color: C.textPrimary,
    letterSpacing: 0,
  },
  boxPlaceholder: { color: C.elevated },

  // Error
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.errorBg, borderRadius: R.sm,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: T.sm, color: C.error, lineHeight: 17 },

  // Button
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.accent, borderRadius: R.md,
    paddingVertical: 15, marginBottom: 16,
  },
  btnDisabled: { opacity: 0.38 },
  btnText: { fontSize: T.base + 2, fontWeight: '700', color: C.white },

  // Hint
  hint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9,
    backgroundColor: C.accentBg, borderRadius: R.md,
    borderWidth: 1, borderColor: C.accentBorder,
    padding: 13,
  },
  hintText: { flex: 1, fontSize: T.sm, color: C.accent, lineHeight: 18 },
});
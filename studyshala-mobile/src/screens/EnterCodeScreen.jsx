/**
 * screens/EnterCodeScreen.jsx — StudyShala Dark Theme
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { validateAccessCode } from '../api/studentApi';
import { C, R, T } from '../components/theme';

export default function EnterCodeScreen({ navigation }) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

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

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex}
      >

        {/* ── Back header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Enter Access Code</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.content}>

          {/* ── Illustration ── */}
          <View style={s.illustrationWrap}>
            {/* Outer glow ring */}
            <View style={s.glowRing}>
              <View style={s.keyBox}>
                <Ionicons name="key" size={42} color={C.accent} />
              </View>
            </View>
          </View>

          <Text style={s.title}>Enter Access Code</Text>
          <Text style={s.subtitle}>
            Your faculty will share a code to unlock study materials for your subject.
          </Text>

          {/* ── Input ── */}
          <Animated.View
            style={[
              s.inputWrap,
              error && s.inputWrapError,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            <Ionicons
              name="key-outline"
              size={20}
              color={error ? C.danger : C.textSecondary}
            />
            <TextInput
              style={s.input}
              placeholder="e.g. CSE5A2024"
              placeholderTextColor={C.textMuted}
              value={code}
              onChangeText={(t) => { setCode(t.toUpperCase()); if (error) setError(''); }}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            {!!code && (
              <TouchableOpacity onPress={() => setCode('')}>
                <Ionicons name="close-circle" size={18} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </Animated.View>

          {!!error && (
            <View style={s.errorRow}>
              <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* ── CTA ── */}
          <TouchableOpacity
            style={[s.button, (!code.trim() || loading) && s.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!code.trim() || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Text style={s.buttonText}>Unlock Materials</Text>
                <Ionicons name="lock-open-outline" size={20} color={C.white} />
              </>
            )}
          </TouchableOpacity>

          {/* ── Hint card ── */}
          <View style={s.hintCard}>
            <Ionicons name="information-circle-outline" size={18} color={C.accent} />
            <Text style={s.hintText}>
              Ask your faculty or check the class WhatsApp group for the code.
            </Text>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex:      { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: T.base + 1, fontWeight: '700', color: C.textPrimary },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  // Illustration
  illustrationWrap: { alignItems: 'center', marginBottom: 30 },
  glowRing: {
    width: 110,
    height: 110,
    borderRadius: 30,
    backgroundColor: C.accentBg,
    borderWidth: 1.5,
    borderColor: C.accent + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBox: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: T.xxl,
    fontWeight: '800',
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: T.sm + 1,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // Input
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    gap: 10,
  },
  inputWrapError: { borderColor: C.danger },
  input: {
    flex: 1,
    fontSize: T.xl,
    fontWeight: '800',
    letterSpacing: 3,
    color: C.textPrimary,
  },

  errorRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  errorText: { color: C.danger, fontSize: T.base },

  // Button
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: C.accent, borderRadius: R.md,
    paddingVertical: 16, marginBottom: 18, marginTop: 4,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: C.white, fontSize: T.base + 2, fontWeight: '700' },

  // Hint
  hintCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.accentBg, borderRadius: R.md,
    borderWidth: 1, borderColor: C.accent + '30',
    padding: 14,
  },
  hintText: { flex: 1, fontSize: T.base, color: C.accent, lineHeight: 18 },
});

/**
 * screens/EnterCodeScreen.jsx — StudyShala
 *
 * Warm dark theme — exact match to StudentDashboard palette:
 *   bg #13120f · surface #1e1c19 · accent #DE7356
 *
 * Features:
 *  - 8-box OTP-style character input
 *  - Clamped box size (min 32 / max 46) — safe on all screen widths
 *  - Shake animation on wrong code
 *  - Success dialog with "Open Now" / "Save for Later" choice
 *  - Save for Later calls saveMaterial API before dismissing
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
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { validateAccessCode, saveMaterial } from '../api/studentApi';
import { syncMaterialOffline } from '../utils/materialSync';

// ─── Theme — mirrors StudentDashboard exactly ────────────────────────────────
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
  secondary:    '#B1ADA1',
  secondaryBg:  'rgba(177,173,161,0.09)',
  secondaryBdr: 'rgba(177,173,161,0.25)',
  textPrimary:  '#e8e4de',
  textSec:      '#b1ada1',
  textMuted:    '#6b6760',
  white:        '#ffffff',
  success:      '#4ade80',
  successBg:    'rgba(74,222,128,0.09)',
  successBdr:   'rgba(74,222,128,0.25)',
  error:        '#f87171',
  errorBg:      'rgba(248,113,113,0.09)',
  errorBdr:     'rgba(248,113,113,0.22)',
};

const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18, xxl: 22 };

const CODE_LEN   = 8;
const BOX_GAP    = 7;
const { width: SCREEN_W } = Dimensions.get('window');
// Clamp: never smaller than 32, never bigger than 46
const RAW_BOX    = (SCREEN_W - 48 - BOX_GAP * (CODE_LEN - 1)) / CODE_LEN;
const BOX_SIZE   = Math.max(32, Math.min(Math.floor(RAW_BOX), 46));

// ─── Success Dialog ───────────────────────────────────────────────────────────
function SuccessDialog({ visible, material, onOpenNow, onSaveLater, saving }) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <Pressable style={sd.backdrop} onPress={() => {}}>
        <Pressable style={sd.card} onPress={() => {}}>

          {/* Icon */}
          <View style={sd.iconWrap}>
            <Ionicons name="checkmark-circle" size={34} color={C.success} />
          </View>

          {/* Badge */}
          <View style={sd.badge}>
            <Ionicons name="shield-checkmark-outline" size={11} color={C.success} />
            <Text style={sd.badgeText}>Code Verified</Text>
          </View>

          {/* Title */}
          <Text style={sd.title}>Material Unlocked</Text>
          <Text style={sd.desc} numberOfLines={2}>
            {material?.subjectName || 'This material'} is now available to you.
          </Text>

          {/* Meta row */}
          {material && (
            <View style={sd.metaRow}>
              {material.department ? (
                <View style={sd.metaPill}>
                  <Ionicons name="business-outline" size={11} color={C.textMuted} />
                  <Text style={sd.metaText}>{material.department}</Text>
                </View>
              ) : null}
              {material.semester ? (
                <View style={sd.metaPill}>
                  <Ionicons name="school-outline" size={11} color={C.textMuted} />
                  <Text style={sd.metaText}>Sem {material.semester}</Text>
                </View>
              ) : null}
              {material.facultyName ? (
                <View style={sd.metaPill}>
                  <Ionicons name="person-outline" size={11} color={C.textMuted} />
                  <Text style={sd.metaText}>{material.facultyName}</Text>
                </View>
              ) : null}
            </View>
          )}

          <View style={sd.divider} />

          {/* Buttons */}
          <TouchableOpacity style={sd.btnPrimary} onPress={onOpenNow} activeOpacity={0.85}>
            <Ionicons name="folder-open-outline" size={17} color={C.white} />
            <Text style={sd.btnPrimaryText}>Open Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={sd.btnSecondary}
            onPress={onSaveLater}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color={C.textSec} />
            ) : (
              <>
                <Ionicons name="bookmark-outline" size={16} color={C.textSec} />
                <Text style={sd.btnSecondaryText}>Save for Later</Text>
              </>
            )}
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sd = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 24,
  },
  iconWrap: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: C.successBg,
    borderWidth: 1.5, borderColor: C.successBdr,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.successBg,
    borderRadius: R.full,
    borderWidth: 1, borderColor: C.successBdr,
    paddingVertical: 4, paddingHorizontal: 11,
    marginBottom: 14,
  },
  badgeText: { fontSize: T.xs, fontWeight: '700', color: C.success, letterSpacing: 0.3 },
  title: {
    fontSize: T.xl, fontWeight: '800', color: C.textPrimary,
    letterSpacing: -0.4, marginBottom: 6, textAlign: 'center',
  },
  desc: {
    fontSize: T.sm, color: C.textSec, textAlign: 'center',
    lineHeight: 19, marginBottom: 14, paddingHorizontal: 4,
  },
  metaRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    justifyContent: 'center', marginBottom: 4,
  },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.elevated,
    borderRadius: R.full,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 4, paddingHorizontal: 9,
  },
  metaText: { fontSize: T.xs, color: C.textMuted, fontWeight: '500' },
  divider: { height: 1, backgroundColor: C.borderSub, width: '100%', marginVertical: 18 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.accent, borderRadius: R.md,
    paddingVertical: 13, width: '100%', marginBottom: 10,
  },
  btnPrimaryText: { fontSize: T.base + 1, fontWeight: '700', color: C.white },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: C.elevated, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 12, width: '100%',
  },
  btnSecondaryText: { fontSize: T.base, fontWeight: '600', color: C.textSec },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EnterCodeScreen({ navigation }) {
  const [code,          setCode]          = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [successData,   setSuccessData]   = useState(null); // { material }
  const [savingLater,   setSavingLater]   = useState(false);

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
        setSuccessData({ material: data.material });
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

  // ── Open Now ───────────────────────────────────────────────────────────────
  const handleOpenNow = () => {
    const material = successData?.material;
    setSuccessData(null);
    const parentNav = navigation.getParent() || navigation;
    parentNav.navigate('MaterialAccess', { material });
  };

  // ── Save for Later ─────────────────────────────────────────────────────────
  const handleSaveLater = async () => {
    if (!successData?.material?._id) { setSuccessData(null); return; }
    const material = successData.material;
    setSavingLater(true);
    try {
      await saveMaterial(material._id);
      // Fire-and-forget: download every file in this material for offline
      // access. Deliberately not awaited — the dialog shouldn't sit open
      // while potentially several files download in the background.
      syncMaterialOffline(material).catch(() => {});
    } catch { /* non-critical — already saved or network blip */ }
    finally {
      setSavingLater(false);
      setSuccessData(null);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const chars     = code.toUpperCase().slice(0, CODE_LEN).split('');
  const canSubmit = chars.length === CODE_LEN && !loading;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* ── Back header ── */}
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
                <Ionicons name="key" size={28} color={C.accent} />
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
          <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()}>
            {/* Hidden real input */}
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
              style={[
                s.boxCard,
                error && s.boxCardError,
                { transform: [{ translateX: shakeAnim }] },
              ]}
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
                  const char   = chars[i] ?? '';
                  const active = i === chars.length && !error;
                  const filled = !!char;
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
                        {char || '·'}
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

          {/* ── How it works ── */}
          <View style={s.howCard}>
            <Text style={s.howTitle}>How it works</Text>
            {[
              { icon: 'person-outline',      text: 'Your faculty creates a subject and shares a code' },
              { icon: 'keypad-outline',       text: 'You type the 8-character code above'              },
              { icon: 'folder-open-outline',  text: 'Instantly access all uploaded materials'          },
            ].map((step, i) => (
              <View key={i} style={[s.howStep, i === 2 && { marginBottom: 0 }]}>
                <View style={s.howStepIcon}>
                  <Ionicons name={step.icon} size={14} color={C.accent} />
                </View>
                <Text style={s.howStepText}>{step.text}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Success dialog ── */}
      <SuccessDialog
        visible={!!successData}
        material={successData?.material}
        onOpenNow={handleOpenNow}
        onSaveLater={handleSaveLater}
        saving={savingLater}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  scroll: { paddingHorizontal: 14, paddingTop: 25, paddingBottom: 40 },

  // Badge
  badgeWrap:  { alignItems: 'flex-start', marginBottom: 20 },
  badgeOuter: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: C.accentBg, borderWidth: 8, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeInner: {
    width: 50, height: 50, borderRadius: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Heading
  title: {
    fontSize: 28, fontWeight: '800', color: C.textPrimary,
    lineHeight: 34, letterSpacing: -0.6, marginBottom: 10,
  },
  subtitle: { fontSize: T.sm + 1, color: C.textSec, lineHeight: 20, marginBottom: 28 },

  // Hidden input
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },

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
  boxMeta: {
    fontSize: T.xs, color: C.textMuted, marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  divider: { height: 1, backgroundColor: C.borderSub, marginBottom: 14 },

  boxRow: { flexDirection: 'row', gap: BOX_GAP },
  box: {
    width: BOX_SIZE, height: BOX_SIZE + 8,
    borderRadius: R.md, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  boxActive: { borderColor: C.accent, backgroundColor: C.accentBg },
  boxFilled: { borderColor: C.border, backgroundColor: C.surface2 },
  boxError:  { borderColor: C.error },
  boxChar: {
    fontSize: BOX_SIZE > 38 ? T.xl : T.lg,
    fontWeight: '800', color: C.textPrimary, letterSpacing: 0,
  },
  boxPlaceholder: { color: C.elevated, fontWeight: '400' },

  // Error
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.errorBg,
    borderRadius: R.sm, borderWidth: 1, borderColor: C.errorBdr,
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
    padding: 13, marginBottom: 20,
  },
  hintText: { flex: 1, fontSize: T.sm, color: C.accent, lineHeight: 18 },

  // How it works card
  howCard: {
    backgroundColor: C.surface, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.border, padding: 16,
  },
  howTitle: {
    fontSize: T.xs, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },
  howStep: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
  },
  howStepIcon: {
    width: 30, height: 30, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  howStepText: { fontSize: T.sm, color: C.textSec, flex: 1, lineHeight: 18 },
});
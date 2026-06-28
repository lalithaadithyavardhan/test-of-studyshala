/**
 * screens/CreateMaterialScreen.jsx — StudyShala
 * Warm dark theme matching StudentDashboard
 *   bg #13120f · surface #1e1c19 · accent #DE7356
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { createFolder } from '../api/facultyApi';
import { DEPARTMENTS, SEMESTERS } from '../config/config';

// ─── Theme (matches StudentDashboard) ────────────────────────────────────────
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
  danger:       '#f87171',
};
const R = { xs: 6, sm: 8, md: 10, lg: 14, xl: 16, full: 999 };
const T = { xs: 10, sm: 12, base: 13, md: 14, lg: 16, xl: 18 };

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ total, completed }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            s.dot,
            i < completed ? s.dotFilled : i === completed ? s.dotActive : s.dotEmpty,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Chip picker ──────────────────────────────────────────────────────────────
function ChipPicker({ label, options, value, onChange, prefix = '', icon }) {
  return (
    <View style={s.field}>
      <View style={s.labelRow}>
        {icon && <Ionicons name={icon} size={14} color={C.accent} style={{ marginRight: 5 }} />}
        <Text style={s.label}>{label} <Text style={s.required}>*</Text></Text>
      </View>
      <View style={s.chipRow}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[s.chip, active && s.chipActive]}
              onPress={() => onChange(opt)}
              activeOpacity={0.75}
            >
              {active && <Ionicons name="checkmark" size={11} color={C.accent} style={{ marginRight: 3 }} />}
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {prefix}{opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Success overlay ──────────────────────────────────────────────────────────
function SuccessCard({ code, subjectName, onDone }) {
  return (
    <View style={s.successOverlay}>
      <View style={s.successCard}>
        <View style={s.successIconWrap}>
          <Ionicons name="checkmark-circle" size={48} color={C.success} />
        </View>
        <Text style={s.successTitle}>Material Created!</Text>
        <Text style={s.successSubject} numberOfLines={2}>{subjectName}</Text>

        <View style={s.codeBox}>
          <Text style={s.codeLabel}>Student Access Code</Text>
          <Text style={s.codeValue}>{code}</Text>
          <Text style={s.codeHint}>
            Share this code with your students. They enter it in the app to unlock this subject.
          </Text>
        </View>

        <View style={s.howCodeRow}>
          {[
            { icon: 'share-social-outline', text: 'Share code via WhatsApp / email' },
            { icon: 'phone-portrait-outline', text: 'Student taps "Enter access code"' },
            { icon: 'folder-open-outline', text: 'Subject unlocked instantly' },
          ].map((step, i) => (
            <View key={i} style={s.howCodeStep}>
              <View style={s.howCodeIconWrap}>
                <Ionicons name={step.icon} size={15} color={C.accent} />
              </View>
              <Text style={s.howCodeText}>{step.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.doneBtn} onPress={onDone} activeOpacity={0.85}>
          <Ionicons name="checkmark" size={18} color={C.white} />
          <Text style={s.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CreateMaterialScreen({ navigation }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    department:        '',
    semester:          '',
    subjectName:       '',
    facultyName:       user?.name || '',
    messageToStudents: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null); // { code, subjectName }
  const [focusedField, setFocusedField] = useState('');

  const set = (key) => (val) => setFormData((p) => ({ ...p, [key]: val }));

  const isValid =
    formData.department && formData.semester &&
    formData.subjectName.trim() && formData.facultyName.trim();

  const steps = [
    { filled: !!formData.facultyName.trim() },
    { filled: !!formData.department },
    { filled: !!formData.semester },
    { filled: !!formData.subjectName.trim() },
  ];
  const completedSteps = steps.filter((s) => s.filled).length;

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Missing fields', 'Please fill in all required fields before creating.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await createFolder(formData);
      const code = data.folder.accessCode || data.folder.departmentCode;
      setSuccessInfo({ code, subjectName: formData.subjectName });
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create material.');
    } finally {
      setSubmitting(false);
    }
  };

  // Checklist summary row
  const fieldChecks = [
    { label: 'Faculty name',  done: !!formData.facultyName.trim() },
    { label: 'Department',    done: !!formData.department },
    { label: 'Semester',      done: !!formData.semester },
    { label: 'Subject name',  done: !!formData.subjectName.trim() },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={19} color={C.textSec} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.headerTitle}>Create Material</Text>
            <Text style={s.headerSub}>Fill in the details below</Text>
          </View>
          <StepDots total={steps.length} completed={completedSteps} />
        </View>

        {/* ── Progress bar ── */}
        <View style={s.progressSection}>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${(completedSteps / steps.length) * 100}%` }]} />
          </View>
          <View style={s.progressLabelRow}>
            <Text style={s.progressText}>{completedSteps} of {steps.length} filled</Text>
            {isValid && (
              <View style={s.readyPill}>
                <Ionicons name="checkmark-circle" size={11} color={C.success} />
                <Text style={s.readyText}>Ready to create</Text>
              </View>
            )}
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

            {/* ── Info banner ── */}
            <View style={s.infoBanner}>
              <Ionicons name="information-circle-outline" size={16} color={C.accent} />
              <Text style={s.infoBannerText}>
                After creating, you'll get a unique <Text style={{ color: C.accent, fontWeight: '700' }}>8-character access code</Text> to share with your students.
              </Text>
            </View>

            {/* Faculty Name */}
            <View style={s.field}>
              <View style={s.labelRow}>
                <Ionicons name="person-outline" size={14} color={C.accent} style={{ marginRight: 5 }} />
                <Text style={s.label}>Faculty Name <Text style={s.required}>*</Text></Text>
              </View>
              <View style={[s.inputWrap, focusedField === 'faculty' && s.inputWrapFocused]}>
                <Ionicons name="person-circle-outline" size={18} color={focusedField === 'faculty' ? C.accent : C.textMuted} />
                <TextInput
                  style={s.input}
                  value={formData.facultyName}
                  onChangeText={set('facultyName')}
                  placeholder="e.g. Dr. John Smith"
                  placeholderTextColor={C.textMuted}
                  onFocus={() => setFocusedField('faculty')}
                  onBlur={() => setFocusedField('')}
                />
                {formData.facultyName.trim() ? (
                  <Ionicons name="checkmark-circle" size={16} color={C.success} />
                ) : null}
              </View>
            </View>

            <ChipPicker
              label="Department"
              options={DEPARTMENTS}
              value={formData.department}
              onChange={set('department')}
              icon="business-outline"
            />

            <ChipPicker
              label="Semester"
              options={SEMESTERS}
              value={formData.semester}
              onChange={set('semester')}
              prefix="Sem "
              icon="calendar-outline"
            />

            {/* Subject Name */}
            <View style={s.field}>
              <View style={s.labelRow}>
                <Ionicons name="book-outline" size={14} color={C.accent} style={{ marginRight: 5 }} />
                <Text style={s.label}>Subject Name <Text style={s.required}>*</Text></Text>
              </View>
              <View style={[s.inputWrap, focusedField === 'subject' && s.inputWrapFocused]}>
                <Ionicons name="library-outline" size={18} color={focusedField === 'subject' ? C.accent : C.textMuted} />
                <TextInput
                  style={s.input}
                  value={formData.subjectName}
                  onChangeText={set('subjectName')}
                  placeholder="e.g. Data Structures & Algorithms"
                  placeholderTextColor={C.textMuted}
                  onFocus={() => setFocusedField('subject')}
                  onBlur={() => setFocusedField('')}
                />
                {formData.subjectName.trim() ? (
                  <Ionicons name="checkmark-circle" size={16} color={C.success} />
                ) : null}
              </View>
            </View>

            {/* Message to Students */}
            <View style={s.field}>
              <View style={s.labelRow}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.textMuted} style={{ marginRight: 5 }} />
                <Text style={s.label}>
                  Message to Students{' '}
                  <Text style={s.optional}>(optional)</Text>
                </Text>
              </View>
              <TextInput
                style={[s.textarea, focusedField === 'msg' && s.inputWrapFocused]}
                value={formData.messageToStudents}
                onChangeText={set('messageToStudents')}
                placeholder="e.g. Unit 1 exam on Friday. Submit assignments by Sunday."
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={3}
                maxLength={2000}
                onFocus={() => setFocusedField('msg')}
                onBlur={() => setFocusedField('')}
              />
              <Text style={s.charCount}>{formData.messageToStudents.length}/2000</Text>
            </View>

            {/* ── Checklist summary ── */}
            <View style={s.checklistCard}>
              <Text style={s.checklistTitle}>Checklist</Text>
              {fieldChecks.map((item, i) => (
                <View key={i} style={s.checklistRow}>
                  <Ionicons
                    name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={item.done ? C.success : C.textMuted}
                  />
                  <Text style={[s.checklistLabel, item.done && s.checklistLabelDone]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ height: 12 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.submitBtn, (!isValid || submitting) && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color={C.white} />
                <Text style={s.submitBtnText}>Create Material</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </SafeAreaView>

      {/* ── Success overlay ── */}
      {successInfo && (
        <SuccessCard
          code={successInfo.code}
          subjectName={successInfo.subjectName}
          onDone={() => {
            setSuccessInfo(null);
            navigation.goBack();
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: T.lg, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  headerSub:   { fontSize: T.xs, color: C.textMuted, marginTop: 1 },

  // Step dots
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotEmpty:  { backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border },
  dotActive: { backgroundColor: C.accentBorder, borderWidth: 1, borderColor: C.accent },
  dotFilled: { backgroundColor: C.accent },

  // Progress
  progressSection: {
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  progressBg: { height: 4, backgroundColor: C.elevated, borderRadius: R.full, overflow: 'hidden', marginBottom: 7 },
  progressFill: { height: '100%', backgroundColor: C.accent, borderRadius: R.full },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: T.xs, color: C.textMuted, fontWeight: '600' },
  readyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
    borderRadius: R.full, paddingVertical: 3, paddingHorizontal: 8,
  },
  readyText: { fontSize: T.xs, color: C.success, fontWeight: '600' },

  scrollContent: { padding: 18, paddingBottom: 16 },

  // Info banner
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    borderRadius: R.md, padding: 12, marginBottom: 22,
  },
  infoBannerText: { flex: 1, fontSize: T.sm, color: C.textSec, lineHeight: 18 },

  // Fields
  field:    { marginBottom: 22 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label:    { fontSize: T.base, fontWeight: '700', color: C.textPrimary },
  required: { color: C.danger },
  optional: { color: C.textMuted, fontWeight: '400' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 13,
  },
  inputWrapFocused: { borderColor: C.accent, backgroundColor: C.surface2 },
  input: { flex: 1, fontSize: T.md, color: C.textPrimary },

  textarea: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.md, padding: 14, fontSize: T.md, color: C.textPrimary,
    minHeight: 90, textAlignVertical: 'top',
  },
  charCount: { fontSize: T.xs, color: C.textMuted, textAlign: 'right', marginTop: 4 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.full, paddingVertical: 7, paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: C.accentBg, borderColor: C.accent },
  chipText:       { fontSize: T.sm, fontWeight: '600', color: C.textSec },
  chipTextActive: { color: C.accent },

  // Checklist
  checklistCard: {
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, padding: 14,
  },
  checklistTitle: { fontSize: T.sm, fontWeight: '700', color: C.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  checklistRow:   { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  checklistLabel: { fontSize: T.base, color: C.textMuted },
  checklistLabelDone: { color: C.textPrimary },

  // Footer
  footer: {
    padding: 16, backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: C.accent, borderRadius: R.md, paddingVertical: 15,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: C.white, fontSize: T.md, fontWeight: '700' },

  // Success overlay
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19,18,15,0.92)',
    justifyContent: 'center', alignItems: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    padding: 24, width: '100%',
  },
  successIconWrap: { alignItems: 'center', marginBottom: 12 },
  successTitle: { fontSize: T.xl, fontWeight: '800', color: C.textPrimary, textAlign: 'center', marginBottom: 4 },
  successSubject: { fontSize: T.base, color: C.textSec, textAlign: 'center', marginBottom: 20 },

  codeBox: {
    backgroundColor: C.accentBg, borderWidth: 1.5, borderColor: C.accentBorder,
    borderRadius: R.md, padding: 16, marginBottom: 18, alignItems: 'center',
  },
  codeLabel: { fontSize: T.xs, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  codeValue: { fontSize: 28, fontWeight: '900', color: C.accent, letterSpacing: 4, marginBottom: 10 },
  codeHint:  { fontSize: T.xs, color: C.textSec, textAlign: 'center', lineHeight: 17 },

  howCodeRow:  { gap: 10, marginBottom: 20 },
  howCodeStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  howCodeIconWrap: {
    width: 30, height: 30, borderRadius: R.sm,
    backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  howCodeText: { fontSize: T.sm, color: C.textSec, flex: 1 },

  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: C.accent, borderRadius: R.md, paddingVertical: 14,
  },
  doneBtnText: { color: C.white, fontSize: T.md, fontWeight: '700' },
});
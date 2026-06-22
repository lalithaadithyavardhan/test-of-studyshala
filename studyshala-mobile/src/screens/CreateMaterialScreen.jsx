/**
 * screens/CreateMaterialScreen.jsx — StudyShala Dark Theme
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { createFolder } from '../api/facultyApi';
import { DEPARTMENTS, SEMESTERS } from '../config/config';
import { C, R, T } from '../components/theme';

// ── Chip picker ────────────────────────────────────────────────────────────
function ChipPicker({ label, options, value, onChange, prefix = '' }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label} <Text style={s.required}>*</Text>
      </Text>
      <View style={s.chipRow}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[s.chip, active && s.chipActive]}
              onPress={() => onChange(opt)}
            >
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

export default function CreateMaterialScreen({ navigation }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    department: '',
    semester: '',
    subjectName: '',
    facultyName: user?.name || '',
    messageToStudents: '',
  });
  const [submitting, setSubmitting] = useState(false);

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
    if (!isValid) { Alert.alert('Missing fields', 'Please fill in all required fields.'); return; }
    setSubmitting(true);
    try {
      const { data } = await createFolder(formData);
      const code = data.folder.accessCode || data.folder.departmentCode;
      Alert.alert('Material created! 🎉', `Student access code: ${code}`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create material.');
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={20} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Material</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Progress bar ── */}
      <View style={s.progressSection}>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${(completedSteps / steps.length) * 100}%` }]} />
        </View>
        <Text style={s.progressText}>{completedSteps} of {steps.length} fields filled</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Faculty Name */}
          <View style={s.field}>
            <Text style={s.label}>Faculty Name <Text style={s.required}>*</Text></Text>
            <View style={s.inputWrap}>
              <Ionicons name="person-outline" size={17} color={C.textSecondary} />
              <TextInput
                style={s.input}
                value={formData.facultyName}
                onChangeText={set('facultyName')}
                placeholder="e.g. Dr. John Smith"
                placeholderTextColor={C.textMuted}
              />
            </View>
          </View>

          <ChipPicker label="Department" options={DEPARTMENTS} value={formData.department} onChange={set('department')} />
          <ChipPicker label="Semester"   options={SEMESTERS}   value={formData.semester}   onChange={set('semester')} prefix="Sem " />

          {/* Subject Name */}
          <View style={s.field}>
            <Text style={s.label}>Subject Name <Text style={s.required}>*</Text></Text>
            <View style={s.inputWrap}>
              <Ionicons name="book-outline" size={17} color={C.textSecondary} />
              <TextInput
                style={s.input}
                value={formData.subjectName}
                onChangeText={set('subjectName')}
                placeholder="e.g. Data Structures & Algorithms"
                placeholderTextColor={C.textMuted}
              />
            </View>
          </View>

          {/* Message to Students */}
          <View style={s.field}>
            <Text style={s.label}>
              Message to Students{' '}
              <Text style={s.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={s.textarea}
              value={formData.messageToStudents}
              onChangeText={set('messageToStudents')}
              placeholder="e.g. Unit 1 exam on Friday. Submit assignments by Sunday."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
              maxLength={2000}
            />
            <Text style={s.charCount}>{formData.messageToStudents.length}/2000</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Footer ── */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.submitBtn, (!isValid || submitting) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
              <Text style={s.submitBtnText}>Create Material</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: R.sm,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: T.base + 3, fontWeight: '800', color: C.textPrimary },

  progressSection: {
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  progressBg: {
    height: 5, backgroundColor: C.elevated, borderRadius: R.pill, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: C.accent, borderRadius: R.pill },
  progressText: { fontSize: T.xs, color: C.textMuted, fontWeight: '600' },

  scrollContent: { padding: 18, paddingBottom: 20 },

  field:    { marginBottom: 22 },
  label:    { fontSize: T.base, fontWeight: '700', color: C.textPrimary, marginBottom: 10 },
  required: { color: C.danger },
  optional: { color: C.textMuted, fontWeight: '400' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: T.md, color: C.textPrimary },

  textarea: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.md, padding: 14, fontSize: T.md, color: C.textPrimary,
    minHeight: 90, textAlignVertical: 'top',
  },
  charCount: { fontSize: T.xs, color: C.textMuted, textAlign: 'right', marginTop: 4 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.pill, paddingVertical: 8, paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: C.accentBg, borderColor: C.accent },
  chipText:   { fontSize: T.base, fontWeight: '600', color: C.textSecondary },
  chipTextActive: { color: C.accent },

  footer: {
    padding: 16, backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: C.accent, borderRadius: R.md, paddingVertical: 16,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: C.white, fontSize: T.base + 2, fontWeight: '700' },
});

/**
 * screens/CreateMaterialScreen.jsx
 * ===================================
 * Mirrors the "Create Material" modal in studyshalaFrontend's
 * FacultyDashboard.jsx. Fields and validation match createFolder() in
 * facultyController.js exactly: department, semester, subjectName,
 * facultyName (all required), messageToStudents (optional, max 2000).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { createFolder } from '../api/facultyApi';
import { DEPARTMENTS, SEMESTERS } from '../config/config';

function ChipPicker({ label, options, value, onChange, prefix = '' }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label} <Text style={styles.required}>*</Text></Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(opt)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
    formData.department && formData.semester && formData.subjectName.trim() && formData.facultyName.trim();

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Missing fields', 'Department, semester, subject name, and faculty name are required.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await createFolder(formData);
      const code = data.folder.accessCode || data.folder.departmentCode;
      Alert.alert('Material created!', `Student access code: ${code}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create material.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Material</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.field}>
            <Text style={styles.label}>Faculty Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.facultyName}
              onChangeText={set('facultyName')}
              placeholder="e.g., Dr. John Smith"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <ChipPicker
            label="Department"
            options={DEPARTMENTS}
            value={formData.department}
            onChange={set('department')}
          />

          <ChipPicker
            label="Semester"
            options={SEMESTERS}
            value={formData.semester}
            onChange={set('semester')}
            prefix="Sem "
          />

          <View style={styles.field}>
            <Text style={styles.label}>Subject Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={formData.subjectName}
              onChangeText={set('subjectName')}
              placeholder="e.g., Data Structures & Algorithms"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              <Ionicons name="megaphone-outline" size={13} /> Message to Students{' '}
              <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={formData.messageToStudents}
              onChangeText={set('messageToStudents')}
              placeholder="e.g., Unit 1 exam on Friday. Submit assignments by Sunday."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              maxLength={2000}
            />
            <Text style={styles.charCount}>{formData.messageToStudents.length}/2000</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Create Material</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  scrollContent: { padding: 18, paddingBottom: 40 },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  required: { color: '#EF4444' },
  optional: { color: '#9CA3AF', fontWeight: '400' },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 15, color: '#1F2937',
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: '#0891B2', borderColor: '#0891B2' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#fff' },
  footer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  submitBtn: {
    backgroundColor: '#0891B2', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

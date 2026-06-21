/**
 * screens/EnterCodeScreen.jsx
 * ============================
 * Mirrors studyshalaFrontend's StudentEnterCode.jsx.
 * Calls POST /student/validate-code, exactly matching the response shape
 * from your real studentController.js validateAccessCode():
 *   { valid: true, material: { _id, subjectName, department, semester,
 *       facultyName, accessCode, fileCount, messageToStudents, createdAt,
 *       files: [...], subFolders: [...] } }
 *   { valid: false, message }
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { validateAccessCode } from '../api/studentApi';

export default function EnterCodeScreen({ navigation }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter an access code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await validateAccessCode(trimmed);
      if (data.valid) {
        // MaterialAccess lives on the parent stack, above the tab
        // navigator, so it can be pushed full-screen over the tabs.
        const parentNav = navigation.getParent() || navigation;
        parentNav.navigate('MaterialAccess', { material: data.material });
        setCode('');
      } else {
        setError(data.message || 'Code not found or inactive.');
      }
    } catch (e) {
      setError(
        e.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Text style={styles.icon}>🔑</Text>
          <Text style={styles.title}>Enter Access Code</Text>
          <Text style={styles.subtitle}>
            Ask your faculty for the code to unlock study materials for your
            subject.
          </Text>

          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="e.g. CSE5A2024"
            placeholderTextColor="#9CA3AF"
            value={code}
            onChangeText={(t) => {
              setCode(t.toUpperCase());
              if (error) setError('');
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Unlock Materials</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  flex: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  icon: { fontSize: 44, textAlign: 'center', marginBottom: 10 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

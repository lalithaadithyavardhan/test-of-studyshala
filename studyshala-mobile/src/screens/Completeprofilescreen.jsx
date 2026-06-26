import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/config';

const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
const semesters   = ['1', '2', '3', '4', '5', '6', '7', '8'];

export default function CompleteProfileScreen({ navigation }) {
  const { token, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Basic validation
    if (!name.trim()) { Alert.alert('Error', 'Name is required.'); return; }
    if (!branch) { Alert.alert('Error', 'Please select a branch.'); return; }
    if (!semester) { Alert.alert('Error', 'Please select a semester.'); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/student/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          department: branch,
          semester,
          section: section.trim() || null,
          rollNumber: rollNumber.trim() || null,
          }),
        });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || `Error ${response.status}`);
        return;
      }

      // Update user in AuthContext so profileCompleted = true
      // This triggers AppNavigator to auto-switch to StudentRoot
      updateUser({
    profileCompleted: true,
    name,
    department: branch,
    semester,
});
Alert.alert(
    "Success",
    "Profile completed successfully!"
);

    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <Text style={s.title}>Complete Your Profile</Text>

        {/* Name */}
        <TextInput
    style={s.input}
    placeholder="Enter your name"
    placeholderTextColor="#999"
    autoCapitalize="words"
    value={name}
    onChangeText={setName}
/>

        {/* Branch */}
        <Text style={s.label}>Branch *</Text>
        <View style={s.optionRow}>
          {departments.map((b) => (
            <TouchableOpacity
              key={b}
              style={[s.chip, branch === b && s.chipActive]}
              onPress={() => setBranch(b)}
            >
              <Text style={[s.chipText, branch === b && s.chipTextActive]}>{b}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Semester */}
        <Text style={s.label}>Semester *</Text>
        <View style={s.optionRow}>
          {semesters.map((sem) => (
            <TouchableOpacity
              key={sem}
              style={[s.chip, semester === sem && s.chipActive]}
              onPress={() => setSemester(sem)}
            >
              <Text style={[s.chipText, semester === sem && s.chipTextActive]}>Sem {sem}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section (Optional) */}
        <Text style={s.label}>Section (Optional)</Text>
        <TextInput
    placeholderTextColor="#999"
          style={s.input}
          placeholder="e.g. A, B, C"
          value={section}
          onChangeText={setSection}
        />

        {/* Roll Number (Optional) */}
       <TextInput
    style={s.input}
    placeholder="e.g. 21CS001"
    placeholderTextColor="#999"
    autoCapitalize="characters"
    value={rollNumber}
    onChangeText={setRollNumber}
/>

        {/* Submit */}
        <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Save & Get Started</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: { borderColor: '#DE7356', backgroundColor: '#DE7356' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  btn: {
    backgroundColor: '#DE7356',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 32,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
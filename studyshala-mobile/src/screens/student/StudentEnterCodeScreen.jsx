import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import ScreenScaffold from '../../components/ScreenScaffold';
import { validateAccessCode } from '../../api/student';
import { COLORS } from '../../constants/config';

export default function StudentEnterCodeScreen({ navigation }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await validateAccessCode(code.trim());
      const materialId = res.data?.materialId || res.data?.material?._id;
      if (materialId) {
        navigation.navigate('StudentMaterialAccess', { id: materialId });
      } else {
        Alert.alert('Code accepted', 'Could not determine which material to open.');
      }
    } catch (err) {
      Alert.alert('Invalid code', err?.response?.data?.message || 'Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenScaffold title="Enter Access Code" subtitle="Paste the code your faculty shared with you">
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="e.g. CS301-A2F9"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Access Materials</Text>}
      </TouchableOpacity>

      <View style={styles.linkRow}>
        <TouchableOpacity onPress={() => navigation.navigate('StudentSavedMaterials')}>
          <Text style={styles.link}>Saved</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('StudentHistory')}>
          <Text style={styles.link}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('StudentStarred')}>
          <Text style={styles.link}>Starred</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('BrowseMaterials')}>
          <Text style={styles.link}>Browse</Text>
        </TouchableOpacity>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  button: {
    backgroundColor: COLORS.student,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 28 },
  link: { color: COLORS.primary, fontWeight: '600' },
});

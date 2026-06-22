/**
 * components/RoleSwitchButton.jsx — StudyShala Dark Theme
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { C, R, T } from './theme';

export default function RoleSwitchButton({ targetRole, style }) {
  const { switchRole, switchingRole } = useAuth();

  const label = targetRole === 'faculty' ? 'Switch to Faculty' : 'Switch to Student';
  const icon  = targetRole === 'faculty' ? 'easel-outline' : 'school-outline';

  const handlePress = () => {
    Alert.alert(
      label,
      `Switch this account to ${targetRole} mode? You'll see ${targetRole} features instead.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            const result = await switchRole(targetRole);
            if (!result.success) {
              Alert.alert('Switch failed', result.error || 'Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[s.btn, style]}
      onPress={handlePress}
      disabled={switchingRole}
      activeOpacity={0.8}
    >
      {switchingRole ? (
        <ActivityIndicator size="small" color={C.accent} />
      ) : (
        <>
          <Ionicons name={icon} size={16} color={C.accent} />
          <Text style={s.text}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.accentBg,
    borderRadius: R.sm,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: C.accent + '40',
  },
  text: { fontSize: T.sm, fontWeight: '700', color: C.accent },
});
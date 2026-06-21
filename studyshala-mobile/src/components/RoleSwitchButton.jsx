/**
 * components/RoleSwitchButton.jsx
 * ==================================
 * Lets a logged-in user flip between Student and Faculty views without
 * a visible login screen. Calls AuthContext.switchRole(), which silently
 * re-authenticates the cached Google session against the OTHER role
 * (see AuthContext.jsx for why — backend stores one role per account).
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function RoleSwitchButton({ targetRole, style }) {
  const { switchRole, switchingRole } = useAuth();

  const label = targetRole === 'faculty' ? 'Switch to Faculty' : 'Switch to Student';
  const icon = targetRole === 'faculty' ? 'easel-outline' : 'school-outline';

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
      style={[styles.btn, style]}
      onPress={handlePress}
      disabled={switchingRole}
      activeOpacity={0.75}
    >
      {switchingRole ? (
        <ActivityIndicator size="small" color="#4F46E5" />
      ) : (
        <>
          <Ionicons name={icon} size={16} color="#4F46E5" />
          <Text style={styles.text}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
});

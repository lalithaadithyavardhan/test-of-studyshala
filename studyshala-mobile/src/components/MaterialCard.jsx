/**
 * components/MaterialCard.jsx
 * =============================
 * Renders a material/folder summary exactly as returned by
 * getSavedMaterials() and getAccessHistory() in your real
 * studentController.js:
 *   { _id, subjectName, department, semester, facultyName, accessCode,
 *     fileCount, messageToStudents, subFolderCount, savedAt|accessedAt,
 *     createdAt, isSaved? }
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MaterialCard({ material, onPress, onRemove, removeLabel }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(material)} activeOpacity={0.8}>
      <View style={styles.headerRow}>
        <View style={styles.subjectBadge}>
          <Ionicons name="folder" size={16} color="#4F46E5" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.subject} numberOfLines={1}>
            {material.subjectName}
          </Text>
          <Text style={styles.subMeta} numberOfLines={1}>
            {material.department} · Sem {material.semester}
          </Text>
        </View>
        {onRemove && (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => onRemove(material)}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.faculty} numberOfLines={1}>
          👤 {material.facultyName}
        </Text>
        <Text style={styles.fileCount}>
          {material.fileCount} file{material.fileCount === 1 ? '' : 's'}
        </Text>
      </View>

      {!!material.messageToStudents && (
        <Text style={styles.message} numberOfLines={2}>
          💬 {material.messageToStudents}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  subject: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  subMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faculty: { fontSize: 12, color: '#6B7280', flex: 1 },
  fileCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  message: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

/**
 * components/MaterialCard.jsx
 * =============================
 * Shared card used by SavedMaterialsScreen, HistoryScreen (student side)
 * and FacultyDashboardScreen / FacultyMaterialsScreen (faculty side).
 * `role` toggles which action buttons show.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MaterialCard({
  material,
  onPress,
  onRemove,
  role = 'student', // 'student' | 'faculty'
  onUpload,
  onMessage,
  onDelete,
  onShare,
}) {
  const [copied, setCopied] = useState(false);
  const code = material.accessCode || material.departmentCode;
  const hasMsg = !!material.messageToStudents?.trim();
  const sfCount = material.subFolderCount ?? material.subFolders?.length ?? 0;
  const rootFiles = material.files?.length ?? 0;
  const totalFiles =
    material.fileCount ??
    rootFiles + (material.subFolders || []).reduce((s, sf) => s + (sf.files?.length || 0), 0);

  const copyCode = () => {
    if (!code) return;
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => onPress?.(material)} activeOpacity={0.7}>
        <View style={styles.headerRow}>
          <View style={styles.iconBox}>
            <Ionicons name="book" size={18} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{material.subjectName}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {material.facultyName} · {material.department} · Sem {material.semester}
            </Text>
          </View>
          {hasMsg && (
            <View style={styles.msgBadge}>
              <Ionicons name="megaphone" size={11} color="#92400E" />
            </View>
          )}
        </View>

        <Text style={styles.filesLine}>
          {totalFiles} file{totalFiles !== 1 ? 's' : ''}
          {sfCount > 0 ? ` · ${sfCount} folder${sfCount !== 1 ? 's' : ''}` : ''}
        </Text>

        {hasMsg && (
          <Text style={styles.msgPreview} numberOfLines={2}>
            💬 {material.messageToStudents}
          </Text>
        )}

        {!!code && (
          <TouchableOpacity style={styles.codeRow} onPress={copyCode} activeOpacity={0.7}>
            <Text style={styles.code}>{code}</Text>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={15} color={copied ? '#10B981' : '#9CA3AF'} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* ── Actions ── */}
      <View style={styles.actionsRow}>
        {role === 'student' && onRemove && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => onRemove(material)}>
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Remove</Text>
          </TouchableOpacity>
        )}
        {role === 'faculty' && (
          <>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onUpload?.(material)}>
              <Ionicons name="cloud-upload-outline" size={15} color="#4F46E5" />
              <Text style={[styles.actionText, { color: '#4F46E5' }]}>Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onMessage?.(material)}>
              <Ionicons name="megaphone-outline" size={15} color="#0891B2" />
              <Text style={[styles.actionText, { color: '#0891B2' }]}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onShare?.(material)}>
              <Ionicons name="share-social-outline" size={15} color="#16A34A" />
              <Text style={[styles.actionText, { color: '#16A34A' }]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete?.(material)}>
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
              <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  meta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  msgBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 4,
  },
  filesLine: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  msgPreview: {
    fontSize: 12, color: '#4338CA', backgroundColor: '#EEF2FF',
    borderRadius: 8, padding: 8, marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 10,
  },
  code: { fontFamily: 'monospace', fontSize: 13, fontWeight: '700', color: '#374151', letterSpacing: 1 },
  actionsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    gap: 14,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, fontWeight: '600' },
});

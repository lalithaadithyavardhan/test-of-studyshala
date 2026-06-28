/**
 * components/MaterialCard.jsx — StudyShala Dark Theme
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from './theme';

export default function MaterialCard({
  material,
  onPress,
  onRemove,
  role = 'student',
  onUpload,
  onMessage,
  onDelete,
  onShare,
  offlineStatus, // 'saved' | 'synced' | null
}) {
  const [copied, setCopied] = useState(false);
  const code      = material.accessCode || material.departmentCode;
  const hasMsg    = !!material.messageToStudents?.trim();
  const sfCount   = material.subFolderCount ?? material.subFolders?.length ?? 0;
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
    <View style={s.card}>
      <TouchableOpacity onPress={() => onPress?.(material)} activeOpacity={0.7}>

        {/* ── Header row ── */}
        <View style={s.headerRow}>
          <View style={s.iconBox}>
            <Ionicons name="book" size={18} color={C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title} numberOfLines={1}>{material.subjectName}</Text>
            <Text style={s.meta} numberOfLines={1}>
              {material.facultyName} · {material.department} · Sem {material.semester}
            </Text>
          </View>
          {hasMsg && (
            <View style={s.msgBadge}>
              <Ionicons name="megaphone" size={11} color={C.accent} />
            </View>
          )}
        </View>

        {/* ── Files / folders count ── */}
        <Text style={s.filesLine}>
          {totalFiles} file{totalFiles !== 1 ? 's' : ''}
          {sfCount > 0 ? ` · ${sfCount} folder${sfCount !== 1 ? 's' : ''}` : ''}
        </Text>

        {/* ── Offline status badge ── */}
        {offlineStatus === 'saved' && (
          <View style={s.offlineBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#4ade80" />
            <Text style={s.offlineBadgeText}>Saved Offline</Text>
          </View>
        )}

        {/* ── Message preview ── */}
        {hasMsg && (
          <Text style={s.msgPreview} numberOfLines={2}>
            💬 {material.messageToStudents}
          </Text>
        )}

        {/* ── Access code row ── */}
        {!!code && (
          <TouchableOpacity style={s.codeRow} onPress={copyCode} activeOpacity={0.7}>
            <Text style={s.code}>{code}</Text>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={15}
              color={copied ? C.success : C.textSecondary}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* ── Actions ── */}
      <View style={s.actionsRow}>
        {role === 'student' && onRemove && (
          <TouchableOpacity style={s.actionBtn} onPress={() => onRemove(material)}>
            <Ionicons name="trash-outline" size={15} color={C.danger} />
            <Text style={[s.actionText, { color: C.danger }]}>Remove</Text>
          </TouchableOpacity>
        )}
        {role === 'faculty' && (
          <>
            <TouchableOpacity style={s.actionBtn} onPress={() => onUpload?.(material)}>
              <Ionicons name="cloud-upload-outline" size={15} color={C.accent} />
              <Text style={[s.actionText, { color: C.accent }]}>Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => onMessage?.(material)}>
              <Ionicons name="megaphone-outline" size={15} color={C.textSecondary} />
              <Text style={[s.actionText, { color: C.textSecondary }]}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => onShare?.(material)}>
              <Ionicons name="share-social-outline" size={15} color={C.textSecondary} />
              <Text style={[s.actionText, { color: C.textSecondary }]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => onDelete?.(material)}>
              <Ionicons name="trash-outline" size={15} color={C.danger} />
              <Text style={[s.actionText, { color: C.danger }]}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: R.xs,
    backgroundColor: C.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title:    { fontSize: T.md, fontWeight: '700', color: C.textPrimary },
  meta:     { fontSize: T.xs, color: C.textSecondary, marginTop: 2 },
  msgBadge: {
    backgroundColor: C.accentBg,
    borderRadius: R.xs,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.accent + '40',
  },
  filesLine: { fontSize: T.sm, color: C.textMuted, marginBottom: 6 },
  msgPreview: {
    fontSize: T.sm,
    color: C.textSecondary,
    backgroundColor: C.elevated,
    borderRadius: R.xs,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.elevated,
    borderRadius: R.xs,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: T.base,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: 1.5,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 16,
  },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'flex-start', marginBottom: 6,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)',
  },
  offlineBadgeText: { fontSize: 11, color: '#4ade80', fontWeight: '600' },
  actionText: { fontSize: T.sm, fontWeight: '600' },
});
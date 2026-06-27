/**
 * components/FileListItem.jsx — StudyShala Dark Theme
 * Dark base #0f0f0f · Accent #e87c3a
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R, T } from './theme';

const getFileIconName = (mimeType = '') => {
  if (mimeType.includes('pdf'))                                    return 'document-text';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('excel'))   return 'grid';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'easel';
  if (mimeType.includes('image'))  return 'image';
  if (mimeType.includes('video'))  return 'videocam';
  if (mimeType.includes('audio'))  return 'musical-notes';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
  return 'document-attach';
};

const getFileIconColor = (mimeType = '') => {
  if (mimeType.includes('pdf'))                                    return '#EF4444';
  if (mimeType.includes('word') || mimeType.includes('document')) return '#3B82F6';
  if (mimeType.includes('sheet') || mimeType.includes('excel'))   return '#22C55E';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return C.accent;
  if (mimeType.includes('image')) return '#A78BFA';
  if (mimeType.includes('video')) return '#EC4899';
  return C.textSecondary;
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export default function FileListItem({
  file,
  onPress,
  onStarPress,
  isStarred,
  showStar = true,
  onDeletePress,
}) {
  const iconColor = getFileIconColor(file.mimeType);

  return (
    <TouchableOpacity
      style={s.row}
      onPress={() => onPress?.(file)}
      activeOpacity={0.7}
    >
      {/* ── File type icon ── */}
      <View style={[s.iconBox, { backgroundColor: iconColor + '1A' }]}>
        <Ionicons name={getFileIconName(file.mimeType)} size={20} color={iconColor} />
      </View>

      {/* ── Name + meta ── */}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{file.name}</Text>
        {!!file.size && (
          <Text style={s.meta}>
            {formatFileSize(file.size)}
            {file.uploadedAt ? ` · ${new Date(file.uploadedAt).toLocaleDateString()}` : ''}
          </Text>
        )}
      </View>

      {/* ── Star ── */}
      {showStar && (
        <TouchableOpacity
          onPress={() => onStarPress?.(file)}
          style={s.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isStarred ? 'star' : 'star-outline'}
            size={20}
            color={isStarred ? C.accent : C.textMuted}
          />
        </TouchableOpacity>
      )}

      {/* ── Delete ── */}
      {onDeletePress && (
        <TouchableOpacity
          onPress={() => onDeletePress(file)}
          style={s.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={19} color={C.danger} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: R.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  info:   { flex: 1 },
  name:   { fontSize: T.base, fontWeight: '600', color: C.textPrimary },
  meta:   { fontSize: T.xs, color: C.textMuted, marginTop: 2 },
  iconBtn: { padding: 6, marginLeft: 4 },
});
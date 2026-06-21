/**
 * components/FileListItem.jsx
 * =============================
 * Shared row used by Dashboard (recent files), MaterialAccess, Starred,
 * and Faculty file browsing. Mirrors the file-icon-by-mimeType pattern
 * from the website's StudentDashboard.jsx / StudentStarred.jsx.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const getFileIconName = (mimeType = '') => {
  if (mimeType.includes('pdf')) return 'document-text';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'grid';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'easel';
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('video')) return 'videocam';
  if (mimeType.includes('audio')) return 'musical-notes';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
  return 'document-attach';
};

const getFileIconColor = (mimeType = '') => {
  if (mimeType.includes('pdf')) return '#EF4444';
  if (mimeType.includes('word') || mimeType.includes('document')) return '#2563EB';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '#16A34A';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '#EA580C';
  if (mimeType.includes('image')) return '#8B5CF6';
  if (mimeType.includes('video')) return '#DB2777';
  return '#6B7280';
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
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress?.(file)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: `${getFileIconColor(file.mimeType)}1A` }]}>
        <Ionicons name={getFileIconName(file.mimeType)} size={20} color={getFileIconColor(file.mimeType)} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{file.name}</Text>
        {!!file.size && (
          <Text style={styles.meta}>
            {formatFileSize(file.size)}
            {file.uploadedAt ? ` · ${new Date(file.uploadedAt).toLocaleDateString()}` : ''}
          </Text>
        )}
      </View>
      {showStar && (
        <TouchableOpacity
          onPress={() => onStarPress?.(file)}
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isStarred ? 'star' : 'star-outline'}
            size={20}
            color={isStarred ? '#F59E0B' : '#D1D5DB'}
          />
        </TouchableOpacity>
      )}
      {onDeletePress && (
        <TouchableOpacity
          onPress={() => onDeletePress(file)}
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={19} color="#EF4444" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  meta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  iconBtn: { padding: 6, marginLeft: 4 },
});

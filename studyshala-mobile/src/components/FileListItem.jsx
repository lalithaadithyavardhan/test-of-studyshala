/**
 * components/FileListItem.jsx
 * =============================
 * Renders a single file exactly as returned by your real backend's
 * mapFile() helper in studentController.js:
 *   { _id, name, mimeType, size, uploadedAt, driveFileId,
 *     downloadCount, previewUrl, downloadUrl }
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const getFileIcon = (mimeType = '') => {
  if (mimeType.includes('pdf')) return { name: 'document-text', color: '#EF4444' };
  if (mimeType.includes('image')) return { name: 'image', color: '#8B5CF6' };
  if (mimeType.includes('video')) return { name: 'videocam', color: '#F59E0B' };
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return { name: 'easel', color: '#F97316' };
  if (mimeType.includes('sheet') || mimeType.includes('excel'))
    return { name: 'grid', color: '#10B981' };
  if (mimeType.includes('word') || mimeType.includes('document'))
    return { name: 'document', color: '#3B82F6' };
  return { name: 'document-outline', color: '#6B7280' };
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FileListItem({
  file,
  onPress,
  onStarPress,
  isStarred,
  showStar = true,
}) {
  const icon = getFileIcon(file.mimeType);

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(file)} activeOpacity={0.7}>
      <View style={[styles.iconBox, { backgroundColor: `${icon.color}1A` }]}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.meta}>
          {formatSize(file.size)}
          {file.size ? ' · ' : ''}
          {file.downloadCount || 0} downloads
        </Text>
      </View>
      {showStar && (
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => onStarPress(file)}
          style={styles.starBtn}
        >
          <Ionicons
            name={isStarred ? 'star' : 'star-outline'}
            size={20}
            color={isStarred ? '#F59E0B' : '#9CA3AF'}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  meta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  starBtn: { paddingLeft: 8 },
});

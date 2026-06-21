/**
 * utils/fileActions.js
 * =====================
 * Shared logic for opening a file from a student screen.
 *
 * Your real backend (studentController.js v3) builds two URLs per file:
 *   previewUrl:  https://drive.google.com/file/d/<id>/preview
 *   downloadUrl: https://drive.usercontent.google.com/download?id=<id>&...
 *
 * Files are "anyoneWithLink" on Drive (per the code comment), so on
 * mobile the simplest, most reliable approach is to open previewUrl in
 * the system browser / WebBrowser — no backend proxy needed, same as
 * the website's redirect-based download.
 */
import * as WebBrowser from 'expo-web-browser';
import { Linking, Alert } from 'react-native';
import { trackRecentFile } from '../api/studentApi';

/**
 * Open a file for viewing. Also fires the recent-files tracking call,
 * matching the website's behavior of calling trackRecentFile on preview/open.
 */
export const openFile = async (file, material) => {
  try {
    // Fire-and-forget — don't block opening the file on this succeeding
    trackRecentFile({
      fileId: file._id,
      fileName: file.name,
      mimeType: file.mimeType,
      materialId: material._id,
      subjectName: material.subjectName,
    }).catch(() => {});

    const url = file.previewUrl || file.downloadUrl;
    if (!url) {
      Alert.alert('Unavailable', 'This file is not available on Drive yet.');
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  } catch (e) {
    Alert.alert('Could not open file', e.message || 'Please try again.');
  }
};

/**
 * Download a file directly (opens Drive's direct download URL in the
 * system browser, which triggers the OS-level download/save flow).
 */
export const downloadFile = async (file) => {
  try {
    if (!file.downloadUrl) {
      Alert.alert('Unavailable', 'This file is not available on Drive yet.');
      return;
    }
    const supported = await Linking.canOpenURL(file.downloadUrl);
    if (supported) {
      await Linking.openURL(file.downloadUrl);
    } else {
      await WebBrowser.openBrowserAsync(file.downloadUrl);
    }
  } catch (e) {
    Alert.alert('Download failed', e.message || 'Please try again.');
  }
};

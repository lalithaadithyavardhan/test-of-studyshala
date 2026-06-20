import Constants from 'expo-constants';

// Pulled from app.json -> expo.extra at build time.
// Update these values in app.json, not here.
export const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000/api';
export const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId || '';

// Brand colors — keep in sync with studyshalaFrontend/src/styles (adjust to match your actual palette)
export const COLORS = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  success: '#16A34A',
  danger: '#DC2626',
  student: '#2563EB',
  faculty: '#7C3AED',
  admin: '#DC2626',
};

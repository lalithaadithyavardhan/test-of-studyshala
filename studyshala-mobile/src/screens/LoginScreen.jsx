import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_AUTH_URL, API_BASE_URL } from '../config/config';

WebBrowser.maybeCompleteAuthSession();

const parseCallbackUrl = (url) => {
  try {
    const marker = 'auth-callback';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const queryStart = url.indexOf('?', idx);
    if (queryStart === -1) return null;
    const params = new URLSearchParams(url.substring(queryStart + 1));
    const token = params.get('token');
    const userJson = params.get('user');
    const error = params.get('error');
    if (error) return { error };
    if (token && userJson) {
      const userData = JSON.parse(decodeURIComponent(userJson));
      return { token, userData };
    }
    return null;
  } catch (e) {
    return null;
  }
};

export default function LoginScreen() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const isPlaceholderUrl = API_BASE_URL.includes('YOUR_BACKEND');

  const handleGoogleLogin = async () => {
    if (isPlaceholderUrl) {
      Alert.alert(
        'Backend URL not set',
        'Open src/config/config.js and set API_BASE_URL to your real Render backend URL before logging in.'
      );
      return;
    }

    setLoading(true);
    try {
      // Append platform=mobile so the backend knows where to redirect
      const authUrl = `${GOOGLE_AUTH_URL}?platform=mobile`;
      
      // Tell WebBrowser to wait for your app's custom scheme
      const returnUrl = Linking.createURL('auth-callback'); 

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        returnUrl,
        { showInRecents: true }
      );

      if (result.type === 'success' && result.url) {
        const parsed = parseCallbackUrl(result.url);
        if (parsed?.error) {
          Alert.alert('Sign-in failed', `Error: ${parsed.error}`);
        } else if (parsed?.token && parsed?.userData) {
          await login(parsed.userData, parsed.token);
        } else {
          Alert.alert(
            'Sign-in incomplete',
            "We couldn't read the login result. Please try again."
          );
        }
      }
    } catch (e) {
      Alert.alert('Sign-in error', e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>📚</Text>
        </View>
        <Text style={styles.title}>StudyShala</Text>
        <Text style={styles.subtitle}>
          Empowering education through seamless material sharing
        </Text>

        {isPlaceholderUrl && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Backend URL not configured. Edit{' '}
              <Text style={styles.warningCode}>src/config/config.js</Text>
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.googleButton, loading && styles.googleButtonDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#374151" />
          ) : (
            <>
              <View style={styles.googleIconBox}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Sign in with your college Google account to access your study
          materials.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  logoCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  logoEmoji: { fontSize: 40 },
  title: { fontSize: 30, fontWeight: '800', color: '#1F2937', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 36, lineHeight: 21 },
  warningBox: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 20, width: '100%' },
  warningText: { color: '#92400E', fontSize: 13, lineHeight: 18 },
  warningCode: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700' },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, width: '100%', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  googleButtonDisabled: { opacity: 0.7 },
  googleIconBox: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  googleG: { color: '#fff', fontWeight: '800', fontSize: 13 },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  footnote: { marginTop: 22, fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 12 },
});
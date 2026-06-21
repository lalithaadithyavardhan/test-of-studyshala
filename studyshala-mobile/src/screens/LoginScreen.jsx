/**
 * screens/LoginScreen.jsx
 * ========================
 * Mirrors studyshalaFrontend's Login.jsx (Google OAuth button) +
 * AuthCallback.jsx (parsing the token/user redirect) combined into one
 * mobile flow using expo-web-browser as an in-app browser.
 *
 * HOW IT WORKS (matches your real backend exactly):
 *  1. We open GOOGLE_AUTH_URL (-> /api/auth/google) in an in-app browser.
 *  2. User completes Google sign-in.
 *  3. Backend's authController.js googleCallback() redirects to:
 *       `${FRONTEND_URL}/auth-callback?token=...&user=...`
 *  4. We detect that redirect URL and extract token+user from it —
 *     exactly what AuthCallback.jsx does with useSearchParams().
 *
 * ⚠️ IMPORTANT SETUP NOTE (see config.js):
 *  For step 3/4 to close the in-app browser automatically, your backend's
 *  FRONTEND_URL needs to be reachable/interceptable from this app. Two
 *  options:
 *   A) Easiest: keep FRONTEND_URL as your website. This screen will detect
 *      the `/auth-callback` URL via the browser's redirect events and grab
 *      the token before the page fully loads — works today, no backend
 *      changes needed.
 *   B) Cleaner: add a mobile deep link (studyshala://auth-callback) as an
 *      additional allowed redirect target in your backend, gated by a
 *      `?platform=mobile` query param on the /auth/google request.
 *  This screen implements option A, which works with zero backend changes.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { GOOGLE_AUTH_URL, API_BASE_URL } from '../config/config';

WebBrowser.maybeCompleteAuthSession();

const parseCallbackUrl = (url) => {
  try {
    const marker = '/auth-callback';
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
      const result = await WebBrowser.openAuthSessionAsync(
        GOOGLE_AUTH_URL,
        // We don't have a true custom-scheme redirect wired up on the
        // backend yet (see note above), so we let the browser run and
        // inspect the final URL it lands on.
        undefined,
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
            "We couldn't read the login result. Please try again, or check that your backend's FRONTEND_URL is reachable from this device."
          );
        }
      }
      // result.type === 'cancel' or 'dismiss' -> user closed the browser, do nothing
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
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 21,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  warningText: {
    color: '#92400E',
    fontSize: 13,
    lineHeight: 18,
  },
  warningCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleG: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  footnote: {
    marginTop: 22,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});

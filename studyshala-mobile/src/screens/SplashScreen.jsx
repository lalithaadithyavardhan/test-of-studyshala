/**
 * screens/SplashScreen.jsx — StudyShala Dark Theme
 *
 *   Background  #13120f  warm dark (not cold black)
 *   Surface     #1e1c19  warm card surface
 *   Border      #2e2c28  normal border
 *   BorderSub   #2a2724  subtle divider
 *   Accent      #DE7356  Claude Peach / terra-cotta (primary)
 *   Secondary   #B1ADA1  Cloudy warm stone (secondary / faculty role)
 *   TextPrimary #e8e4de  warm white
 *   TextSec     #b1ada1  warm gray
 *   TextMuted   #6b6760  readable dim
 *
 * NOTE: these hex values live in ../components/theme.js (the C object).
 * This file only *references* C.bg / C.accent / etc — send me theme.js
 * if you want it edited directly so these actually resolve to the values above.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Animated, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, R, T } from '../components/theme';

export default function SplashScreen() {
  const scale   = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <Animated.View style={[s.content, { opacity, transform: [{ scale }] }]}>

        {/* ── Logo block ── */}
        <View style={s.logoWrap}>
          <View style={s.logoBox}>
            <Image
              source={require('../../assets/logo.png')}
              style={s.logoImage}
              resizeMode="cover"
            />
          </View>
          {/* Accent dot cluster — mirrors the app's accent palette */}
          <View style={[s.dot, s.dot1]} />
          <View style={[s.dot, s.dot2]} />
          <View style={[s.dot, s.dot3]} />
        </View>

        <Text style={s.title}>StudyShala</Text>
        <Text style={s.tagline}>Your study companion</Text>

        <ActivityIndicator size="small" color={C.accent} style={{ marginTop: 40 }} />
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content:   { flex: 1, alignItems: 'center', justifyContent: 'center' },

  logoWrap: {
    position: 'relative',
    width: 100,
    height: 100,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },

  // Decorative corner dots
  dot: {
    position: 'absolute',
    borderRadius: R.pill,
    backgroundColor: C.accent,
  },
  dot1: { top: 4,    right: 4,  width: 14, height: 14, opacity: 1   },
  dot2: { bottom: 6, right: 0,  width: 10, height: 10, opacity: 0.5 },
  dot3: { bottom: 0, left: 6,   width: 8,  height: 8,  opacity: 0.3 },

  title: {
    fontSize: T.xxl + 8,   // 32px
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: T.md,
    color: C.textSecondary,
    marginTop: 6,
  },
});
/**
 * components/ServerStatusBanner.jsx
 * ====================================
 * Small floating status pill, absolutely positioned near the top-right of
 * the screen. Unlike the previous version, this does NOT sit in normal
 * document flow — it overlays on top of whatever screen is showing, so it
 * never pushes your header down, never shrinks it, and never affects any
 * screen's layout. Pure overlay, zero footprint when not visible.
 *
 * Renders nothing for 'online' and 'offline' (see ServerStatusContext for
 * why 'offline' stays silent — likely just no internet, not a cold start).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from './theme';
import { useServerStatus } from '../context/ServerStatusContext';

const COPY = {
  checking: 'Connecting…',
  waking:   'Waking server…',
};

export default function ServerStatusBanner() {
  const { status } = useServerStatus();
  const insets = useSafeAreaInsets();
  const visible = status === 'checking' || status === 'waking';

  // Keep rendering the last visible copy while it fades out, so the pill
  // doesn't blank out mid-animation.
  const [displayStatus, setDisplayStatus] = useState(status);
  useEffect(() => {
    if (visible) setDisplayStatus(status);
  }, [status, visible]);

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true, // opacity + transform only, native driver is fine here
    }).start();
  }, [visible]);

  const opacity = anim;
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.pill,
        {
          top: insets.top + 8,
          opacity,
          transform: [{ scale }, { translateY }],
        },
      ]}
    >
      <ActivityIndicator size="small" color={C.accent} />
      <Text style={s.text} numberOfLines={1}>
        {COPY[displayStatus] || ''}
      </Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 16,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  text: {
    fontSize: T.sm,
    color: C.textSecondary,
    fontWeight: '600',
  },
});
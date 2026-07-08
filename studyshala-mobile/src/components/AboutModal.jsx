import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Pressable, ScrollView, Linking, Alert as RNAlert,
  Animated, Easing, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Adjust this path to wherever app-icon-1024.png actually lives in your project
const APP_ICON = require('../../assets/app-icon-1024.png');

const C = {
  bg: '#0f0e0c', surface: '#1a1814', elevated: '#25221e', border: '#2a2622',
  accent: '#DE7356', accentBg: 'rgba(222,115,86,0.12)', accentBorder: 'rgba(222,115,86,0.3)',
  textPrimary: '#f0ece6', textSec: '#c4bfb8', textMuted: '#8a857d', white: '#ffffff',
  gradientStart: '#DE7356', gradientEnd: '#E8956A',
};

const DEV_GITHUB = 'https://github.com/lalithaadithyavardhan';
const DEV_EMAIL  = 'borraadhitya@gmail.com';

const HOW_TO_USE = [
  { icon: 'key-outline',         title: 'Enter Access Code',    desc: 'Get a code from your faculty and enter it to unlock their materials.' },
  { icon: 'folder-open-outline', title: 'Browse Materials',     desc: 'View PDFs, slides, and docs shared by your faculty in one place.' },
  { icon: 'bookmark-outline',    title: 'Save Materials',       desc: 'Save any material to your library for quick access later.' },
  { icon: 'cloud-download-outline', title: 'Save Offline',      desc: 'Download materials to read without internet anytime.' },
  { icon: 'star-outline',        title: 'Star Files',           desc: 'Star important files so you can find them instantly.' },
  { icon: 'time-outline',        title: 'Track History',        desc: 'See recently opened materials and pick up right where you left off.' },
];

const STACK = [
  { icon: 'logo-react',     text: 'React Native + Expo',       color: '#61dafb' },
  { icon: 'server-outline', text: 'Node.js + Express',         color: '#68a063' },
  { icon: 'logo-nodejs',    text: 'MongoDB (Database)',        color: '#4db33d' },
  { icon: 'cloud-outline',  text: 'Google Drive API',          color: '#4285f4' },
  { icon: 'logo-google',    text: 'Google OAuth Login',        color: '#ea4335' },
];

export default function AboutModal({ visible, onClose }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);

  const openGitHub = () => {
    Linking.openURL(DEV_GITHUB).catch(() =>
      RNAlert.alert('Could not open', 'Check your internet connection.')
    );
  };

  const openMail = () => {
    const uri = `mailto:${DEV_EMAIL}?subject=${encodeURIComponent('Hello — StudyShala')}`;
    Linking.openURL(uri).catch(() =>
      RNAlert.alert('No mail app found', 'Email us at ' + DEV_EMAIL)
    );
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={s.backdrop} onPress={onClose}>
        <Animated.View style={[s.cardContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Pressable style={s.card} onPress={() => {}}>
            <ScrollView
              style={s.scrollView}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <View style={s.handle} />
              
              {/* ── App Header ── */}
              <View style={s.appHeader}>
                <View style={s.appIconContainer}>
                  <View style={s.appIconShadow} />
                  <Image
                    source={APP_ICON}
                    style={s.appIconImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.appName}>StudyShala</Text>
                  <Text style={s.appTagline}>Study smarter, not harder.</Text>
                </View>
                <View style={s.versionBadge}>
                  <Text style={s.versionText}>v1.0</Text>
                </View>
              </View>

              {/* ── Developer ── */}
              <Text style={s.sectionLabel}>DEVELOPER</Text>
              <View style={s.devBox}>
                <View style={s.devInfo}>
                  <Text style={s.devName}>Developed by Adhitya Borra</Text>
                  <Text style={s.devRole}>Student · Full-stack Developer</Text>
                </View>

                {/* GitHub */}
                <TouchableOpacity style={s.contactRow} onPress={openGitHub} activeOpacity={0.8}>
                  <View style={s.contactLeft}>
                    <View style={s.iconCircle}>
                      <Ionicons name="logo-github" size={18} color={C.textPrimary} />
                    </View>
                    <View>
                      <Text style={s.contactHandle}>lalithaadithyavardhan</Text>
                      <Text style={s.contactMeta}>github.com</Text>
                    </View>
                  </View>
                  <View style={s.openBtn}>
                    <Ionicons name="open-outline" size={14} color={C.bg} />
                    <Text style={s.openBtnText}>Open</Text>
                  </View>
                </TouchableOpacity>

                {/* Email */}
                <TouchableOpacity style={[s.contactRow, s.contactRowBorder]} onPress={openMail} activeOpacity={0.8}>
                  <View style={s.contactLeft}>
                    <View style={[s.iconCircle, { backgroundColor: C.accentBg }]}>
                      <Ionicons name="mail-outline" size={18} color={C.accent} />
                    </View>
                    <View>
                      <Text style={[s.contactHandle, { color: C.accent }]}>borraadhitya</Text>
                      <Text style={s.contactMeta}>@gmail.com</Text>
                    </View>
                  </View>
                  <View style={[s.openBtn, s.openBtnOutline]}>
                    <Ionicons name="mail-outline" size={14} color={C.accent} />
                    <Text style={[s.openBtnText, { color: C.accent }]}>Contact</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* ── Description ── */}
              <Text style={s.appDesc}>
                StudyShala is a material-sharing platform built for students and faculty. Faculty upload study materials — PDFs, slides, and documents — and share them with students using a simple access code. No WhatsApp groups, no email chains. Everything in one place.
              </Text>

              <View style={s.divider} />

              {/* ── How to Use ── */}
              <Text style={s.sectionLabel}>HOW TO USE</Text>
              {HOW_TO_USE.map((step, i) => (
                <View key={i} style={s.stepRow}>
                  <View style={s.stepNum}>
                    <Text style={s.stepNumText}>{i + 1}</Text>
                  </View>
                  <View style={s.stepIconBox}>
                    <Ionicons name={step.icon} size={18} color={C.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stepTitle}>{step.title}</Text>
                    <Text style={s.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}

              <View style={s.divider} />

              {/* ── Built With ── */}
              <Text style={s.sectionLabel}>BUILT WITH</Text>
              <View style={s.stackGrid}>
                {STACK.map((item, i) => (
                  <View key={i} style={s.stackItem}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                    <Text style={s.stackText}>{item.text}</Text>
                  </View>
                ))}
              </View>

              <View style={s.divider} />

              {/* Footer */}
              <Text style={s.footerLine}>© {new Date().getFullYear()} StudyShala · Built by Adithya</Text>

              <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={s.closeBtnText}>Close</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  cardContainer: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
  },
  card: {
    backgroundColor: C.surface,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  appIconContainer: {
    position: 'relative',
  },
  appIconImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  appIconShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: 'rgba(222,115,86,0.2)',
    borderRadius: 16,
    zIndex: -1,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 14,
    color: C.textSec,
    marginTop: 2,
    fontWeight: '500',
  },
  versionBadge: {
    backgroundColor: C.elevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  versionText: {
    fontSize: 12,
    color: C.textSec,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 1.5,
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 12,
  },
  devBox: {
    backgroundColor: C.elevated,
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  devInfo: {
    marginBottom: 16,
  },
  devName: {
    fontSize: 18,
    fontWeight: '600',
    color: C.textPrimary,
  },
  devRole: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  contactRowBorder: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 8,
    paddingTop: 16,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  contactHandle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
  },
  contactMeta: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 1,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  openBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.accentBorder,
  },
  openBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.bg,
  },
  appDesc: {
    fontSize: 15,
    lineHeight: 22,
    color: C.textSec,
    paddingHorizontal: 24,
    marginTop: 20,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 24,
    marginTop: 24,
    opacity: 0.6,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: C.accentBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
  },
  stepIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 13,
    color: C.textSec,
    lineHeight: 18,
  },
  stackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 8,
  },
  stackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.elevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
    minWidth: '48%',
  },
  stackText: {
    fontSize: 13,
    color: C.textSec,
    fontWeight: '500',
  },
  footerLine: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '500',
  },
  closeBtn: {
    backgroundColor: C.accent,
    marginHorizontal: 24,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.white,
  },
});
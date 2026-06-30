import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Pressable, ScrollView, Linking, Alert as RNAlert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg: '#13120f', surface: '#1e1c19', elevated: '#2a2724', border: '#2e2c28',
  accent: '#DE7356', accentBg: 'rgba(222,115,86,0.09)', accentBorder: 'rgba(222,115,86,0.25)',
  textPrimary: '#e8e4de', textSec: '#b1ada1', textMuted: '#6b6760', white: '#ffffff',
};

const DEV_GITHUB = 'https://github.com/lalithaadithyavardhan';
const DEV_EMAIL  = 'adithyasai533@gmail.com';

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
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

            <View style={s.handle} />
             {/* ── App Header ── */}
            <View style={s.appHeader}>
              <View style={s.appIcon}>
                <Text style={s.appIconText}>S</Text>
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
                <Text style={s.devName}>Developed by Adithya</Text>
                <Text style={s.devRole}>Student · Full-stack Developer</Text>
              </View>

              {/* GitHub */}
              <View style={s.contactRow}>
                <View style={s.contactLeft}>
                  <Ionicons name="logo-github" size={16} color={C.textPrimary} />
                  <View>
                    <Text style={s.contactHandle}>lalithaadithyavardhan</Text>
                    <Text style={s.contactMeta}>github.com</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.openBtn} onPress={openGitHub} activeOpacity={0.8}>
                  <Ionicons name="open-outline" size={12} color={C.bg} />
                  <Text style={s.openBtnText}>Open</Text>
                </TouchableOpacity>
              </View>

              {/* Email */}
              <View style={[s.contactRow, { borderTopWidth: 1, borderTopColor: C.border, marginTop: 0 }]}>
                <View style={s.contactLeft}>
                  <Ionicons name="mail-outline" size={16} color={C.accent} />
                  <View>
                    <Text style={[s.contactHandle, { color: C.accent }]}>adithyasai533</Text>
                    <Text style={s.contactMeta}>@gmail.com</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[s.openBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.accentBorder }]}
                  onPress={openMail} activeOpacity={0.8}
                >
                  <Ionicons name="mail-outline" size={12} color={C.accent} />
                  <Text style={[s.openBtnText, { color: C.accent }]}>Contact</Text>
                </TouchableOpacity>
              </View>
            </View>

           

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
                  <Ionicons name={step.icon} size={16} color={C.accent} />
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
                  <Ionicons name={item.icon} size={14} color={item.color} />
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

            <View style={{ height: 16 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  card:          { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%', paddingHorizontal: 20 },
  handle:        { width: 36, height: 4, backgroundColor: C.elevated, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 18 },
  divider:       { height: 1, backgroundColor: C.border, marginVertical: 18 },
  sectionLabel:  { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: C.textMuted, textTransform: 'uppercase', marginBottom: 14 },

  // App header
  appHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  appIcon:       { width: 46, height: 46, borderRadius: 13, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, alignItems: 'center', justifyContent: 'center' },
  appIconText:   { fontSize: 22, fontWeight: '900', color: C.accent },
  appName:       { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  appTagline:    { fontSize: 11, color: C.textMuted, marginTop: 2, fontWeight: '500' },
  versionBadge:  { backgroundColor: C.elevated, borderRadius: 6, borderWidth: 1, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 4 },
  versionText:   { fontSize: 11, fontWeight: '700', color: C.textMuted },
  appDesc:       { fontSize: 13, color: C.textSec, lineHeight: 21 },

  // How to use steps
  stepRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  stepNum:       { width: 20, height: 20, borderRadius: 10, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText:   { fontSize: 10, fontWeight: '800', color: C.accent },
  stepIconBox:   { width: 32, height: 32, borderRadius: 9, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepTitle:     { fontSize: 13, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  stepDesc:      { fontSize: 12, color: C.textMuted, lineHeight: 18, fontWeight: '400' },

  // Stack
  stackGrid:     { gap: 10 },
  stackItem:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.elevated, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10 },
  stackText:     { fontSize: 13, color: C.textSec, fontWeight: '500' },

  // Developer
  devBox:        { backgroundColor: C.elevated, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  devInfo:       { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  devName:       { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  devRole:       { fontSize: 11, color: C.textMuted, marginTop: 3, fontWeight: '500' },
  contactRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  contactLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  contactHandle: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  contactMeta:   { fontSize: 11, color: C.textMuted, fontWeight: '500', marginTop: 1 },
  openBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.textPrimary, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  openBtnText:   { fontSize: 11, fontWeight: '700', color: C.bg },

  footerLine:    { fontSize: 11, color: C.textMuted, textAlign: 'center', marginBottom: 14 },
  closeBtn:      { backgroundColor: C.elevated, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingVertical: 13, alignItems: 'center' },
  closeBtnText:  { fontSize: 13, fontWeight: '600', color: C.textSec },
});
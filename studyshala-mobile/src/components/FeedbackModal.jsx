import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Pressable, TextInput, Linking,
  Alert as RNAlert, KeyboardAvoidingView,
  Platform, ScrollView, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg: '#13120f', surface: '#1e1c19', elevated: '#2a2724', border: '#2e2c28',
  accent: '#DE7356', accentBg: 'rgba(222,115,86,0.09)', accentBorder: 'rgba(222,115,86,0.25)',
  textPrimary: '#e8e4de', textSec: '#b1ada1', textMuted: '#6b6760', white: '#ffffff',
};

const DEV_EMAIL = 'adithyasai533@gmail.com';

const CHIPS = ['Bug report', 'Feature request', 'UI/UX', 'Performance', 'Other'];

export default function FeedbackModal({ visible, onClose }) {
  const [fbText,      setFbText]      = useState('');
  const [activeChip,  setActiveChip]  = useState(null);
  const [fbSending,   setFbSending]   = useState(false);

  const handleChip = (chip) => {
    setActiveChip(chip);
    setFbText('');
  };

  const handleClose = () => {
    setFbText('');
    setActiveChip(null);
    Keyboard.dismiss();
    onClose();
  };

  const sendFeedback = useCallback(() => {
    if (!fbText.trim()) return;
    setFbSending(true);
    Keyboard.dismiss();

    const subject = activeChip
      ? `StudyShala Feedback — ${activeChip}`
      : 'StudyShala Feedback';
    const body = fbText.trim();
    const uri = `mailto:${DEV_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    setTimeout(() => {
      Linking.openURL(uri).catch(() =>
        RNAlert.alert('No mail app found', `Please email us directly at ${DEV_EMAIL}`)
      );
      setFbSending(false);
      setFbText('');
      setActiveChip(null);
      onClose();
    }, 300);
  }, [fbText, activeChip, onClose]);

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={s.backdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={s.card}>
                <View style={s.handle} />

                {/* Header */}
                <View style={s.headerRow}>
                  <View style={s.iconBox}>
                    <Ionicons name="chatbox-ellipses" size={18} color={C.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>Give Feedback</Text>
                    <Text style={s.sub}>Your thoughts help improve StudyShala</Text>
                  </View>
                  <TouchableOpacity style={s.closeX} onPress={handleClose}>
                    <Ionicons name="close" size={16} color={C.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={s.divider} />

                {/* Category chips */}
                <Text style={s.chipLabel}>CATEGORY</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipRow}
                  keyboardShouldPersistTaps="always"
                >
                  {CHIPS.map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={[s.chip, activeChip === chip && s.chipActive]}
                      onPress={() => handleChip(chip)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.chipText, activeChip === chip && s.chipTextActive]}>
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Input */}
                <TextInput
                  style={s.input}
                  placeholder={
                    activeChip
                      ? `Describe your ${activeChip.toLowerCase()}…`
                      : 'Type your feedback here…'
                  }
                  placeholderTextColor={C.textMuted}
                  value={fbText}
                  onChangeText={setFbText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  returnKeyType="default"
                  blurOnSubmit={false}
                />

                {/* Note */}
                <View style={s.noteRow}>
                  <Ionicons name="information-circle-outline" size={12} color={C.textMuted} />
                  <Text style={s.noteText}>
                    Tapping "Send" will open your mail app with this message pre-filled.
                  </Text>
                </View>

                {/* Buttons */}
                <View style={s.btnRow}>
                  <TouchableOpacity style={s.btnCancel} onPress={handleClose} activeOpacity={0.8}>
                    <Text style={s.btnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.btnSend, (!fbText.trim() || fbSending) && s.btnDisabled]}
                    onPress={sendFeedback}
                    disabled={!fbText.trim() || fbSending}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={fbSending ? 'hourglass-outline' : 'send'}
                      size={14}
                      color={C.white}
                    />
                    <Text style={s.btnSendText}>
                      {fbSending ? 'Opening…' : 'Send Feedback'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ height: 8 }} />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  flex:        { flex: 1 },
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  card:        { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20 },
  handle:      { width: 36, height: 4, backgroundColor: C.elevated, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  divider:     { height: 1, backgroundColor: C.border, marginVertical: 14 },

  headerRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox:     { width: 40, height: 40, borderRadius: 10, backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBorder, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  sub:         { fontSize: 11, color: C.textMuted, marginTop: 2, fontWeight: '500' },
  closeX:      { width: 30, height: 30, borderRadius: 8, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  chipLabel:   { fontSize: 9, fontWeight: '700', letterSpacing: 1.3, color: C.textMuted, textTransform: 'uppercase', marginBottom: 10 },
  chipRow:     { gap: 7, paddingBottom: 14 },
  chip:        { backgroundColor: C.elevated, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border },
  chipActive:  { backgroundColor: C.accentBg, borderColor: C.accentBorder },
  chipText:    { fontSize: 12, fontWeight: '600', color: C.textSec },
  chipTextActive: { color: C.accent },

  input: {
    backgroundColor: C.elevated, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    padding: 14, fontSize: 14, color: C.textPrimary,
    minHeight: 100, maxHeight: 160,
    marginBottom: 10,
  },

  noteRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 16 },
  noteText:    { fontSize: 11, color: C.textMuted, flex: 1, lineHeight: 16 },

  btnRow:      { flexDirection: 'row', gap: 10 },
  btnCancel:   { flex: 0.38, paddingVertical: 13, borderRadius: 10, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  btnCancelText: { fontSize: 13, fontWeight: '600', color: C.textSec },
  btnSend:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 10, backgroundColor: C.accent },
  btnSendText: { fontSize: 13, fontWeight: '700', color: C.white },
  btnDisabled: { opacity: 0.4 },
});
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>📚</Text>
        <Text style={styles.title}>StudyShala</Text>
        <ActivityIndicator size="small" color="#4F46E5" style={{ marginTop: 18 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
});

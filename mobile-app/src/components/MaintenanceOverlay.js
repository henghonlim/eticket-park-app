import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { db } from '../../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { logoutUser } from '../services/AuthService';

export default function MaintenanceOverlay() {
  const router = useRouter();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const docRef = doc(db, "system", "settings");
    const unsubscribeDB = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsMaintenance(docSnap.data().maintenanceMode === true);
      }
    });
    return () => unsubscribeDB();
  }, []);

  useEffect(() => {
    let timer;
    if (isMaintenance) {
      setCountdown(10); 
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            logoutUser().then(() => router.replace('/login')).catch(() => router.replace('/login'));
            return 0;
          }
          return prev - 1;
        });
      }, 1000); 
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isMaintenance]);

  if (!isMaintenance) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlayBg]}>
      <Ionicons name="construct" size={80} color="#FF9800" />
      <Text style={styles.title}>Sistem Diselenggara</Text>
      <Text style={styles.subtitle}>Sistem akan ditutup buat sementara waktu untuk kerja-kerja penyelenggaraan.</Text>
      <Text style={styles.countdownText}>Log keluar automatik dalam {countdown}s...</Text>
      
      <TouchableOpacity style={styles.btn} onPress={() => {
        logoutUser().then(() => router.replace('/login')).catch(() => router.replace('/login'));
      }}>
        <Text style={styles.btnText}>Kembali ke Log Masuk</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayBg: { backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  subtitle: { color: '#94A3B8', fontSize: 14, marginTop: 10, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  countdownText: { color: '#EF4444', fontSize: 18, fontWeight: 'bold', marginTop: 30 },
  btn: { marginTop: 20, backgroundColor: '#0077B6', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default function NotificationBell() {
  const router = useRouter();
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    let unsubscribeNotif;

    if (auth.currentUser) {
      const qNotif = query(
        collection(db, "notifications"),
        where("userId", "==", auth.currentUser.uid),
        where("isRead", "==", false)
      );
      unsubscribeNotif = onSnapshot(qNotif, (snap) => {
        setHasUnreadNotif(!snap.empty);
      });
    }

    return () => {
      if (unsubscribeNotif) unsubscribeNotif();
    };
  }, []);

  return (
    <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notification')}>
      <Ionicons name="notifications-outline" size={24} color="#03045E" />
      {hasUnreadNotif && <View style={styles.notificationDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  iconButton: { marginRight: 18, position: 'relative' },
  notificationDot: { 
    position: 'absolute', top: -2, right: 0, width: 12, height: 12, 
    backgroundColor: '#ef4444', borderRadius: 6, borderWidth: 2, borderColor: '#F8FAFC' 
  },
});
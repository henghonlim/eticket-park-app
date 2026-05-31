import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebaseConfig';
import { logoutUser } from '../src/services/AuthService';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const auth = getAuth();
    let unsubscribeSnapshot: (() => void) | null = null;
    
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        // Pengguna wujud, mula pantau Session ID di Firestore
        const userRef = doc(db, 'users', user.uid);
        
        unsubscribeSnapshot = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const cloudData = docSnap.data();
            const localSessionId = await AsyncStorage.getItem('localSessionId');

            if (localSessionId === 'LOGGING_IN') {
              return; 
            }
            
            // 🚨 TENDANG KELUAR: Jika Session ID tidak sepadan
            if (cloudData.currentSessionId && cloudData.currentSessionId !== localSessionId) {
               
               // Tutup pemantauan sebelum log keluar untuk elak ralat permission-denied
               if (unsubscribeSnapshot) {
                 unsubscribeSnapshot(); 
               }
               
               await AsyncStorage.removeItem('localSessionId');
               await logoutUser();
               
               Alert.alert(
                 "Amaran Keselamatan ⚠️", 
                 "Akaun anda telah log masuk di peranti lain. Sesi ini telah ditamatkan secara automatik.",
                 [{ text: "Faham", onPress: () => router.replace('/login') }] 
               );
            }
          }
        }, (error) => {
          console.log("Pemantauan sesi dihentikan:", error.message);
        });
      } else {
        // Pengguna log keluar secara manual
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
        }
      }
    });

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      unsubscribeAuth();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

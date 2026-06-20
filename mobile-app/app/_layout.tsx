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
import '../src/i18n';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();

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
            
            if (cloudData.currentSessionId && cloudData.currentSessionId !== localSessionId) {
               
               if (unsubscribeSnapshot) {
                 unsubscribeSnapshot(); 
               }
               
               await AsyncStorage.removeItem('localSessionId');
               await logoutUser();
               
               Alert.alert(
                t('securityWarning.title'), 
                t('securityWarning.message'),
                [{ text: t('securityWarning.button'), onPress: () => router.replace('/login') }] 
              );
            }
          }
        }, (error) => {
          console.log("Pemantauan sesi dihentikan:", error.message);
        });
      } else {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
        }
      }
    });

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      unsubscribeAuth();
    };
  }, [t]);

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

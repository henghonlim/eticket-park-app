import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { registerUser } from '../services/AuthService';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';

const MARINE_LOGO = require('../../assets/marinepark-logo.png');

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      alert(t('alert_fill_all'));
      return;
    }
    if (username.trim().length < 3) {
      alert(t('alert_username_short'));
      return;
    }
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      alert(t('alert_invalid_email'));
      return;
    }
    if (password.length < 6) {
      alert(t('alert_password_short'));
      return;
    }
    if (password !== confirmPassword) {
      alert(t('alert_password_mismatch'));
      return;
    }

    setIsLoading(true);
    try {
      await registerUser(email, password, username);
      
      alert(t('alert_register_success'));
      router.replace('/login');
    } catch (error) {
      console.log("Daftar Gagal:", error.code, error.message);
      
      if (error.code === 'auth/email-already-in-use') {
        alert(t('alert_email_in_use'));
      } else if (error.code === 'auth/weak-password') {
        alert(t('alert_weak_password'));
      } else {
        alert(t('alert_register_error') + error.message);
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.toggleWrapper}>
        <LanguageToggle />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollCenter} showsVerticalScrollIndicator={false}>
          
          <View style={styles.headerContainer}>
            <Image 
              source={MARINE_LOGO}
              style={styles.logoImage} 
            />
            <Text style={styles.title}>{t('register_title')}</Text>
            <Text style={styles.subtitle}>{t('system_subtitle')}</Text>
          </View>

          <View style={styles.formContainer}>
            
            <View style={styles.inputField}>
              <Ionicons name="person-outline" size={20} color="#0077B6" style={styles.leftIcon} />
              <TextInput
                style={styles.inputText}
                placeholder={t('username_placeholder')}
                placeholderTextColor="#90A4AE"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="words"
                maxLength={30}
              />
            </View>

            <View style={styles.inputField}>
              <Ionicons name="mail-outline" size={20} color="#0077B6" style={styles.leftIcon} />
              <TextInput
                style={styles.inputText}
                placeholder={t('email_placeholder')} // 重用 Login 里的字典
                placeholderTextColor="#90A4AE"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={50}
              />
            </View>

            <View style={styles.inputField}>
              <Ionicons name="lock-closed-outline" size={20} color="#0077B6" style={styles.leftIcon} />
              <TextInput
                style={styles.passwordInput}
                placeholder={t('password_placeholder')} // 重用 Login 里的字典
                placeholderTextColor="#90A4AE"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                maxLength={30}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#0077B6"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputField}>
              <Ionicons name="lock-closed-outline" size={20} color="#0077B6" style={styles.leftIcon} />
              <TextInput
                style={styles.passwordInput}
                placeholder={t('confirm_password_placeholder')}
                placeholderTextColor="#90A4AE"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                maxLength={30}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#0077B6"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.mainButton} 
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.mainButtonText}>{t('register_button')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('already_have_account')} </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.linkText}>{t('login_link')}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CAF0F8', 
  },
  toggleWrapper: {
    alignItems: 'flex-end',
    paddingHorizontal: 25,
    paddingTop: 10,
    zIndex: 10, 
  },
  scrollCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logoImage: {
    width: 150,
    height: 150,
    marginBottom: 0,
    resizeMode: 'contain', 
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#03045E', 
    marginTop: 0,
  },
  subtitle: {
    fontSize: 15,
    color: '#0077B6', 
    marginTop: 5,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    borderRadius: 24,
    shadowColor: '#0077B6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 55,
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    marginBottom: 18, 
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 15,
  },
  leftIcon: {
    marginRight: 12, 
  },
  inputText: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#03045E',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#03045E',
  },
  eyeIcon: {
    paddingLeft: 10, 
  },
  mainButton: {
    width: '100%',
    height: 58,
    backgroundColor: '#0077B6', 
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: "#0077B6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  footerText: {
    color: '#64748B',
  },
  linkText: {
    color: '#00B4D8', 
    fontWeight: 'bold',
  },
});
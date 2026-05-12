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
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { loginUser, resetUserPassword, logoutUser } from '../services/AuthService';

const MARINE_LOGO = require('../../assets/marinepark-logo.png');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Sila masukkan e-mel dan kata laluan.");
      return;
    }

    setIsLoading(true);

    try {
      const { user, role, accountStatus } = await loginUser(email, password);
      
      if (accountStatus === 'Digantung') {
        await logoutUser();
        alert("Akaun Digantung: Akses ditolak. Sila hubungi admin.");
        setEmail('');
        setPassword('');
        return; 
      }
      if (role === 'admin') {
        alert("Selamat Datang, Admin!");
        router.replace('/admindashboard'); 
      } else {
        alert("Log Masuk Berjaya!");
        router.replace('/usermainpage'); 
      }

    } catch (error) {
      console.log("Log Masuk Gagal:", error.message);
      alert("Gagal Log Masuk: E-mel atau kata laluan salah.");
      
      setEmail('');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Sila masukkan e-mel anda di ruangan atas terlebih dahulu.");
      return;
    }

    try {
      await resetUserPassword(email);
      alert("Pautan tetapan semula kata laluan telah dihantar ke e-mel anda! Sila semak peti masuk (inbox) atau spam.");
    } catch (error) {
      console.log(error.message);
      alert("Ralat: " + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >

        <View style={styles.keyboardView}>
          <View style={styles.headerContainer}>
            <Image 
              source={MARINE_LOGO}
              style={styles.logoImage} 
            />
            <Text style={styles.title}>Log Masuk</Text>
            <Text style={styles.subtitle}>Sistem e-Tiket Taman Laut</Text>
          </View>

          <View style={styles.formContainer}>
            
            <View style={styles.inputField}>
              <Ionicons name="mail-outline" size={20} color="#0077B6" style={styles.leftIcon} />
              <TextInput
                style={styles.inputText}
                placeholder="E-mel"
                placeholderTextColor="#90A4AE"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.passwordContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#0077B6" style={styles.leftIcon} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Kata Laluan"
                placeholderTextColor="#90A4AE"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#0077B6"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Lupa Kata Laluan?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.mainButton} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.mainButtonText}>Log Masuk</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Belum ada akaun? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.linkText}>Daftar sekarang</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CAF0F8',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logoImage: {
    width: 130,       
    height: 130,
    marginBottom: 0,
    resizeMode: 'contain', 
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#03045E',
    marginTop: 0,
  },
  subtitle: {
    fontSize: 16,
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
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 55,
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 15,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    width: '100%',
    marginTop: -10,
    marginBottom: 15,
    paddingRight: 5,
  },
  forgotPasswordText: {
    color: '#0077B6',
    fontWeight: '600',
    fontSize: 14,
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
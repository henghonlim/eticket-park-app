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

const MARINE_LOGO = require('../../assets/marinepark-logo.png');

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      alert("Sila isi semua maklumat.");
      return;
    }
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      alert("Sila gunakan e-mel yang berakhir dengan @gmail.com.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Kata laluan tidak sepadan!");
      return;
    }

    setIsLoading(true);
    try {
      await registerUser(email, password, username);
      
      alert("Pendaftaran Berjaya!");
      router.replace('/login');
    } catch (error) {
      console.log("Daftar Gagal:", error.code, error.message);
      
      if (error.code === 'auth/email-already-in-use') {
        alert("E-mel ini telah pun didaftarkan! Sila pergi ke halaman Log Masuk.");
      } else if (error.code === 'auth/weak-password') {
        alert("Kata laluan terlalu lemah. Sila gunakan sekurang-kurangnya 6 aksara.");
      } else {
        alert("Ralat Pendaftaran: " + error.message);
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollCenter} showsVerticalScrollIndicator={false}>
          
          {/* ================= Header Section ================= */}
          <View style={styles.headerContainer}>
            <Image 
              source={MARINE_LOGO}
              style={styles.logoImage} 
            />
            <Text style={styles.title}>Daftar Akaun</Text>
            <Text style={styles.subtitle}>Sistem e-Tiket Taman Laut</Text>
          </View>

          {/* ================= Register Form Card ================= */}
          <View style={styles.formContainer}>
            
            {/* 1. Username Input Field */}
            <View style={styles.inputField}>
              <Ionicons name="person-outline" size={20} color="#0077B6" style={styles.leftIcon} />
              <TextInput
                style={styles.inputText}
                placeholder="Nama Pengguna"
                placeholderTextColor="#90A4AE"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="words"
              />
            </View>

            {/* 2. Email Input Field */}
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

            {/* 3. Password Input Field */}
            <View style={styles.inputField}>
              <Ionicons name="lock-closed-outline" size={20} color="#0077B6" style={styles.leftIcon} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Kata Laluan"
                placeholderTextColor="#90A4AE"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#0077B6"
                />
              </TouchableOpacity>
            </View>

            {/* 4. Confirm Password Input Field */}
            <View style={styles.inputField}>
              <Ionicons name="lock-closed-outline" size={20} color="#0077B6" style={styles.leftIcon} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Sahkan Kata Laluan"
                placeholderTextColor="#90A4AE"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#0077B6"
                />
              </TouchableOpacity>
            </View>

            {/* Primary Register Action */}
            <TouchableOpacity 
              style={styles.mainButton} 
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.mainButtonText}>Daftar Akaun</Text>
              )}
            </TouchableOpacity>

            {/* Navigate back to Login */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Sudah ada akaun? </Text>
              {/* This router.back() safely returns the user to the Login page */}
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.linkText}>Log masuk</Text>
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
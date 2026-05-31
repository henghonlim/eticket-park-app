import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { router } from 'expo-router';
import { logoutUser } from '../services/AuthService';
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminHeader({ title, subtitle, rightComponent }) {
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const handleLogout = async () => {
    try {
      setIsMenuVisible(false);

      try {
        await addDoc(collection(db, "auditLogs"), {
          action: "Log Keluar Sistem",
          details: "Admin telah log keluar dari sistem Papan Pemuka.",
          timestamp: serverTimestamp()
        });
      } catch (logError) {
        console.log("Gagal merekod log keluar:", logError);
      }
      
      await logoutUser();
      Alert.alert("Berjaya", "Anda telah log keluar dari akaun pentadbir.");
      router.replace('/login');
    } catch (error) { 
      Alert.alert("Ralat", error.message); 
    }
  };

  return (
    <View style={styles.header}>
      {/* 左侧文字区：完全对应你原本的字号与间距 */}
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      
      {/* 右侧操作区：支持动态注入专属按钮 */}
      <View style={styles.headerRight}>
        {/* 🌟 这里会动态放入各个页面自己传过来的额外按钮 */}
        {rightComponent}
        
        <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={{ marginLeft: 15 }} activeOpacity={0.7}>
          <Image 
            source={{ uri: 'https://ui-avatars.com/api/?name=Admin&background=03045E&color=fff&size=128' }} 
            style={styles.profileImage} 
          />
        </TouchableOpacity>
      </View>

      {/* 内置的下拉登出菜单 */}
      <Modal transparent={true} visible={isMenuVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsMenuVisible(false)}>
          <View style={styles.profileModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.adminDropdownMenu}>
                <TouchableOpacity style={styles.adminMenuItem} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                  <Text style={styles.adminMenuText}>Log Keluar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // 🌟 彻底去掉了 backgroundColor 和 border 边框，保证完全透明，与背景融为一体
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 15, paddingBottom: 15 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  profileImage: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: '#03045E' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#03045E' },
  headerSubtitle: { fontSize: 16, color: '#0077B6', fontWeight: '600', marginTop: 2 },
  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
  adminDropdownMenu: { position: 'absolute', top: 75, right: 25, width: 140, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 8 },
  adminMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18 },
  adminMenuText: { fontSize: 15, color: '#ef4444', marginLeft: 10, fontWeight: 'bold' },
});
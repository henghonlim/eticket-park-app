import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  FlatList, ActivityIndicator, Modal, TouchableWithoutFeedback,
  Alert // 🌟 修复 1：补上了 Alert 导入
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { db } from '../../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import MaintenanceOverlay from '../components/MaintenanceOverlay';

export default function NotificationScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    let unsubscribeDB;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        unsubscribeDB = onSnapshot(q, (snapshot) => {
          const notifData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setNotifications(notifData);
          setLoading(false);
        });
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeDB) unsubscribeDB();
    };
  }, []);

  const handlePressNotif = async (item) => {
    setSelectedNotif(item);
    setIsModalVisible(true);

    if (!item.isRead) {
      try {
        const notifRef = doc(db, "notifications", item.id);
        await updateDoc(notifRef, { isRead: true });
      } catch (error) {
        console.error("Error marking read:", error);
      }
    }
  };

  const deleteNotification = (notifId) => {
    Alert.alert(
      "Padam Notifikasi",
      "Adakah anda pasti ingin memadam notifikasi ini?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Padam", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "notifications", notifId));
            } catch (error) {
              console.error("Gagal memadam:", error);
            }
          } 
        }
      ]
    );
  };

  const clearAllNotifications = () => {
    if (notifications.length === 0) return;
    
    Alert.alert(
      "Padam Semua",
      "Adakah anda pasti ingin memadam semua notifikasi?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Padam Semua", 
          style: "destructive", 
          onPress: async () => {
            try {
              const promises = notifications.map(n => deleteDoc(doc(db, "notifications", n.id)));
              await Promise.all(promises);
            } catch (error) {
              console.error("Gagal memadam semua:", error);
            }
          } 
        }
      ]
    );
  };

  const getIconConfig = (type) => {
    switch (type) {
      case 'pending': return { name: 'time', color: '#0077B6', bgColor: '#E0F2FE' };
      case 'purchase': return { name: 'checkmark-circle', color: '#10B981', bgColor: '#DCFCE7' };
      case 'closure': return { name: 'alert-circle', color: '#EF4444', bgColor: '#FEE2E2' };
      case 'weather': return { name: 'thunderstorm', color: '#F59E0B', bgColor: '#FEF3C7' };
      default: return { name: 'notifications', color: '#64748B', bgColor: '#F1F5F9' };
    }
  };

  const renderNotification = ({ item }) => {
    const iconConfig = getIconConfig(item.type);
    const isUnread = !item.isRead;

    return (
      <View style={[styles.notifCard, isUnread && styles.notifCardUnread]}>
        <TouchableOpacity 
          style={styles.notifMainContent} 
          onPress={() => handlePressNotif(item)}
        >
          <View style={[styles.iconBox, { backgroundColor: iconConfig.bgColor }]}>
            <Ionicons name={iconConfig.name} size={24} color={iconConfig.color} />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={1}>{item.title}</Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
            <Text style={[styles.body, isUnread && styles.bodyUnread]} numberOfLines={1}>
              {item.body}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteBtn} 
          onPress={() => deleteNotification(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#CBD5E1" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <MaintenanceOverlay /> 
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#03045E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifikasi</Text>
        <TouchableOpacity 
          onPress={clearAllNotifications} 
          style={{ width: 80, alignItems: 'flex-end' }}
        >
          <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 13 }}>Padam Semua</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={!loading && <Text style={styles.emptyText}>Tiada notifikasi.</Text>}
      />

      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={[styles.modalIcon, { backgroundColor: getIconConfig(selectedNotif?.type).bgColor }]}>
                  <Ionicons name={getIconConfig(selectedNotif?.type).name} size={40} color={getIconConfig(selectedNotif?.type).color} />
                </View>
                <Text style={styles.modalTitle}>{selectedNotif?.title}</Text>
                <Text style={styles.modalBody}>{selectedNotif?.body}</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.closeBtnText}>Tutup</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#03045E', marginLeft: 35, },
  listContainer: { padding: 20 },
  backBtn: { 
    padding: 8, 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  
  notifCard: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    marginBottom: 15, 
    elevation: 1,
    overflow: 'hidden' 
  },
  notifCardUnread: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' },
  
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  textContainer: { flex: 1 },
  notifMainContent: { flex: 1, flexDirection: 'row', padding: 16, alignItems: 'center' },
  
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  titleUnread: { fontWeight: 'bold', color: '#03045E' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  body: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  bodyUnread: { color: '#475569' },
  
  deleteBtn: { padding: 15, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 50 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 24, padding: 25, alignItems: 'center' },
  modalIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#03045E', textAlign: 'center', marginBottom: 15 },
  modalBody: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  closeBtn: { backgroundColor: '#0077B6', paddingHorizontal: 40, paddingVertical: 12, borderRadius: 12 },
  closeBtnText: { color: '#FFF', fontWeight: 'bold' }
});
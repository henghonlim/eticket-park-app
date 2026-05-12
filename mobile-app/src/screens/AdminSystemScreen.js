import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Switch, Alert, ActivityIndicator, Modal,
  TouchableWithoutFeedback, Image, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { db } from '../../firebaseConfig';
import { 
  doc, getDoc, setDoc, collection, query, 
  orderBy, limit, onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default function AdminSystemScreen() {
  const [activeTab, setActiveTab] = useState('templates'); 
  const [loading, setLoading] = useState(false);
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  
  // --- Templat Dropdown ---
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [selectedTemplateType, setSelectedTemplateType] = useState('pending'); // Default

  const TEMPLATE_OPTIONS = [
    { id: 'pending', label: 'Pembayaran Dihantar (Menunggu)', icon: 'time-outline', color: '#0077B6' },
    { id: 'purchase', label: 'Pengesahan Tiket (Sah/Batal)', icon: 'checkmark-circle', color: '#10B981' },
    { id: 'closure', label: 'Penutupan Taman Laut', icon: 'alert-circle', color: '#EF4444' },
    { id: 'weather', label: 'Amaran Cuaca', icon: 'thunderstorm', color: '#F59E0B' }
  ];

  // --- Data States ---
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [logs, setLogs] = useState([]);
  const [templates, setTemplates] = useState({
    pending: { title: '', body: '' },
    purchase: { title: '', body: '' },
    closure: { title: '', body: '' },
    weather: { title: '', body: '' }
  });

  const handleDummyPress = (featureName) => {
    setIsProfileMenuVisible(false);
    alert(`Modul ${featureName} akan datang!`);
  };

  useEffect(() => {
    const auth = getAuth();
    let unsubscribeLogs;

    // 🌟 核心：监听认证状态。只有确信用户有 Token 后，才去拉取数据
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 当有了 user 凭证，才允许访问系统设置和日志
        fetchSystemSettings();
        unsubscribeLogs = fetchActivityLogs();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, []);

  const fetchSystemSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "system", "settings");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMaintenanceMode(data.maintenanceMode || false);
        setTemplates(data.templates || templates);
      }
    } catch (error) {
      console.error("Fetch settings error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = () => {
    const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(20));
    return onSnapshot(q, (snapshot) => {
      const logList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(logList);
    });
  };

  const handleSaveSettings = async () => {
    const auth = getAuth();
    if (!auth.currentUser) {
      Alert.alert("Sesi Ralat", "Sistem sedang memuatkan sesi anda. Sila cuba lagi sebentar.");
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, "system", "settings");
      await setDoc(docRef, {
        maintenanceMode,
        templates,
        lastUpdated: serverTimestamp()
      }, { merge: true }); 
      Alert.alert("Berjaya", "Tetapan sistem telah disimpan.");
    } catch (error) {
      Alert.alert("Ralat Firebase", error.message); 
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = (field, value) => {
    setTemplates(prev => ({
      ...prev,
      [selectedTemplateType]: { ...prev[selectedTemplateType], [field]: value }
    }));
  };

  const handleLogout = async () => {
    setIsProfileMenuVisible(false);
    Alert.alert("Log Keluar", "Anda telah berjaya log keluar.");
    router.replace('/login');
  };

  const getSelectedOptionDetails = () => {
    return TEMPLATE_OPTIONS.find(opt => opt.id === selectedTemplateType);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ================= HEADER (Unified UI) ================= */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sistem</Text>
          <Text style={styles.headerSubtitle}>Konfigurasi & Log Aktiviti</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setIsProfileMenuVisible(true)}>
            <Image 
              source={{ uri: 'https://ui-avatars.com/api/?name=Admin&background=03045E&color=fff&size=128' }} 
              style={styles.profileImage} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= TAB SWITCHER ================= */}
      <View style={styles.tabSwitcherContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'templates' && styles.tabButtonActive]} 
          onPress={() => setActiveTab('templates')}
        >
          <Ionicons name="document-text-outline" size={18} color={activeTab === 'templates' ? "#FFFFFF" : "#64748B"} style={styles.tabIcon} />
          <Text style={[styles.tabButtonText, activeTab === 'templates' && styles.tabButtonTextActive]}>Templat Notifikasi</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]} 
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons name="settings-outline" size={18} color={activeTab === 'settings' ? "#FFFFFF" : "#64748B"} style={styles.tabIcon} />
          <Text style={[styles.tabButtonText, activeTab === 'settings' && styles.tabButtonTextActive]}>Tetapan & Log</Text>
        </TouchableOpacity>
      </View>

      {/* ================= CONTENT ================= */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'templates' ? (
          <View>
            <Text style={styles.sectionTitle}>Urus Templat Sistem</Text>
            <Text style={styles.infoText}>Gunakan <Text style={{fontWeight:'bold'}}>[Nama]</Text> atau <Text style={{fontWeight:'bold'}}>[Taman]</Text> sebagai penanda dinamik untuk sistem auto.</Text>
            
            {/* Dropdown Selector */}
            <Text style={styles.formLabel}>Pilih Jenis Templat</Text>
            <TouchableOpacity style={styles.dropdownSelector} onPress={() => setIsDropdownVisible(true)}>
              <View style={styles.dropdownSelectorLeft}>
                <Ionicons name={getSelectedOptionDetails()?.icon} size={20} color={getSelectedOptionDetails()?.color} />
                <Text style={styles.dropdownSelectorText}>{getSelectedOptionDetails()?.label}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Template Editor Box */}
            <View style={styles.templateEditorCard}>
              <Text style={styles.formLabelCard}>Tajuk Notifikasi</Text>
              <TextInput 
                style={styles.inputTitle} 
                placeholder="Contoh: Tiket Disahkan"
                value={templates[selectedTemplateType]?.title}
                onChangeText={(v) => updateTemplate('title', v)}
              />

              <Text style={styles.formLabelCard}>Kandungan Mesej</Text>
              <TextInput 
                style={styles.inputBody} 
                placeholder="Contoh: Hai [Nama], tiket anda telah..."
                multiline={true}
                numberOfLines={5}
                value={templates[selectedTemplateType]?.body}
                onChangeText={(v) => updateTemplate('body', v)}
              />

              {/* Simpan Button at Bottom Right */}
              <View style={styles.saveBtnContainer}>
                {loading ? <ActivityIndicator color="#0077B6" /> : (
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Simpan</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Keselamatan Sistem</Text>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Mod Penyelenggaraan</Text>
                <Text style={styles.settingDesc}>Sistem akan ditutup sementara kepada pengguna awam.</Text>
              </View>
              <Switch 
                value={maintenanceMode} 
                onValueChange={async (val) => {
                  setMaintenanceMode(val);
                  try {
                    const docRef = doc(db, "system", "settings");
                    await setDoc(docRef, { maintenanceMode: val }, { merge: true });
                  } catch (error) {
                    console.error("Gagal simpan status", error);
                  }
                }}
                trackColor={{ false: "#CBD5E1", true: "#00B4D8" }}
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Log Aktiviti Terkini</Text>
            {logs.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>Tiada log aktiviti setakat ini.</Text>
              </View>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logIconBox}>
                    <Ionicons name="time-outline" size={16} color="#64748B" />
                  </View>
                  <View style={styles.logContent}>
                    <Text style={styles.logAction}>{log.action}</Text>
                    <Text style={styles.logDetails}>{log.details}</Text>
                    <Text style={styles.logTime}>
                      {log.timestamp?.toDate().toLocaleString('ms-MY')}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ================= MODALS ================= */}
      
      {/* Profile Logout Modal */}
      <Modal transparent={true} visible={isProfileMenuVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsProfileMenuVisible(false)}>
          <View style={styles.menuModalOverlay}>
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.menuText}>Log Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Template Type Dropdown Modal */}
      <Modal visible={isDropdownVisible} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsDropdownVisible(false)}>
          <View style={styles.modalOverlayPicker}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerDropdown}>
                <Text style={styles.pickerTitle}>Pilih Jenis Templat</Text>
                {TEMPLATE_OPTIONS.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.pickerItem} 
                    onPress={() => { 
                      setSelectedTemplateType(item.id); 
                      setIsDropdownVisible(false); 
                    }}
                  >
                    <View style={styles.pickerItemLeft}>
                      <Ionicons name={item.icon} size={20} color={item.color} />
                      <Text style={[styles.pickerItemText, selectedTemplateType === item.id && {fontWeight: 'bold', color: '#03045E'}]}>
                        {item.label}
                      </Text>
                    </View>
                    {selectedTemplateType === item.id && <Ionicons name="checkmark-circle" size={24} color="#0077B6" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ================= BOTTOM NAVIGATION ================= */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/admindashboard')}>
          <Ionicons name="grid-outline" size={24} color="#90A4AE" />
          <Text style={styles.tabText}>Utama</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/ticketmanage')}>
          <Ionicons name="ticket-outline" size={24} color="#90A4AE" />
          <Text style={styles.tabText}>Tiket</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/usermanage')}>
          <Ionicons name="people-outline" size={24} color="#90A4AE" />
          <Text style={styles.tabText}>Pengguna</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => handleDummyPress('Kewangan')}>
          <Ionicons name="stats-chart-outline" size={24} color="#90A4AE" />
          <Text style={styles.tabText}>Kewangan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => handleDummyPress('Notifikasi')}>
          <Ionicons name="notifications-outline" size={24} color="#90A4AE" />
          <Text style={styles.tabText}>Notifikasi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="settings" size={24} color="#0077B6" />
          <Text style={[styles.tabText, styles.tabTextActive]}>Sistem</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  // Header matched exactly to TicketManageScreen
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 15, paddingBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#03045E' },
  headerSubtitle: { fontSize: 16, color: '#0077B6', fontWeight: '600', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  profileImage: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: '#03045E' },

  // Tab Switcher matched exactly to TicketManageScreen
  tabSwitcherContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', marginHorizontal: 25, borderRadius: 12, padding: 4, marginBottom: 20 },
  tabButton: { flex: 1, flexDirection: 'row', paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  tabButtonActive: { backgroundColor: '#0077B6' },
  tabIcon: { marginRight: 8 },
  tabButtonText: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },
  tabButtonTextActive: { color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 10 },
  infoText: { fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 20 },

  // Dropdown Selector
  formLabel: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  dropdownSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 15, height: 55, marginBottom: 20, elevation: 1 },
  dropdownSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dropdownSelectorText: { fontSize: 15, color: '#334155', fontWeight: '500' },

  // Template Editor Card
  templateEditorCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  formLabelCard: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 8 },
  inputTitle: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1E293B', marginBottom: 15 },
  inputBody: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 15, fontSize: 15, color: '#1E293B', height: 120, textAlignVertical: 'top', marginBottom: 20 },
  
  // Save Button (Bottom Right)
  saveBtnContainer: { alignItems: 'flex-end' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0077B6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, gap: 8, elevation: 3 },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },

  // Settings & Logs
  settingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: '#E2E8F0' },
  settingLabel: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  settingDesc: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 18 },

  logCard: { flexDirection: 'row', gap: 12, marginBottom: 15, backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  logIconBox: { width: 36, height: 36, backgroundColor: '#F8FAFC', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  logContent: { flex: 1 },
  logAction: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  logDetails: { fontSize: 13, color: '#64748B', marginTop: 2 },
  logTime: { fontSize: 11, color: '#94A3B8', marginTop: 6 },
  
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyStateText: { fontSize: 14, color: '#94A3B8' },

  // Modals
  menuModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  dropdownMenu: { position: 'absolute', top: 70, right: 25, width: 160, backgroundColor: '#FFFFFF', borderRadius: 15, paddingVertical: 10, elevation: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  menuText: { fontSize: 16, marginLeft: 15, fontWeight: '500' },

  modalOverlayPicker: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerDropdown: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 8, elevation: 10 },
  pickerTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E', padding: 15, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pickerItemText: { fontSize: 16, color: '#334155' },

  // Bottom Nav
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingBottom: 20, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 15 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, color: '#90A4AE', marginTop: 6, fontWeight: '500', textAlign: 'center' },
  tabTextActive: { color: '#0077B6', fontWeight: 'bold' }
});
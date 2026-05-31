import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Switch, Alert, ActivityIndicator, Modal, TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { db } from '../../firebaseConfig';
import { 
  doc, getDoc, setDoc, collection, query, 
  orderBy, onSnapshot, serverTimestamp, addDoc, where
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import AdminHeader from '../components/AdminHeader';

const MONTH_NAMES = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
const SHORT_DAY_NAMES = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];

// 🌟 生成年份列表 (前后10年)
const currentYear = new Date().getFullYear();
const YEARS_LIST = Array.from({length: 21}, (_, i) => currentYear - 10 + i); 

export default function AdminSystemScreen() {
  const [activeTab, setActiveTab] = useState('templates'); 
  const [loading, setLoading] = useState(false);
  
  // --- Templat Dropdown ---
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [selectedTemplateType, setSelectedTemplateType] = useState('pending');

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

  // --- 🌟 Calendar & Log Filter States ---
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [calendarMonth, setCalendarMonth] = useState(new Date()); 
  const [isYearPickerVisible, setIsYearPickerVisible] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    let unsubscribeLogs;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchSystemSettings();
        unsubscribeLogs = fetchLogsByDate(selectedDate);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, []); 

  useEffect(() => {
    const unsubscribeLogs = fetchLogsByDate(selectedDate);
    return () => {
      if (unsubscribeLogs) unsubscribeLogs();
    };
  }, [selectedDate]);

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
      console.log("Fetch settings error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogsByDate = (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, "auditLogs"), 
      where("timestamp", ">=", startOfDay),
      where("timestamp", "<=", endOfDay),
      orderBy("timestamp", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      const logList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(logList);
    }, (error) => {
      console.log("Berhenti mendengar log kerana admin telah log keluar.");
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

      await addDoc(collection(db, "auditLogs"), {
        action: "Kemaskini Sistem",
        details: `Admin telah menyimpan templat notifikasi sistem.`,
        timestamp: serverTimestamp()
      });

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

  const getSelectedOptionDetails = () => {
    return TEMPLATE_OPTIONS.find(opt => opt.id === selectedTemplateType);
  };

  const changeMonth = (offset) => {
    const newDate = new Date(calendarMonth);
    newDate.setMonth(calendarMonth.getMonth() + offset);
    setCalendarMonth(newDate);
  };

  const renderCalendarGrid = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); 
    
    const gridElements = [];
    
    for (let i = 0; i < firstDayOfWeek; i++) {
      gridElements.push(<View key={`empty-${i}`} style={styles.calendarDayCell} />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = 
        selectedDate.getDate() === day && 
        selectedDate.getMonth() === month && 
        selectedDate.getFullYear() === year;

      const isToday = 
        new Date().getDate() === day && 
        new Date().getMonth() === month && 
        new Date().getFullYear() === year;

      gridElements.push(
        <TouchableOpacity 
          key={day} 
          style={[styles.calendarDayCell, isSelected && styles.calendarDayCellSelected]}
          onPress={() => setSelectedDate(new Date(year, month, day))}
        >
          <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected, isToday && !isSelected && styles.calendarDayTextToday]}>
            {day}
          </Text>
          {isToday && !isSelected && <View style={styles.todayDot} />}
        </TouchableOpacity>
      );
    }

    return gridElements;
  };

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader title="Sistem" subtitle="Konfigurasi & Log Aktiviti" />

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'templates' ? (
          <View>
            <Text style={styles.sectionTitle}>Urus Templat Sistem</Text>
            <Text style={styles.infoText}>Gunakan <Text style={{fontWeight:'bold'}}>[Nama]</Text> atau <Text style={{fontWeight:'bold'}}>[Taman]</Text> sebagai penanda dinamik untuk sistem auto.</Text>
            
            <Text style={styles.formLabel}>Pilih Jenis Templat</Text>
            <TouchableOpacity style={styles.dropdownSelector} onPress={() => setIsDropdownVisible(true)}>
              <View style={styles.dropdownSelectorLeft}>
                <Ionicons name={getSelectedOptionDetails()?.icon} size={20} color={getSelectedOptionDetails()?.color} />
                <Text style={styles.dropdownSelectorText}>{getSelectedOptionDetails()?.label}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#94A3B8" />
            </TouchableOpacity>

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
                    // 1. Simpan ke tetapan
                    const docRef = doc(db, "system", "settings");
                    await setDoc(docRef, { maintenanceMode: val }, { merge: true });
                    
                    // 🌟 2. FIX: Tulis ke Log Aktiviti secara langsung di sini!
                    await addDoc(collection(db, "auditLogs"), {
                      action: "Kawalan Sistem",
                      details: `Admin telah ${val ? 'MENGAKTIFKAN' : 'MEMATIKAN'} Mod Penyelenggaraan.`,
                      timestamp: serverTimestamp()
                    });

                  } catch (error) {
                    console.log("Gagal simpan status:", error.message);
                    setMaintenanceMode(!val);
                    Alert.alert("Ralat", "Gagal mengemaskini tetapan sistem.");
                  }
                }}
                trackColor={{ false: "#CBD5E1", true: "#00B4D8" }}
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 5 }]}>Pilih Tarikh Log</Text>
            
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calendarNavBtn}>
                  <Ionicons name="chevron-back" size={20} color="#03045E" />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => setIsYearPickerVisible(true)} style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={styles.calendarMonthText}>
                    {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </Text>
                  <Ionicons name="caret-down" size={14} color="#03045E" style={{marginLeft: 4}} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calendarNavBtn}>
                  <Ionicons name="chevron-forward" size={20} color="#03045E" />
                </TouchableOpacity>
              </View>

              <View style={styles.calendarDaysRow}>
                {SHORT_DAY_NAMES.map((day, index) => (
                  <Text key={index} style={styles.calendarDayName}>{day}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {renderCalendarGrid()}
              </View>
            </View>

            <View style={styles.logHeaderRow}>
              <Text style={styles.sectionTitleLog}>
                Log Aktiviti ({selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]})
              </Text>
              <TouchableOpacity onPress={() => {
                const today = new Date();
                setSelectedDate(today);
                setCalendarMonth(today);
              }}>
                <Text style={styles.resetDateText}>Kembali ke Hari Ini</Text>
              </TouchableOpacity>
            </View>

            {logs.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="folder-open-outline" size={40} color="#CBD5E1" style={{marginBottom: 10}} />
                <Text style={styles.emptyStateText}>Tiada log aktiviti pada tarikh ini.</Text>
              </View>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logIconBox}>
                    <Ionicons name="time-outline" size={16} color="#0077B6" />
                  </View>
                  <View style={styles.logContent}>
                    <Text style={styles.logAction}>{log.action}</Text>
                    <Text style={styles.logDetails}>{log.details}</Text>
                    <Text style={styles.logTime}>
                      {log.timestamp?.toDate().toLocaleTimeString('ms-MY', { hour: '2-digit', minute:'2-digit' })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ================= 🌟 FIX: 年份选择器弹窗 (修复滑动回弹问题) ================= */}
      <Modal visible={isYearPickerVisible} transparent={true} animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlayPicker} 
          activeOpacity={1} 
          onPressOut={() => setIsYearPickerVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.yearPickerDropdown}>
            <Text style={styles.pickerTitle}>Pilih Tahun</Text>
            
            {/* 🌟 这里是重点：确保 ScrollView 能撑开 */}
            <ScrollView 
              style={{ flexGrow: 0, maxHeight: 400 }} // 稍微调高一点 maxHeight
              contentContainerStyle={{ paddingBottom: 20 }} // 给底部留出呼吸空间
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.yearGrid}>
                {YEARS_LIST.map(year => (
                  <TouchableOpacity 
                    key={year} 
                    style={[styles.yearItem, calendarMonth.getFullYear() === year && styles.yearItemSelected]}
                    onPress={() => {
                      const newDate = new Date(calendarMonth);
                      newDate.setFullYear(year);
                      setCalendarMonth(newDate); 
                      setIsYearPickerVisible(false); 
                    }}
                  >
                    <Text style={[styles.yearItemText, calendarMonth.getFullYear() === year && styles.yearItemTextSelected]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 🌟 FIX: Template Type Dropdown Modal (同步修复) */}
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
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/adminfinance')}>
          <Ionicons name="stats-chart-outline" size={24} color="#90A4AE" />
          <Text style={styles.tabText}>Kewangan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/adminnotification')}>
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
  
  tabSwitcherContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', marginHorizontal: 25, borderRadius: 12, padding: 4, marginBottom: 20 },
  tabButton: { flex: 1, flexDirection: 'row', paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  tabButtonActive: { backgroundColor: '#0077B6' },
  tabIcon: { marginRight: 8 },
  tabButtonText: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },
  tabButtonTextActive: { color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 10 },
  infoText: { fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 20 },

  formLabel: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  dropdownSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 15, height: 55, marginBottom: 20, elevation: 1 },
  dropdownSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dropdownSelectorText: { fontSize: 15, color: '#334155', fontWeight: '500' },

  templateEditorCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  formLabelCard: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 8 },
  inputTitle: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1E293B', marginBottom: 15 },
  inputBody: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 15, fontSize: 15, color: '#1E293B', height: 120, textAlignVertical: 'top', marginBottom: 20 },
  
  saveBtnContainer: { alignItems: 'flex-end' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0077B6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, gap: 8, elevation: 3 },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },

  settingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  settingLabel: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  settingDesc: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 18 },

  calendarCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    paddingHorizontal: 15, 
    paddingTop: 15, 
    paddingBottom: 5, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    elevation: 2, 
    marginBottom: 15 
  },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  calendarNavBtn: { padding: 5, backgroundColor: '#F0F9FF', borderRadius: 8 },
  calendarMonthText: { fontSize: 16, fontWeight: 'bold', color: '#03045E' },
  calendarDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8 },
  calendarDayName: { fontSize: 12, fontWeight: 'bold', color: '#64748B', width: '14%', textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' }, 
  calendarDayCell: { 
    width: '14.28%', 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginVertical: 2 
  },
  calendarDayCellSelected: { backgroundColor: '#0077B6', borderRadius: 12 },
  calendarDayText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  calendarDayTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },
  calendarDayTextToday: { color: '#0077B6', fontWeight: 'bold' },
  todayDot: { width: 4, height: 4, backgroundColor: '#0077B6', borderRadius: 2, position: 'absolute', bottom: 4 },

  logHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitleLog: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  resetDateText: { fontSize: 12, color: '#0077B6', fontWeight: 'bold', textDecorationLine: 'underline' },

  logCard: { flexDirection: 'row', gap: 12, marginBottom: 12, backgroundColor: '#FFF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  logIconBox: { width: 36, height: 36, backgroundColor: '#F0F9FF', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  logContent: { flex: 1 },
  logAction: { fontSize: 14, fontWeight: 'bold', color: '#03045E' },
  logDetails: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 18 },
  logTime: { fontSize: 11, color: '#94A3B8', marginTop: 8, fontWeight: 'bold' },
  
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 30, backgroundColor: '#F8FAFC', padding: 30, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyStateText: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },

  modalOverlayPicker: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerDropdown: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 8, elevation: 10 },
  pickerTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E', padding: 15, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pickerItemText: { fontSize: 16, color: '#334155' },

  yearPickerDropdown: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 15, elevation: 10 },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 5, marginTop: 10 },
  yearItem: { width: '30%', paddingVertical: 12, alignItems: 'center', borderRadius: 12, marginBottom: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  yearItemSelected: { backgroundColor: '#0077B6', borderColor: '#0077B6' },
  yearItemText: { fontSize: 15, color: '#334155', fontWeight: '500' },
  yearItemTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },

  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingBottom: 20, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 15 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, color: '#90A4AE', marginTop: 6, fontWeight: '500', textAlign: 'center' },
  tabTextActive: { color: '#0077B6', fontWeight: 'bold' }
});
import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,  
  Image, 
  ScrollView, 
  Modal, 
  TouchableWithoutFeedback,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function AdminDashboard() {
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const isProcessing = useRef(false);

  const handleLogout = async () => {
    try {
      setIsProfileMenuVisible(false);
      alert("Anda telah berjaya log keluar.");
      router.replace('/login');
    } catch (error) {
      alert("Ralat: " + error.message);
    }
  };

  const handleDummyPress = (featureName) => {
    setIsProfileMenuVisible(false);
    alert(`Modul ${featureName} akan datang!`);
  };

  const openScanner = async () => {
    if (!permission) return;
    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Ralat", "Kebenaran kamera diperlukan untuk mengimbas tiket.");
        return;
      }
    }
    setScanned(false);
    isProcessing.current = false;
    setIsScannerVisible(true);
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (isProcessing.current) return;
    
    isProcessing.current = true;
    setScanned(true);

    try {
      const ticketRef = doc(db, "tickets", data);
      const ticketSnap = await getDoc(ticketRef);

      if (ticketSnap.exists()) {
        const ticketData = ticketSnap.data();

        if (ticketData.status === "Sah") {
          await updateDoc(ticketRef, {
            status: "Telah Digunakan",
            usedAt: new Date() 
          });
          
          Alert.alert(
            "BERJAYA! ✅", 
            "Tiket disahkan. Pelawat dibenarkan masuk.", 
            [{ 
              text: "OK", 
              onPress: () => { 
                setIsScannerVisible(false); 
                setScanned(false); 
                isProcessing.current = false;
              } 
            }]
          );

        } else if (ticketData.status === "Telah Digunakan") {
          Alert.alert(
            "AMARAN! ⚠️", 
            "Tiket ini telah sudah ditebus sebelum ini!", 
            [{ 
              text: "Tutup", 
              onPress: () => { 
                setScanned(false); 
                isProcessing.current = false;
              } 
            }]
          );

        } else {
          Alert.alert(
            "RALAT TIKET ❌", 
            `Status tiket ini ialah: ${ticketData.status}. Tidak sah untuk masuk.`, 
            [{ 
              text: "Tutup", 
              onPress: () => { 
                setScanned(false); 
                isProcessing.current = false;
              } 
            }]
          );
        }

      } else {
        Alert.alert("RALAT ❌", "Kod QR tidak dijumpai dalam sistem Taman Laut.", [
          { 
            text: "Cuba Lagi", 
            onPress: () => { 
              setScanned(false); 
              isProcessing.current = false;
            } 
          }
        ]);
      }
    } catch (error) {
      Alert.alert("Ralat Sistem", "Sambungan ke pangkalan data gagal.", [
        { 
          text: "OK", 
          onPress: () => { 
            setScanned(false); 
            isProcessing.current = false;
          } 
        }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* ================= 1. Header ================= */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Papan Pemuka Admin</Text>
          <Text style={styles.headerSubtitle}>Admin Taman Laut</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={openScanner} style={styles.scanButton}>
            <Ionicons name="scan" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsProfileMenuVisible(true)}>
            <Image 
              source={{ uri: 'https://ui-avatars.com/api/?name=Admin&background=03045E&color=fff&size=128' }} 
              style={styles.profileImage} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= 2. Scroll Content (Analytics) ================= */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Jualan Tiket Hari Ini</Text>
            <Text style={styles.summaryValue}>10,293</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Hasil Hari Ini (RM)</Text>
            <Text style={styles.summaryValue}>40,890</Text>
          </View>
        </View>

        <View style={styles.chartRow}>
          <View style={[styles.chartCard, { flex: 1, marginRight: 15 }]}>
            <Text style={styles.chartTitle}>Graf Jualan</Text>
            <View style={styles.barChartContainer}>
              <View style={styles.barColumn}>
                <View style={[styles.bar, { height: '40%' }]} />
                <Text style={styles.axisLabel}>Jan</Text>
              </View>
              <View style={styles.barColumn}>
                <View style={[styles.bar, { height: '65%' }]} />
                <Text style={styles.axisLabel}>Feb</Text>
              </View>
              <View style={styles.barColumn}>
                <View style={[styles.bar, { height: '100%' }]} />
                <Text style={styles.axisLabel}>Mac</Text>
              </View>
            </View>
          </View>

          <View style={[styles.chartCard, { flex: 1 }]}>
            <Text style={styles.chartTitle}>Pelawat Taman</Text>
            <View style={styles.barChartContainer}>
              <View style={styles.barColumn}>
                <View style={[styles.barPark, { height: '50%' }]} />
                <Text style={styles.axisLabel}>Redang</Text>
              </View>
              <View style={styles.barColumn}>
                <View style={[styles.barPark, { height: '90%' }]} />
                <Text style={styles.axisLabel}>Phntian</Text>
              </View>
              <View style={styles.barColumn}>
                <View style={[styles.barPark, { height: '40%' }]} />
                <Text style={styles.axisLabel}>Tioman</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.fullWidthCard}>
          <Text style={styles.chartTitle}>Kategori Pelawat (Bulan Ini)</Text>
          <View style={styles.demoContent}>
            <View style={styles.demoRow}>
              <Text style={styles.demoLabel}>Dewasa</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '55%' }]} />
              </View>
              <Text style={styles.demoValue}>55%</Text>
            </View>
            <View style={styles.demoRow}>
              <Text style={styles.demoLabel}>Kanak-kanak</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '25%', backgroundColor: '#00B4D8' }]} />
              </View>
              <Text style={styles.demoValue}>25%</Text>
            </View>
            <View style={styles.demoRow}>
              <Text style={styles.demoLabel}>Warga Emas</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '15%', backgroundColor: '#90E0EF' }]} />
              </View>
              <Text style={styles.demoValue}>15%</Text>
            </View>
            <View style={styles.demoRow}>
              <Text style={styles.demoLabel}>OKU</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '5%', backgroundColor: '#CAF0F8' }]} />
              </View>
              <Text style={styles.demoValue}>5%</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ================= 3. Bottom Tab Bar ================= */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="grid" size={24} color="#0077B6" />
          <Text style={[styles.tabText, styles.tabTextActive]}>Utama</Text>
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
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/adminsystem')}>
          <Ionicons name="settings-outline" size={24} color="#90A4AE" />
          <Text style={styles.tabText}>Sistem</Text>
        </TouchableOpacity>
      </View>

      {/* ================= 4. Profile Menu Modal ================= */}
      <Modal transparent={true} visible={isProfileMenuVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsProfileMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownMenu}>
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                  <Text style={[styles.menuText, { color: '#ef4444' }]}>Log Keluar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* =================  5. QR Scanner Modal ================= */}
      <Modal visible={isScannerVisible} animationType="slide" transparent={false}>
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity onPress={() => setIsScannerVisible(false)} style={styles.scannerCloseBtn}>
              <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Imbas E-Tiket</Text>
            <View style={{ width: 32 }} /> 
          </View>

          <CameraView
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            style={StyleSheet.absoluteFillObject}
          />
          
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerTarget}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scannerGuideText}>Selaraskan kod QR di dalam bingkai</Text>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ================= Styles =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 15, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#03045E' },
  headerSubtitle: { fontSize: 16, color: '#0077B6', fontWeight: '600' },
  
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  scanButton: { backgroundColor: '#0077B6', width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, shadowColor: '#0077B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  profileImage: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: '#03045E' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  summaryCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginHorizontal: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  summaryTitle: { fontSize: 12, color: '#64748B', marginBottom: 8, fontWeight: '600' },
  summaryValue: { fontSize: 26, fontWeight: 'bold', color: '#0077B6' },

  chartRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  chartCard: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 20, marginHorizontal: 5, height: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  chartTitle: { fontSize: 14, fontWeight: 'bold', color: '#03045E', marginBottom: 15 },
  barChartContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: 5 },
  barColumn: { alignItems: 'center', width: 30, height: '100%', justifyContent: 'flex-end' },
  bar: { width: 15, backgroundColor: '#0077B6', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  barPark: { width: 15, backgroundColor: '#00B4D8', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  axisLabel: { fontSize: 10, color: '#90A4AE', marginTop: 8 },

  fullWidthCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginHorizontal: 5, height: 240, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 10 },
  demoContent: { flex: 1, justifyContent: 'space-evenly' },
  demoRow: { flexDirection: 'row', alignItems: 'center' },
  demoLabel: { width: 90, fontSize: 13, color: '#03045E', fontWeight: '500' },
  progressBarBg: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, marginHorizontal: 10 },
  progressBarFill: { height: '100%', backgroundColor: '#03045E', borderRadius: 4 },
  demoValue: { width: 35, fontSize: 12, fontWeight: 'bold', color: '#64748B', textAlign: 'right' },

  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingBottom: 20, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, color: '#90A4AE', marginTop: 6, fontWeight: '500', textAlign: 'center' },
  tabTextActive: { color: '#0077B6', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  dropdownMenu: { position: 'absolute', top: 70, right: 25, width: 150, backgroundColor: '#FFFFFF', borderRadius: 15, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  menuText: { fontSize: 16, marginLeft: 15, fontWeight: '500' },

  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerHeader: { position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, zIndex: 10 },
  scannerCloseBtn: { padding: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  scannerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10 },
  scannerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  scannerTarget: { width: 250, height: 250, backgroundColor: 'transparent', position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#10B981', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  scannerGuideText: { color: '#FFF', marginTop: 40, fontSize: 14, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, overflow: 'hidden' },
});
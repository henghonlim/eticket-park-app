import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity,  
  Image, ScrollView, Modal, TouchableWithoutFeedback,
  Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AdminHeader from '../components/AdminHeader';
import { db } from '../../firebaseConfig';
import { collection, doc, getDoc, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { PieChart } from 'react-native-gifted-charts';

export default function AdminDashboard() {
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const isProcessing = useRef(false);

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalTickets: 0,
    totalVisitors: 0,
    pendingTickets: 0,
    parkDistribution: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const tkSnap = await getDocs(collection(db, "tickets"));
      let rev = 0, tkt = 0, pax = 0, pending = 0;
      let parkCounts = {};

      tkSnap.forEach(doc => {
        const data = doc.data();
        
        if (data.status === "Menunggu Pengesahan") {
          pending += 1;
        }

        if (data.status === "Sah" || data.status === "Telah Digunakan") {
          rev += parseFloat(data.totalAmount || 0);
          
          const c = data.counts || {};
          const sumPax = Number(c.adult||0) + Number(c.child||0) + Number(c.senior||0) + Number(c.oku||0);
          
          pax += sumPax;
          tkt += sumPax;

          const pName = data.parkName || "Lain-lain";
          parkCounts[pName] = (parkCounts[pName] || 0) + sumPax;
        }
      });

      const sortedParks = Object.keys(parkCounts)
        .map(park => ({ name: park.split(' ').pop(), count: parkCounts[park] })) // 只取名字最后一个词，比如 Pulau Tioman 变成 Tioman
        .sort((a, b) => b.count - a.count);

      let finalPieData = [];
      let othersCount = 0;

      sortedParks.forEach((item, index) => {
        if (index < 4) {
          finalPieData.push(item);
        } else {
          othersCount += item.count;
        }
      });

      if (othersCount > 0) {
        finalPieData.push({ name: 'Lain-lain', count: othersCount });
      }

      const colors = ['#03045E', '#0077B6', '#00B4D8', '#90E0EF', '#CBD5E1']; // 最后一个灰色留给 Lain-lain
      
      const pieData = finalPieData.map((item, idx) => ({
        value: item.count,
        color: colors[idx % colors.length],
        text: String(item.count),
        labelName: item.name
      }));

      setDashboardData({
        totalRevenue: rev,
        totalTickets: tkt,
        totalVisitors: pax,
        pendingTickets: pending,
        parkDistribution: pieData
      });

    } catch (error) {
      console.log("Gagal memuat data dashboard (sesi mungkin tamat):", error.message);
    } finally {
      setLoading(false);
    }
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

          try {
            await addDoc(collection(db, "auditLogs"), {
              action: "Imbas E-Tiket",
              details: `Admin telah berjaya mengimbas dan merekodkan kemasukan untuk tiket ID: ${data.slice(0, 8).toUpperCase()}.`,
              timestamp: serverTimestamp()
            });
          } catch (logError) {
            console.log("Gagal merekod log imbasan:", logError);
          }
          
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
      
      <AdminHeader 
        title="Papan Pemuka Admin"
        subtitle="Admin Taman Laut"
        rightComponent={
          <TouchableOpacity onPress={openScanner} style={styles.scanButton}>
            <Ionicons name="scan" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Selamat Bertugas!</Text>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0077B6" style={{ marginTop: 50 }} />
        ) : (
          <>
            <TouchableOpacity 
              style={[styles.alertBanner, dashboardData.pendingTickets > 0 ? styles.alertBannerWarning : styles.alertBannerSafe]}
              onPress={() => router.push({ pathname: '/ticketmanage', params: { tab: 'records' } })}
            >
              <View style={styles.alertIconBox}>
                <Ionicons 
                  name={dashboardData.pendingTickets > 0 ? "time" : "checkmark-done"} 
                  size={24} 
                  color={dashboardData.pendingTickets > 0 ? "#D97706" : "#059669"} 
                />
              </View>
              <View style={styles.alertTextBox}>
                <Text style={[styles.alertTitle, dashboardData.pendingTickets > 0 ? {color: '#92400E'} : {color: '#065F46'}]}>
                  {dashboardData.pendingTickets > 0 ? "Tindakan Diperlukan" : "Semua Selesai"}
                </Text>
                <Text style={[styles.alertDesc, dashboardData.pendingTickets > 0 ? {color: '#B45309'} : {color: '#059669'}]}>
                  {dashboardData.pendingTickets > 0 
                    ? `Terdapat ${dashboardData.pendingTickets} tiket menunggu pengesahan bayaran.` 
                    : `Tiada tiket yang menunggu pengesahan buat masa ini.`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={dashboardData.pendingTickets > 0 ? "#D97706" : "#059669"} />
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Ringkasan Keseluruhan</Text>
            
            <View style={styles.kpiMainCard}>
              <View style={styles.kpiIconBox}><Ionicons name="wallet" size={24} color="#0077B6" /></View>
              <View>
                <Text style={styles.kpiLabel}>Jumlah Hasil (RM)</Text>
                <Text style={styles.kpiValueMain}>{dashboardData.totalRevenue.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.kpiSubRow}>
              <View style={styles.kpiSubCard}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                  <Ionicons name="people" size={16} color="#64748B" style={{marginRight: 6}} />
                  <Text style={styles.kpiLabelSub}>Jumlah Pelawat</Text>
                </View>
                <Text style={styles.kpiValueSub}>{dashboardData.totalVisitors} <Text style={{fontSize: 12, color: '#94A3B8'}}>Pax</Text></Text>
              </View>
              
              <View style={styles.kpiSubCard}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                  <Ionicons name="ticket" size={16} color="#64748B" style={{marginRight: 6}} />
                  <Text style={styles.kpiLabelSub}>Tiket Terjual</Text>
                </View>
                <Text style={styles.kpiValueSub}>{dashboardData.totalTickets} <Text style={{fontSize: 12, color: '#94A3B8'}}>Keping</Text></Text>
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Taburan Pelawat Semasa</Text>
              {dashboardData.parkDistribution.length > 0 ? (
                <View style={styles.pieContainer}>
                  <PieChart 
                    data={dashboardData.parkDistribution} 
                    donut 
                    innerRadius={50} 
                    radius={70} 
                    centerLabelComponent={() => (
                      <View style={{justifyContent: 'center', alignItems: 'center'}}>
                        <Text style={{fontSize: 20, color: '#03045E', fontWeight: '900'}}>{dashboardData.totalVisitors}</Text>
                        <Text style={{fontSize: 9, color: '#94A3B8', fontWeight: 'bold'}}>JUMLAH</Text>
                      </View>
                    )}
                  />
                  <View style={styles.legendContainer}>
                    {dashboardData.parkDistribution.map((item, idx) => (
                      <View key={idx} style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText}>{item.labelName}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyText}>Tiada data pelawat disahkan.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

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
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/adminfinance')}>
          <Ionicons name="stats-chart-outline" size={24} color="#90A4AE" />
          <Text style={styles.tabText}>Kewangan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/adminnotification')}>
          <Ionicons name="notifications-outline" size={24} color="#90A4AE" />
          <Text style={styles.tabText}>Notifikasi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/adminsystem')}>
          <Ionicons name="settings-outline" size={24} color="#90A4AE" />
          <Text style={styles.tabText}>Sistem</Text>
        </TouchableOpacity>
      </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 15, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#03045E' },
  headerSubtitle: { fontSize: 16, color: '#0077B6', fontWeight: '600' },
  scanButton: { backgroundColor: '#0077B6', width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#0077B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
  
  welcomeSection: { marginTop: 10, marginBottom: 20 },
  welcomeText: { fontSize: 22, fontWeight: '900', color: '#03045E' },
  dateText: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '500' },

  alertBanner: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, marginBottom: 25, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5 },
  alertBannerWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  alertBannerSafe: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  alertIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  alertTextBox: { flex: 1 },
  alertTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 3 },
  alertDesc: { fontSize: 12, lineHeight: 16 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 15, marginLeft: 5 },

  kpiMainCard: { backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 24, marginBottom: 12, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 },
  kpiIconBox: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  kpiLabel: { fontSize: 11, color: '#94A3B8', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValueMain: { fontSize: 32, fontWeight: '900', color: '#03045E' },
  
  kpiSubRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  kpiSubCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  kpiLabelSub: { fontSize: 12, color: '#64748B', fontWeight: 'bold' },
  kpiValueSub: { fontSize: 22, fontWeight: '900', color: '#0077B6' },

  chartCard: { backgroundColor: '#FFFFFF', padding: 22, borderRadius: 24, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 10 },
  chartTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginBottom: 15 },
  pieContainer: { alignItems: 'center', justifyContent: 'center' },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginTop: 25, width: '100%', paddingHorizontal: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 12 },
  legendColor: { width: 12, height: 12, borderRadius: 4, marginRight: 10 },
  legendText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', marginVertical: 20 },

  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingBottom: 20, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, color: '#90A4AE', marginTop: 6, fontWeight: '500', textAlign: 'center' },
  tabTextActive: { color: '#0077B6', fontWeight: 'bold' },

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
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Image, ScrollView, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaintenanceOverlay from '../components/MaintenanceOverlay';

export default function ConfirmOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); 

  const { parkId, parkName, date, total, adult, child, senior, oku } = params;
  const [paymentMethod, setPaymentMethod] = useState(null);

  const handleProceedToPayment = () => {
    if (!paymentMethod) {
      Alert.alert("Perhatian", "Sila pilih kaedah pembayaran.");
      return;
    }

    router.push({
      pathname: '/payments',
      params: { 
        parkId,
        parkName,
        date,
        total,
        adult,
        child,
        senior,
        oku,
        method: paymentMethod 
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <MaintenanceOverlay />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#03045E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengesahan Tempahan</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Ionicons name="receipt-outline" size={22} color="#0077B6" />
            <Text style={styles.receiptTitle}>Butiran Pesanan</Text>
          </View>
          
          <View style={styles.dashedDivider} />

          <View style={styles.receiptBody}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}><Ionicons name="location" size={16} color="#0077B6" /></View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Taman Laut</Text>
                <Text style={styles.infoValue}>{parkName}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}><Ionicons name="calendar" size={16} color="#0077B6" /></View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Tarikh Lawatan</Text>
                <Text style={styles.infoValue}>{date}</Text>
              </View>
            </View>
            
            <View style={styles.ticketSummaryBox}>
              <Text style={styles.ticketSummaryTitle}>Ringkasan Tiket:</Text>
              {parseInt(adult) > 0 && <Text style={styles.ticketDetailText}>• Dewasa x {adult}</Text>}
              {parseInt(child) > 0 && <Text style={styles.ticketDetailText}>• Kanak-kanak x {child}</Text>}
              {parseInt(senior) > 0 && <Text style={styles.ticketDetailText}>• Warga Emas x {senior}</Text>}
              {parseInt(oku) > 0 && <Text style={styles.ticketDetailText}>• OKU x {oku}</Text>}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Kaedah Pembayaran</Text>
        
        <TouchableOpacity 
          style={[styles.paymentCard, paymentMethod === 'TNG' && styles.paymentCardActive]} 
          onPress={() => setPaymentMethod('TNG')}
          activeOpacity={0.8}
        >
          <View style={styles.logoWrapper}>
          <Image 
              source={require('../../assets/tng_logo.png')} 
              style={styles.tngLogo} 
            />
          </View>
          
          <View style={styles.paymentTextContainer}>
            <Text style={styles.paymentTitle}>DuitNow QR</Text>
            <Text style={styles.paymentSubtitle}>Imbas & Bayar</Text>
          </View>
          
          <Ionicons 
            name={paymentMethod === 'TNG' ? "checkmark-circle" : "ellipse-outline"} 
            size={28} 
            color={paymentMethod === 'TNG' ? "#0077B6" : "#CBD5E1"} 
          />
        </TouchableOpacity>

      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalLabel}>Jumlah Keseluruhan</Text>
          <Text style={styles.totalPrice}>RM {parseFloat(total).toFixed(2)}</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.checkoutBtn, !paymentMethod && { backgroundColor: '#94A3B8' }]} 
          onPress={handleProceedToPayment}
          disabled={!paymentMethod}
        >
          <Text style={styles.checkoutBtnText}>Beli Sekarang</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// ================= Styles =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E' },
  
  content: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 110 },
  
  receiptCard: { backgroundColor: '#FFFFFF', borderRadius: 20, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 8, marginBottom: 25 },
  receiptHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', padding: 18, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  receiptTitle: { fontSize: 16, fontWeight: 'bold', color: '#0077B6', marginLeft: 10 },
  dashedDivider: { height: 1, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', marginHorizontal: 20 },
  receiptBody: { padding: 20 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: 'bold', color: '#03045E' },
  
  ticketSummaryBox: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 12, marginTop: 5, borderWidth: 1, borderColor: '#F1F5F9' },
  ticketSummaryTitle: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 8 },
  ticketDetailText: { fontSize: 14, color: '#334155', fontWeight: '500', marginBottom: 4, marginLeft: 5 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E', marginBottom: 15, paddingHorizontal: 5 },
  paymentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, borderWidth: 2, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  paymentCardActive: { borderColor: '#0077B6', backgroundColor: '#F0F9FF' },
  logoWrapper: { width: 50, height: 50, backgroundColor: '#FFFFFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  
  tngLogo: { width: 42, height: 42, resizeMode: 'contain' },
  
  paymentTextContainer: { flex: 1 },
  paymentTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 2 },
  paymentSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 15, paddingBottom: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  priceContainer: { flex: 1 },
  totalLabel: { fontSize: 12, color: '#64748B', fontWeight: 'bold', marginBottom: 2 },
  totalPrice: { fontSize: 24, fontWeight: '900', color: '#0077B6' },
  checkoutBtn: { backgroundColor: '#0077B6', flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 25, borderRadius: 16, alignItems: 'center', shadowColor: '#0077B6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  checkoutBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
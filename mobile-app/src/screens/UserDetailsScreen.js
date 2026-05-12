import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminUpdateUser } from '../services/AuthService';
import { doc, getDoc } from 'firebase/firestore'; 
import { db } from '../../firebaseConfig';

export default function UserDetailsScreen() {
  const params = useLocalSearchParams(); 
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const loadRealData = async () => {
      try {
        let freshStatus = params.accountStatus || 'Aktif';
        let freshSpending = params.totalSpending || '0';
        
        if (params.id) {
          const userRef = doc(db, "users", params.id);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            freshStatus = data.accountStatus || 'Aktif';
            freshSpending = data.totalSpending || '0';
          }
        }

        if (typeof freshSpending === 'number' || !String(freshSpending).includes('RM')) {
          freshSpending = `RM ${parseFloat(freshSpending).toFixed(2)}`;
        }

        setUserData({
          id: params.id || '-',
          fullName: params.fullName || '-',
          userName: params.userName || '-',
          icPassport: params.icPassport || '-',
          nationality: params.nationality || '-',
          email: params.email || '-',
          phone: params.phone || '-',
          emergencyContact: params.emergencyContact || '-',
          registrationDate: params.registrationDate || '-',
          accountStatus: freshStatus,
          totalTickets: params.totalTickets || '0',
          totalSpending: freshSpending
        });
        setIsLoading(false);
      } catch (error) {
        console.error("Gagal memuat turun data terkini:", error);
        setIsLoading(false);
      }
    };
    loadRealData();
  }, [params]);

  const handleToggleStatus = async () => {
    const isCurrentlyActive = userData.accountStatus === 'Aktif';
    const newStatus = isCurrentlyActive ? 'Digantung' : 'Aktif';
    const actionText = isCurrentlyActive ? 'menggantung' : 'mengaktifkan';

    Alert.alert(
      "Pengesahan",
      `Adakah anda pasti mahu ${actionText} akaun ini?`,
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Ya, Pasti", 
          style: isCurrentlyActive ? "destructive" : "default",
          onPress: async () => {
            setIsUpdating(true);
            try {
              await adminUpdateUser(userData.id, { accountStatus: newStatus });
              
              setUserData(prev => ({ ...prev, accountStatus: newStatus }));
              
              Alert.alert("Berjaya", `Akaun telah berjaya ${newStatus.toLowerCase()}.`);
            } catch (error) {
              Alert.alert("Ralat", "Gagal mengemaskini status akaun.");
            } finally {
              setIsUpdating(false);
            }
          } 
        }
      ]
    );
  };

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelContainer}>
        <Ionicons name={icon} size={18} color="#90A4AE" style={styles.infoIcon} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#03045E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Butiran Pelanggan</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading || !userData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
          <Text style={styles.loadingText}>Memuat turun butiran...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.profileCard}>
            <View style={styles.avatarBig}>
              <Text style={styles.avatarTextBig}>
                {userData.userName !== '-' ? userData.userName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <Text style={styles.profileName}>@{userData.userName}</Text>
            <Text style={styles.profileId}>ID: {userData.id}</Text>
            
            <View style={styles.badgesRow}>
              <View style={[
                styles.badge, 
                { backgroundColor: userData.accountStatus === 'Aktif' ? '#D1FAE5' : '#FEE2E2' }
              ]}>
                <Text style={[
                  styles.badgeText, 
                  { color: userData.accountStatus === 'Aktif' ? '#065F46' : '#DC2626' }
                ]}>
                  {userData.accountStatus}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
                <Text style={[styles.badgeText, { color: '#1E40AF' }]}>Pelanggan</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Sejarah Pembelian</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="ticket" size={24} color="#00B4D8" />
              <Text style={styles.statValue}>{userData.totalTickets}</Text>
              <Text style={styles.statLabel}>Tiket Dibeli</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="wallet" size={24} color="#0077B6" />
              <Text style={styles.statValue}>{userData.totalSpending}</Text>
              <Text style={styles.statLabel}>Jumlah Belanja</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Maklumat Peribadi</Text>
          <View style={styles.detailsCard}>
            <InfoRow icon="person-outline" label="Nama Penuh" value={userData.fullName} />
            <View style={styles.divider} />
            <InfoRow icon="card-outline" label="No. IC / Pasport" value={userData.icPassport} />
            <View style={styles.divider} />
            <InfoRow icon="flag-outline" label="Warganegaraan" value={userData.nationality} />
          </View>

          <Text style={styles.sectionTitle}>Perhubungan & Kecemasan</Text>
          <View style={styles.detailsCard}>
            <InfoRow icon="mail-outline" label="E-mel" value={userData.email} />
            <View style={styles.divider} />
            <InfoRow icon="call-outline" label="No. Telefon" value={userData.phone} />
            <View style={styles.divider} />
            <InfoRow icon="warning-outline" label="Kenalan Kecemasan" value={userData.emergencyContact} />
            <View style={styles.divider} />
            <InfoRow icon="calendar-outline" label="Tarikh Daftar" value={userData.registrationDate} />
          </View>

          <TouchableOpacity 
            style={[
              styles.actionButton, 
              { backgroundColor: userData.accountStatus === 'Aktif' ? '#EF4444' : '#10B981' }
            ]} 
            onPress={handleToggleStatus}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons 
                  name={userData.accountStatus === 'Aktif' ? "ban-outline" : "checkmark-circle-outline"} 
                  size={20} color="#FFFFFF" style={{ marginRight: 8 }} 
                />
                <Text style={styles.actionButtonText}>
                  {userData.accountStatus === 'Aktif' ? 'Gantung Akaun Ini' : 'Aktifkan Akaun Ini'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ================= Styles =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, backgroundColor: '#F1F5F9' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#03045E' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#0077B6', fontWeight: '500' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 20, alignItems: 'center', paddingVertical: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 25 },
  avatarBig: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#CAF0F8', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarTextBig: { fontSize: 32, fontWeight: 'bold', color: '#0077B6' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#03045E', marginBottom: 5 },
  profileId: { fontSize: 14, color: '#64748B', marginBottom: 15 },
  badgesRow: { flexDirection: 'row', gap: 10 },
  badge: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#03045E', marginBottom: 12, marginLeft: 5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center', marginHorizontal: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#03045E', marginTop: 10, marginBottom: 5 },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  detailsCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoLabelContainer: { flexDirection: 'row', alignItems: 'center', width: '45%' },
  infoIcon: { marginRight: 10 },
  infoLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  infoValue: { flex: 1, fontSize: 14, color: '#03045E', fontWeight: '600', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 2 },

  actionButton: { flexDirection: 'row', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});
import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, FlatList, ActivityIndicator, Modal, Image, 
  TouchableWithoutFeedback, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; 
import { logoutUser } from '../services/AuthService';

export default function UserManageScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterNationality, setFilterNationality] = useState('Semua');
  const [filterDateRange, setFilterDateRange] = useState('Semua'); 

  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);

  const handleLogout = async () => {
    try {
      setIsProfileMenuVisible(false);
      await logoutUser();
      Alert.alert("Berjaya", "Anda telah log keluar.");
      router.replace('/login');
    } catch (error) {
      Alert.alert("Ralat", error.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchUsers = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, "users"));
          const usersList = [];
          querySnapshot.forEach((doc) => {
            usersList.push({ id: doc.id, ...doc.data() });
          });
          setAllUsers(usersList);
        } catch (error) {
          console.log("Ralat mengambil data:", error);
          alert("Gagal memuat turun senarai pengguna.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchUsers();
    }, [])
  );

  const filteredUsers = allUsers.filter(user => {
    if (user.role === 'admin') return false;

    const lowerCaseQuery = searchQuery.toLowerCase();
    const searchStr = `${user.fullName} ${user.userName || user.username} ${user.email} ${user.id} ${user.icPassport || user.ic} ${user.emergencyContact}`.toLowerCase();
    const matchesSearch = !searchQuery || searchStr.includes(lowerCaseQuery);

    const matchesStatus = filterStatus === 'Semua' || (user.accountStatus || 'Aktif') === filterStatus;

    const userNat = (user.nationality || '').toLowerCase();
    const isMalaysian = userNat === 'malaysia' || userNat === 'malaysian';
    const matchesNationality = filterNationality === 'Semua' || (filterNationality === 'Malaysian' ? isMalaysian : (!isMalaysian && userNat !== ''));

    const matchesDate = (() => {
      if (filterDateRange === 'Semua') return true;
      if (!user.createdAt) return false;

      const userDate = user.createdAt.toDate();
      const now = new Date();

      if (filterDateRange === 'Hari Ini') {
        return userDate.toDateString() === now.toDateString();
      }
      if (filterDateRange === 'Bulan Ini') {
        return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
      }
      if (filterDateRange === 'Tahun Ini') {
        return userDate.getFullYear() === now.getFullYear();
      }
      return true;
    })();

    return matchesSearch && matchesStatus && matchesNationality && matchesDate;
  });

  const renderUserCard = ({ item }) => {
    const userNameDisplay = item.userName || item.username || '-';
    let formattedDate = '-';
    if (item.createdAt && typeof item.createdAt.toDate === 'function') {
      formattedDate = item.createdAt.toDate().toLocaleString('ms-MY', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }); 
    }

    const initial = userNameDisplay !== '-' ? userNameDisplay.charAt(0).toUpperCase() : '?';
    const status = item.accountStatus || 'Aktif';
    const isAktif = status === 'Aktif';

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.userName}>@{userNameDisplay}</Text>
            <Text style={styles.userId}>ID: {item.id}</Text>
          </View>
        </View>
        
        <View style={styles.actionContainer}>
          <Text style={[styles.statusText, { color: isAktif ? '#10B981' : '#EF4444' }]}>
            {status}
          </Text>
          <TouchableOpacity 
            style={styles.viewButton} 
            onPress={() => router.push({ 
              pathname: '/userdetails', 
              params: { 
                id: item.id, fullName: item.fullName || '-', userName: userNameDisplay,
                email: item.email || '-', phone: item.phone || '-', icPassport: item.icPassport || item.ic || '-',
                nationality: item.nationality || '-', emergencyContact: item.emergencyContact || '-',
                registrationDate: formattedDate, accountStatus: status,
                totalTickets: item.totalTickets || '0', totalSpending: item.totalSpending || '0'
              } 
            })}
          >
            <Text style={styles.viewButtonText}>Lihat Butiran</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const FilterChip = ({ label, selectedValue, onSelect }) => (
    <TouchableOpacity 
      style={[styles.chip, selectedValue === label && styles.chipActive]} 
      onPress={() => onSelect(label)}
    >
      <Text style={[styles.chipText, selectedValue === label && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Akaun Pelanggan</Text>
          <Text style={styles.headerSubtitle}>Urus pengguna sistem</Text>
        </View>
        
        <TouchableOpacity onPress={() => setIsProfileMenuVisible(true)}>
          <Image 
            source={{ uri: 'https://ui-avatars.com/api/?name=Admin&background=03045E&color=fff&size=128' }} 
            style={styles.profileImage} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#90A4AE" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Cari nama, ID, IC, no. kecemasan..." 
            placeholderTextColor="#90A4AE"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setIsFilterVisible(true)}>
          <Ionicons name="options-outline" size={24} color="#FFFFFF" />
          {(filterStatus !== 'Semua' || filterNationality !== 'Semua' || filterDateRange !== 'Semua') && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listHeader}>Senarai Pelanggan ({filteredUsers.length})</Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0077B6" />
            <Text style={styles.loadingText}>Memuat turun data...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserCard}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }} 
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={50} color="#90A4AE" />
                <Text style={styles.emptyText}>Tiada pengguna dijumpai.</Text>
              </View>
            }
          />
        )}
      </View>

      <Modal transparent={true} visible={isProfileMenuVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsProfileMenuVisible(false)}>
          <View style={styles.menuModalOverlay}>
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

      <Modal animationType="slide" transparent={true} visible={isFilterVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterContainer}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Tapis Pengguna</Text>
              <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#90A4AE" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Tarikh Daftar</Text>
              <View style={styles.chipRow}>
                <FilterChip label="Semua" selectedValue={filterDateRange} onSelect={setFilterDateRange} />
                <FilterChip label="Hari Ini" selectedValue={filterDateRange} onSelect={setFilterDateRange} />
                <FilterChip label="Bulan Ini" selectedValue={filterDateRange} onSelect={setFilterDateRange} />
                <FilterChip label="Tahun Ini" selectedValue={filterDateRange} onSelect={setFilterDateRange} />
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status Akaun</Text>
              <View style={styles.chipRow}>
                <FilterChip label="Semua" selectedValue={filterStatus} onSelect={setFilterStatus} />
                <FilterChip label="Aktif" selectedValue={filterStatus} onSelect={setFilterStatus} />
                <FilterChip label="Digantung" selectedValue={filterStatus} onSelect={setFilterStatus} />
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Negara Asal</Text>
              <View style={styles.chipRow}>
                <FilterChip label="Semua" selectedValue={filterNationality} onSelect={setFilterNationality} />
                <FilterChip label="Malaysian" selectedValue={filterNationality} onSelect={setFilterNationality} />
                <FilterChip label="Luar Negara" selectedValue={filterNationality} onSelect={setFilterNationality} />
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.resetBtn} onPress={() => {
                  setFilterStatus('Semua'); setFilterNationality('Semua'); setFilterDateRange('Semua');
              }}>
                <Text style={styles.actionBtnText}>Set Semula</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setIsFilterVisible(false)}>
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Gunakan Tapis</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
        <TouchableOpacity style={styles.tabItem}><Ionicons name="people" size={24} color="#0077B6" /><Text style={[styles.tabText, styles.tabTextActive]}>Pengguna</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}><Ionicons name="stats-chart-outline" size={24} color="#90A4AE" /><Text style={styles.tabText}>Kewangan</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}><Ionicons name="notifications-outline" size={24} color="#90A4AE" /><Text style={styles.tabText}>Notifikasi</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/adminsystem')}>
          <Ionicons name="settings-outline" size={24} color="#90A4AE" />
          <Text style={styles.tabText}>Sistem</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 15, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#03045E' },
  headerSubtitle: { fontSize: 16, color: '#0077B6', fontWeight: '600' },
  profileImage: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: '#03045E' },
  searchSection: { flexDirection: 'row', paddingHorizontal: 25, marginTop: 15, marginBottom: 20, alignItems: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', backgroundColor: '#FFFFFF', height: 50, borderRadius: 15, alignItems: 'center', paddingHorizontal: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#03045E' },
  filterButton: { backgroundColor: '#0077B6', width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginLeft: 15, shadowColor: '#0077B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  filterBadge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4757' },
  listContainer: { flex: 1, paddingHorizontal: 25 },
  listHeader: { fontSize: 14, fontWeight: 'bold', color: '#64748B', marginBottom: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { marginTop: 10, color: '#0077B6', fontWeight: '500' },
  userCard: { backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#CAF0F8', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#0077B6' },
  textContainer: { flex: 1, paddingRight: 10 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#03045E', marginBottom: 2 },
  userId: { fontSize: 11, color: '#90A4AE' },
  actionContainer: { alignItems: 'flex-end' },
  statusText: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  viewButton: { backgroundColor: '#00B4D8', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  viewButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 10, color: '#90A4AE', fontSize: 16 },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingBottom: 20, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, color: '#90A4AE', marginTop: 6, fontWeight: '500', textAlign: 'center' },
  tabTextActive: { color: '#0077B6', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  filterContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  filterTitle: { fontSize: 22, fontWeight: 'bold', color: '#03045E' },
  filterSection: { marginBottom: 25 },
  filterLabel: { fontSize: 15, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#0077B6', borderColor: '#0077B6' },
  chipText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  chipTextActive: { color: '#FFFFFF' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  resetBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 14, backgroundColor: '#F1F5F9', marginRight: 10 },
  applyBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 14, backgroundColor: '#00B4D8', marginLeft: 10 },
  actionBtnText: { fontWeight: 'bold', fontSize: 16, color: '#64748B' },
  menuModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  dropdownMenu: { position: 'absolute', top: 70, right: 25, width: 160, backgroundColor: '#FFFFFF', borderRadius: 15, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  menuText: { fontSize: 16, marginLeft: 15, fontWeight: '500' }
});
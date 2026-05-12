import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, Image, ScrollView, Modal, TouchableWithoutFeedback, 
  FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider'; 
import { logoutUser } from '../services/AuthService';
import { getAllParks } from '../services/ParkService';
import NotificationBell from '../components/NotificationBell';
import MaintenanceOverlay from '../components/MaintenanceOverlay';

export default function UserMainPage() {
  const [parks, setParks] = useState([]);
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedNegeri, setSelectedNegeri] = useState('Semua');
  const [maxPrice, setMaxPrice] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');

  const NEGERI_LIST = [
    { label: 'Semua Negeri', value: 'Semua' },
    { label: 'Johor', value: 'Johor' }, { label: 'Kedah', value: 'Kedah' },
    { label: 'Kelantan', value: 'Kelantan' }, { label: 'Melaka', value: 'Melaka' },
    { label: 'Negeri Sembilan', value: 'Negeri Sembilan' }, { label: 'Pahang', value: 'Pahang' },
    { label: 'Perak', value: 'Perak' }, { label: 'Perlis', value: 'Perlis' },
    { label: 'Pulau Pinang', value: 'Pulau Pinang' }, { label: 'Sabah', value: 'Sabah' },
    { label: 'Sarawak', value: 'Sarawak' }, { label: 'Selangor', value: 'Selangor' },
    { label: 'Terengganu', value: 'Terengganu' }, { label: 'WP Kuala Lumpur', value: 'WP Kuala Lumpur' },
    { label: 'WP Labuan', value: 'WP Labuan' }, { label: 'WP Putrajaya', value: 'WP Putrajaya' },
  ];

  const fetchParks = async () => {
    try {
      const data = await getAllParks();
      setParks(data.filter(p => p.status === 'Aktif'));
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      setIsProfileMenuVisible(false);
      await logoutUser();
      alert("Anda telah berjaya log keluar.");
      router.replace('/login');
    } catch (error) {
      alert("Ralat: " + error.message);
    }
  };

  useEffect(() => { 
    fetchParks(); 
  }, []);

  const filteredParks = parks.filter(park => {
    const matchesNegeri = selectedNegeri === 'Semua' || park.negeri === selectedNegeri;
    const matchesPrice = maxPrice === '' || (parseFloat(park.pricing?.msia?.adult || 0) <= parseFloat(maxPrice));
    
    const queryStr = searchQuery.toLowerCase().trim();
    const matchesSearch = queryStr === '' || 
                          park.name.toLowerCase().includes(queryStr) || 
                          (park.negeri && park.negeri.toLowerCase().includes(queryStr));

    return matchesNegeri && matchesPrice && matchesSearch;
  });

  const isFilterActive = selectedNegeri !== 'Semua' || maxPrice !== 100;

  return (
    <SafeAreaView style={styles.container}>
      
      <MaintenanceOverlay />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Acara Penemuan</Text>
        <View style={styles.headerIcons}>
          
          <NotificationBell />

          <TouchableOpacity onPress={() => setIsProfileMenuVisible(true)}>
            <Image source={{ uri: 'https://ui-avatars.com/api/?name=User&background=0077B6&color=fff&size=128' }} style={styles.profileImage} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#90A4AE" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Cari taman laut, negeri..." 
            placeholderTextColor="#90A4AE" 
            value={searchQuery}
            onChangeText={setSearchQuery} 
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setIsFilterModalVisible(true)}>
          <Ionicons name="options-outline" size={24} color="#FFFFFF" />
          {isFilterActive && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Taman Laut Malaysia</Text>
        <Text style={styles.sectionSubtitle}>Pengalaman marin eksklusif menanti anda</Text>

        <View style={styles.verticalEventList}>
          {filteredParks.length > 0 ? (
            filteredParks.map((park) => (
              <View key={park.id} style={styles.eventCard}>
                <TouchableOpacity 
                  style={styles.imageContainer}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/buyticket', params: { id: park.id } })}
                >
                  <Image 
                    source={{ 
                      uri: park.imageUrl 
                        ? park.imageUrl.trim().replace(/ /g, '%20')
                        : 'https://via.placeholder.com/800' 
                    }} 
                    style={styles.eventImage} 
                    resizeMode="cover"
                  />
                  <View style={styles.locationBadge}>
                    <Ionicons name="location" size={12} color="#FFFFFF" />
                    <Text style={styles.locationBadgeText}>{park.negeri}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.eventInfo}>
                  <View style={styles.eventTextContainer}>
                    <Text style={styles.eventName} numberOfLines={1}>{park.name}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.bookButton} 
                    activeOpacity={0.8}
                    onPress={() => router.push({ pathname: '/buyticket', params: { id: park.id } })}
                  >
                    <Text style={styles.bookButtonText}>Tempah Sekarang</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ textAlign: 'center', color: '#90A4AE', marginTop: 30, fontSize: 16 }}>
              Tiada hasil carian untuk "{searchQuery}".
            </Text>
          )}
        </View>
        <View style={styles.emptySpace}></View>
      </ScrollView>

      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="compass" size={32} color="#0077B6" />
          <Text style={[styles.tabText, styles.tabTextActive]}>Laman Utama</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/mytickets')}>
          <Ionicons name="ticket-outline" size={32} color="#90A4AE" />
          <Text style={styles.tabText}>Tiket Saya</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/weather')}>
          <Ionicons name="partly-sunny-outline" size={32} color="#90A4AE" />
          <Text style={styles.tabText}>Cuaca</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/usermap')}>
          <Ionicons name="map-outline" size={32} color="#90A4AE" />
          <Text style={styles.tabText}>Peta</Text>
        </TouchableOpacity>
      </View>

      <Modal transparent={true} visible={isProfileMenuVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsProfileMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownMenu}>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setIsProfileMenuVisible(false); router.push('/editprofile'); }}>
                  <Ionicons name="person-outline" size={20} color="#03045E" />
                  <Text style={styles.menuText}>Maklumat Akaun</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.menuItem} onPress={() => { setIsProfileMenuVisible(false); router.push('/favorites')}}>
                  <Ionicons name="heart-outline" size={20} color="#03045E" />
                  <Text style={styles.menuText}>Kegemaran</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                  <Text style={[styles.menuText, { color: '#ef4444' }]}>Log Keluar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal transparent={true} visible={isFilterModalVisible} animationType="fade">
        <View style={styles.filterModalOverlay}>
          {!showPicker ? (
            <View style={styles.filterModalContainer}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Penapis Carian</Text>
                <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#03045E" />
                </TouchableOpacity>
              </View>

              <Text style={styles.filterLabel}>Pilih Negeri</Text>
              <TouchableOpacity 
                style={[styles.pickerWrapper, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15 }]} 
                onPress={() => setShowPicker(true)}
              >
                <Text style={{ color: '#334155', fontSize: 16 }}>
                  {selectedNegeri === 'Semua' ? 'Semua Negeri' : selectedNegeri}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#94A3B8" />
              </TouchableOpacity>

              <Text style={styles.filterLabel}>Harga Maksimum (Dewasa): RM {maxPrice}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={5}
                value={maxPrice}
                onValueChange={setMaxPrice}
                minimumTrackTintColor="#0077B6"
                maximumTrackTintColor="#CBD5E1"
                thumbTintColor="#0077B6"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>RM 0</Text>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>RM 100</Text>
              </View>

              <TouchableOpacity style={styles.applyFilterBtn} onPress={() => setIsFilterModalVisible(false)}>
                <Text style={styles.applyFilterText}>Gunakan Penapis</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ width: '85%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 10, elevation: 10, maxHeight: '70%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#03045E' }}>Pilih Negeri</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Ionicons name="close-circle" size={26} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={NEGERI_LIST}
                keyExtractor={(item) => item.value}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.pickerItem} 
                    onPress={() => { 
                      setSelectedNegeri(item.value); 
                      setShowPicker(false); 
                    }}
                  >
                    <Text style={styles.pickerItemText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 10, paddingBottom: 15 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#03045E', letterSpacing: 0.5 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  profileImage: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: '#0077B6' },
  
  searchSection: { flexDirection: 'row', paddingHorizontal: 25, marginBottom: 25, alignItems: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', backgroundColor: '#FFFFFF', height: 52, borderRadius: 16, alignItems: 'center', paddingHorizontal: 15, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#03045E' },
  filterButton: { backgroundColor: '#0077B6', width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 15, shadowColor: '#0077B6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, position: 'relative' },
  filterBadge: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, backgroundColor: '#EF4444', borderRadius: 5, borderWidth: 2, borderColor: '#0077B6' },
  
  scrollContent: { paddingTop: 0, paddingBottom: 120 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: '#03045E', paddingHorizontal: 25 },
  sectionSubtitle: { fontSize: 14, color: '#64748B', paddingHorizontal: 25, marginBottom: 20, marginTop: 4 },
  
  verticalEventList: { paddingHorizontal: 25 },
  eventCard: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 24, shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6, marginBottom: 20 },
  imageContainer: { position: 'relative', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: '#E2E8F0' },
  eventImage: { width: '100%', height: 190 },

  locationBadge: { position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(0, 0, 0, 0.65)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backdropFilter: 'blur(10px)' },
  locationBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginLeft: 4 },

  eventInfo: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTextContainer: { flex: 1, paddingRight: 15 },
  eventName: { fontSize: 19, fontWeight: '800', color: '#03045E' },
  
  bookButton: { backgroundColor: '#0077B6', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, shadowColor: '#0077B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  bookButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  
  emptySpace: { height: 50 },
  
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 20, borderTopLeftRadius: 35, borderTopRightRadius: 35, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 15 },
  tabItem: { width: 70, alignItems: 'center', paddingTop: 0 },
  tabText: { fontSize: 11, color: '#94A3B8', marginTop: 6, fontWeight: '600', textAlign: 'center' },
  tabTextActive: { color: '#0077B6', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  dropdownMenu: { position: 'absolute', top: 70, right: 25, width: 180, backgroundColor: '#FFFFFF', borderRadius: 15, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  menuText: { fontSize: 16, color: '#03045E', marginLeft: 15, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 15 },
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  filterModalContainer: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 25, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 15 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  filterTitle: { fontSize: 20, fontWeight: 'bold', color: '#03045E' },
  filterLabel: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginBottom: 8, marginTop: 10 },
  pickerWrapper: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#F8FAFC', height: 48, justifyContent: 'center', marginBottom: 15 },
  slider: { width: '100%', height: 40, marginTop: 10 },
  applyFilterBtn: { backgroundColor: '#0077B6', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 25 },
  applyFilterText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  pickerModalOverlay: { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerDropdown: { width: '85%',maxHeight: 350, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
  pickerTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E', padding: 15, textAlign: 'center' },
  pickerItem: { paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerItemText: { fontSize: 16, color: '#334155' },
});
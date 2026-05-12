import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Image, ScrollView, ActivityIndicator, Alert, ImageBackground 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { getParkById } from '../services/ParkService'; 
import MaintenanceOverlay from '../components/MaintenanceOverlay';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; 

export default function BuyTicketScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); 
  
  const [park, setPark] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isWarganegara, setIsWarganegara] = useState(true);
  const [ticketCounts, setTicketCounts] = useState({ adult: 0, child: 0, senior: 0, oku: 0 });
  const [selectedDate, setSelectedDate] = useState('15 Mei 2026'); 

  const [selectedDateObj, setSelectedDateObj] = useState(new Date()); 
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const auth = getAuth();

  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  
  const maxDate = new Date();
  maxDate.setFullYear(today.getFullYear() + 1);
  maxDate.setHours(23, 59, 59, 999); 

  const formatBulan = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
  const formattedDate = `${selectedDateObj.getDate()} ${formatBulan[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear()}`;
  
  useEffect(() => {
    if (id) {
      fetchParkDetails();
      checkFavorite();
    }
  }, [id]);

  const fetchParkDetails = async () => {
    try {
      const data = await getParkById(id);
      setPark(data);
    } catch (error) {
      Alert.alert('Ralat', 'Gagal memuatkan data taman laut.');
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId || !id) return;

    try {
      const q = query(
        collection(db, "favorites"),
        where("userId", "==", userId),
        where("parkId", "==", id)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setIsFavorite(true);
        setFavoriteId(querySnapshot.docs[0].id);
      }
    } catch (error) {
      console.log("Error checking favorite:", error);
    }
  };

  const toggleFavorite = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert("Perhatian", "Sila log masuk untuk menggunakan fungsi kegemaran.");
      return;
    }

    try {
      if (isFavorite) {
        await deleteDoc(doc(db, "favorites", favoriteId));
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        const docRef = await addDoc(collection(db, "favorites"), {
          userId,
          parkId: id,
          parkName: park.name,
          imageUrl: park.imageUrl || '',
          negeri: park.negeri || '',
          createdAt: serverTimestamp(),
        });
        setIsFavorite(true);
        setFavoriteId(docRef.id);
      }
    } catch (error) {
      Alert.alert("Ralat", "Gagal mengemaskini kegemaran.");
      console.error("Favorite Error:", error);
    }
  };

  const updateCount = (type, operation) => {
    setTicketCounts(prev => {
      const current = prev[type];
      const next = operation === 'add' ? current + 1 : current - 1;
      return { ...prev, [type]: Math.max(0, next) }; 
    });
  };

  const handleCategoryChange = (isLocal) => {
    if (isWarganegara !== isLocal) {
      setIsWarganegara(isLocal); 
      setTicketCounts({ adult: 0, child: 0, senior: 0, oku: 0 }); 
    }
  };

  const calculateTotal = () => {
    if (!park || !park.pricing) return 0;
    const category = isWarganegara ? 'msia' : 'intl';
    const prices = park.pricing[category];
    
    let total = 0;
    total += (ticketCounts.adult * parseFloat(prices.adult || 0));
    total += (ticketCounts.child * parseFloat(prices.child || 0));
    total += (ticketCounts.senior * parseFloat(prices.senior || 0));
    total += (ticketCounts.oku * parseFloat(prices.oku || 0));
    return total;
  };

  const handleCheckout = () => {
    const total = calculateTotal();
    if (total === 0) {
      Alert.alert('Perhatian', 'Sila pilih sekurang-kurangnya 1 tiket.');
      return;
    }

    router.push({
      pathname: '/confirmOrder',
      params: {
        parkId: park.id,
        parkName: park.name,
        date: formattedDate,
        total: total,
        adult: ticketCounts.adult,
        child: ticketCounts.child,
        senior: ticketCounts.senior,
        oku: ticketCounts.oku
      }
    });
  };

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  
  const handleConfirmDate = (date) => {
    if (date.getTime() > maxDate.getTime()) {
      Alert.alert(
        "Tarikh Tidak Sah", 
        "Anda hanya boleh menempah tiket untuk tempoh maksimum satu tahun dari hari ini."
      );
      setSelectedDateObj(maxDate); 
    } 
    else if (date.getTime() < today.getTime()) {
      Alert.alert(
        "Tarikh Tidak Sah", 
        "Sila pilih tarikh bermula dari hari ini."
      );
      setSelectedDateObj(today); 
    } 
    else {
      setSelectedDateObj(date);
    }
    
    hideDatePicker();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={{ marginTop: 15, color: '#0077B6', fontWeight: 'bold' }}>Memuatkan tiket...</Text>
      </SafeAreaView>
    );
  }

  if (!park) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={{color: '#94A3B8'}}>Taman Laut tidak dijumpai.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{marginTop: 20}}>
          <Text style={{color: '#0077B6', fontWeight: 'bold'}}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentPrices = isWarganegara ? park.pricing.msia : park.pricing.intl;
  const totalPrice = calculateTotal();

  const TicketCounter = ({ label, type, price }) => (
    <View style={styles.counterRow}>
      <View>
        <Text style={styles.counterLabel}>{label}</Text>
        <Text style={styles.counterPrice}>RM {parseFloat(price || 0).toFixed(2)}</Text>
      </View>
      <View style={styles.counterControls}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => updateCount(type, 'minus')}>
          <Ionicons name="remove" size={18} color="#03045E" />
        </TouchableOpacity>
        <Text style={styles.countText}>{ticketCounts[type]}</Text>
        <TouchableOpacity style={styles.controlBtn} onPress={() => updateCount(type, 'add')}>
          <Ionicons name="add" size={18} color="#03045E" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ImageBackground 
      source={{ uri: park.imageUrl || 'https://via.placeholder.com/800' }} 
      style={styles.backgroundImage}
      blurRadius={15}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
        <MaintenanceOverlay />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tempahan Tiket</Text>
            <View style={{ width: 28 }} /> 
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.ticketContainer}>
              
              <Image source={{ uri: park.imageUrl || 'https://via.placeholder.com/800' }} style={styles.ticketImage} />
              
              <View style={styles.ticketHeader}>
                <Text style={styles.parkName}>{park.name}</Text>
                <Text style={styles.parkLocation}><Ionicons name="location" size={14}/> {park.negeri}</Text>
              </View>

              <View style={styles.dashedDividerContainer}>
                <View style={styles.cutoutLeft} />
                <View style={styles.dashedLine} />
                <View style={styles.cutoutRight} />
              </View>

              <View style={styles.ticketBody}>
                
                <Text style={styles.sectionTitle}>Tarikh Lawatan</Text>
                <TouchableOpacity style={styles.dateSelector} onPress={showDatePicker}>
                  <Ionicons name="calendar-outline" size={20} color="#0077B6" />
                  <Text style={styles.dateText}>{formattedDate}</Text>
                  <Ionicons name="pencil" size={16} color="#94A3B8" />
                </TouchableOpacity>

                <DateTimePickerModal
                  isVisible={isDatePickerVisible}
                  mode="date"
                  display="spinner"
                  onConfirm={handleConfirmDate}
                  onCancel={hideDatePicker}
                  minimumDate={today} 
                  maximumDate={maxDate} 
                  confirmTextIOS="Pilih" 
                  cancelTextIOS="Batal"
                  pickerComponentStyleIOS={styles.iosPickerStyle}
                />

                <Text style={styles.sectionTitle}>Lokasi Taman Laut</Text>
                <View style={styles.mapCard}>
                  <View style={styles.addressBox}>
                    <Ionicons name="location-sharp" size={16} color="#0077B6" />
                    <Text style={styles.addressText} numberOfLines={2}>
                      {park.address || "Sila rujuk peta di bawah untuk lokasi"}
                    </Text>
                  </View>
                  
                  <View style={styles.mapWrapper}>
                    <MapView 
                      style={{ flex: 1 }}
                      initialRegion={{
                        latitude: park.location?.latitude || 4.2105,
                        longitude: park.location?.longitude || 101.9758,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                      }}
                      scrollEnabled={true} 
                      zoomEnabled={true}   
                      pitchEnabled={false}  
                      rotateEnabled={false} 
                    >
                      {park.location && (
                        <Marker 
                          coordinate={park.location} 
                          title={park.name}
                          pinColor="#0077B6"
                        />
                      )}
                    </MapView>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Kategori Pengunjung</Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, isWarganegara && styles.toggleBtnActive]} 
                    onPress={() => handleCategoryChange(true)}
                  >
                    <Text style={[styles.toggleText, isWarganegara && styles.toggleTextActive]}>Warganegara</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.toggleBtn, !isWarganegara && styles.toggleBtnActive]} 
                    onPress={() => handleCategoryChange(false)}
                  >
                    <Text style={[styles.toggleText, !isWarganegara && styles.toggleTextActive]}>Bukan Warganegara</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Kuantiti Tiket</Text>
                <TicketCounter label="Dewasa" type="adult" price={currentPrices.adult} />
                <View style={styles.divider} />
                <TicketCounter label="Kanak-kanak" type="child" price={currentPrices.child} />
                <View style={styles.divider} />
                <TicketCounter label="Warga Emas" type="senior" price={currentPrices.senior} />
                <View style={styles.divider} />
                <TicketCounter label="OKU" type="oku" price={currentPrices.oku} />

              </View>
            </View>

          </ScrollView>

          <View style={styles.bottomBar}>
            <TouchableOpacity 
              style={styles.favoriteBtn} 
              onPress={toggleFavorite}
            >
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={28} 
                color={isFavorite ? "#EF4444" : "#64748B"} 
              />
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.totalLabel}>Jumlah Bayaran</Text>
              <Text style={styles.totalPrice}>RM {totalPrice.toFixed(2)}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.checkoutBtn, totalPrice === 0 && { backgroundColor: '#94A3B8' }]} 
              onPress={handleCheckout} 
              disabled={totalPrice === 0}
            >
              <Text style={styles.checkoutBtnText}>Semak Keluar</Text>
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

// ================= Styles =================
const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }, 
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  backButton: { padding: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' }, 
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 },
  
  ticketContainer: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    overflow: 'hidden', 
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  ticketImage: { width: '100%', height: 180 },
  ticketHeader: { padding: 20, paddingBottom: 15 },
  parkName: { fontSize: 24, fontWeight: 'bold', color: '#03045E', marginBottom: 5 },
  parkLocation: { fontSize: 14, color: '#64748B', fontWeight: '500' },

  dashedDividerContainer: { flexDirection: 'row', alignItems: 'center', height: 30, backgroundColor: '#FFF' },
  cutoutLeft: { width: 15, height: 30, backgroundColor: '#2b2b2b', borderTopRightRadius: 15, borderBottomRightRadius: 15, marginLeft: -1 }, 
  cutoutRight: { width: 15, height: 30, backgroundColor: '#2b2b2b', borderTopLeftRadius: 15, borderBottomLeftRadius: 15, marginRight: -1 },
  dashedLine: { flex: 1, height: 1, borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', marginHorizontal: 10 },

  ticketBody: { padding: 20, paddingTop: 5 },
  
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#03045E', marginBottom: 12, marginTop: 10 },
  
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 15 },
  dateText: { flex: 1, marginLeft: 10, fontSize: 15, color: '#334155', fontWeight: 'bold' },
  iosPickerStyle: {
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
  },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  toggleText: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },
  toggleTextActive: { color: '#0077B6' },

  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  counterLabel: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  counterPrice: { fontSize: 13, color: '#0077B6', marginTop: 2, fontWeight: '600' },
  counterControls: { flexDirection: 'row', alignItems: 'center' },
  controlBtn: { width: 32, height: 32, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 16, fontWeight: 'bold', color: '#03045E', width: 35, textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#F8FAFC', marginVertical: 2 },

  favoriteBtn: {
    width: 50,
    height: 50,
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 20 },
  totalLabel: { fontSize: 12, color: '#64748B', fontWeight: 'bold' },
  totalPrice: { fontSize: 24, fontWeight: 'bold', color: '#03045E', marginTop: 2 },
  checkoutBtn: { backgroundColor: '#0077B6', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 15, elevation: 3 },
  checkoutBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  mapCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 20,
  },
  addressBox: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  addressText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  mapWrapper: {
    width: '100%',
    height: 150, 
  },
});
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ActivityIndicator, Image, Modal, TouchableWithoutFeedback, 
  Platform, Linking, Alert, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import MaintenanceOverlay from '../components/MaintenanceOverlay'; 

const { width, height } = Dimensions.get('window');

export default function UserMapScreen() {
  const router = useRouter();
  const mapRef = useRef(null);
  const [androidMarkerPatch, setAndroidMarkerPatch] = useState(0);
  
  const [parks, setParks] = useState([]);
  const [filteredParks, setFilteredParks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [statesList, setStatesList] = useState(['Semua']);
  const [selectedState, setSelectedState] = useState('Semua');
  const [showFilter, setShowFilter] = useState(false);
  const { width, height } = Dimensions.get('window');
  
  const [selectedPark, setSelectedPark] = useState(null);
  const [trackMarkers, setTrackMarkers] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAndroidMarkerPatch(0);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {

    const fetchParks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "parks"));
        const parkList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(park => park.location && park.location.latitude);

        setParks(parkList);
        setFilteredParks(parkList);

        const extractedStates = [...new Set(parkList.map(p => p.negeri || p.state || 'Lain-lain'))]
          .filter(state => state !== 'Lain-lain');
        setStatesList(['Semua', ...extractedStates]);

        if (parkList.length > 0) {
          const timer = setTimeout(() => {
            if (mapRef.current) {
              const coordinates = parkList.map(p => ({
                latitude: parseFloat(p.location.latitude),
                longitude: parseFloat(p.location.longitude)
              }));
              
              try {
                mapRef.current.fitToCoordinates(coordinates, {
                  edgePadding: { top: 180, right: 80, bottom: 320, left: 80 },
                  animated: true,
                });
              } catch (e) {
                console.warn("Map not ready yet");
              }
            }
          }, 1000);
          return () => clearTimeout(timer);
        }

      } catch (error) {
        console.error("Error fetching map data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchParks();
  }, []);

  const handleFilterSelect = (stateName) => {
    setSelectedState(stateName);
    setShowFilter(false);
    setSelectedPark(null);

    const newFiltered = stateName === 'Semua' 
      ? parks 
      : parks.filter(p => {
          const pState = (p.negeri || p.state || 'Lain-lain').trim().toLowerCase();
          return pState === stateName.trim().toLowerCase();
        });
      
    setFilteredParks(newFiltered);

    setTimeout(() => {
      if (mapRef.current && newFiltered.length > 0) {
        if (newFiltered.length === 1) {
          mapRef.current.animateToRegion({
            latitude: parseFloat(newFiltered[0].location.latitude),
            longitude: parseFloat(newFiltered[0].location.longitude),
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          }, 1000);
        } else {
          const coordinates = newFiltered.map(p => ({
            latitude: parseFloat(p.location.latitude),
            longitude: parseFloat(p.location.longitude)
          }));
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 180, right: 80, bottom: 320, left: 80 }, 
            animated: true,
          });
        }
      }
    }, 150);
  };

  const handleMarkerPress = (park) => {
    setSelectedPark(park);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: parseFloat(park.location.latitude),
        longitude: parseFloat(park.location.longitude),
        latitudeDelta: 0.18,
        longitudeDelta: 0.18,
      }, 1000);
    }
  };

  const openGoogleMaps = (park) => {
    const lat = park.location.latitude;
    const lon = park.location.longitude;
    const label = encodeURIComponent(park.name || "Taman Laut"); 

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}(${label})`,
    });

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          const browserUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
          Linking.openURL(browserUrl).catch(() => {
            Alert.alert("Ralat", "Tidak dapat membuka peta di telefon anda.");
          });
        }
      })
      .catch((err) => {
        console.log("Routing Error:", err);
        Alert.alert("Ralat", "Sistem peta sedang sibuk.");
      });
  };

  const handleDummyPress = (featureName) => {
    Alert.alert("Akan Datang", `Fungsi ${featureName} akan datang!`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#03045E" />
        <Text style={{ marginTop: 15, color: '#03045E', fontWeight: 'bold' }}>Memuatkan Peta...</Text>
      </SafeAreaView>
    );
  }

  const initialRegion = parks.length > 0 ? {
    latitude: parseFloat(parks[0].location.latitude),
    longitude: parseFloat(parks[0].location.longitude),
    latitudeDelta: 5.0,
    longitudeDelta: 5.0,
  } : {
    latitude: 4.2105, longitude: 101.9758, latitudeDelta: 5.0, longitudeDelta: 5.0,
  };

  return (
    <View style={styles.container}>
      <MaintenanceOverlay />
      <View style={{ width: width, height: height }}>
        <MapView 
          ref={mapRef}
          provider={Platform.OS === 'android' ? "google" : undefined}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          showsUserLocation={false} 
        >
          {filteredParks.map((park) => (
            <Marker
              key={`${park.id}-${trackMarkers}`}
              coordinate={{
                latitude: parseFloat(park.location.latitude),
                longitude: parseFloat(park.location.longitude),
              }}
              onPress={() => handleMarkerPress(park)}
              tracksViewChanges={true} 
            >
              <View style={styles.markerContainer} collapsable={false}>
                <View style={styles.markerBubble}>
                  <MaterialCommunityIcons name="island" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.markerTriangle} />
              </View>
            </Marker>
          ))}
        </MapView>
      </View>

      <SafeAreaView style={styles.topFilterContainer} pointerEvents="box-none">
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilter(true)}>
          <Ionicons name="filter" size={20} color="#03045E" />
          <Text style={styles.filterText}>
            Lokasi: <Text style={{fontWeight: 'bold'}}>{selectedState}</Text>
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </TouchableOpacity>
      </SafeAreaView>

      {selectedPark && (
        <View style={styles.cardWrapper}>
          <TouchableOpacity 
            style={styles.parkCard} 
            activeOpacity={0.9} 
            onPress={() => router.push(`/buyticket?id=${selectedPark.id}`)}
          >
            <Image 
                source={{ uri: selectedPark.imageUrl || selectedPark.image || (selectedPark.imageUrls && selectedPark.imageUrls[0]) || 'https://via.placeholder.com/150' }} 
                style={styles.cardImage} 
            />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{selectedPark.name}</Text>
              
              <Text style={styles.cardDesc} numberOfLines={2}>
                {selectedPark.description || 'Terokai keindahan hidupan marin dan terumbu karang yang menakjubkan di sini.'}
              </Text>
              
              <TouchableOpacity 
                style={styles.navButton} 
                onPress={() => openGoogleMaps(selectedPark)}
              >
                <Ionicons name="navigate-circle" size={22} color="#FFFFFF" />
                <Text style={styles.navButtonText}>Buka Navigasi</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showFilter} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowFilter(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownBox}>
                <Text style={styles.modalTitle}>Pilih Negeri</Text>
                {statesList.map((state, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.dropdownItem} 
                    onPress={() => handleFilterSelect(state)}
                  >
                    <Text style={[styles.dropdownItemText, selectedState === state && {fontWeight: 'bold', color: '#03045E'}]}>
                      {state}
                    </Text>
                    {selectedState === state && <Ionicons name="checkmark-circle" size={24} color="#0077B6" />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/usermainpage')}>
          <Ionicons name="compass-outline" size={32} color="#90A4AE" />
          <Text style={styles.tabText}>Laman Utama</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/mytickets')}>
          <Ionicons name="ticket-outline" size={32} color="#90A4AE" />
          <Text style={styles.tabText}>Tiket Saya</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/weather')}>
          <Ionicons name="partly-sunny-outline" size={32} color="#90A4AE" />
          <Text style={styles.tabText}>Cuaca</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="map" size={32} color="#0077B6" />
          <Text style={[styles.tabText, styles.tabTextActive]}>Peta</Text>
        </TouchableOpacity>
      </View>
      
    </View>
  );
}

// ================= Styles =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  
  map: { width: width, height: height, position: 'absolute', top: 0, left: 0 }, 
  
  topFilterContainer: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 10, zIndex: 10 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  filterText: { flex: 1, marginLeft: 10, fontSize: 15, color: '#334155' },

  markerContainer: { alignItems: 'center', justifyContent: 'center', width: 37,  height: 37, backgroundColor: 'transparent' },
  markerBubble: { backgroundColor: '#FF9800', width: 33, height: 33, padding: 3, borderRadius: 20, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, overflow: 'visible', elevation: 5 },
  markerTriangle: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 5, borderRightWidth: 5, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#10B981', transform: [{ rotate: '180deg' }], marginTop: -4 },

  cardWrapper: { position: 'absolute', bottom: 120, left: 20, right: 20, zIndex: 10 }, 
  parkCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 },
  cardImage: { width: 90, height: 100, borderRadius: 15, backgroundColor: '#E2E8F0' },
  cardInfo: { flex: 1, marginLeft: 15, justifyContent: 'space-between' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#03045E', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#64748B', lineHeight: 18, fontWeight: '500' },
  
  navButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, alignSelf: 'flex-start', marginTop: 10 },
  navButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginLeft: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 10, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#03045E', padding: 20, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 25, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemText: { fontSize: 16, color: '#475569', fontWeight: '500' },

  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 20, borderTopLeftRadius: 35, borderTopRightRadius: 35, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 15 },
  tabItem: { width: 70, alignItems: 'center', paddingTop: 0 },
  tabText: { fontSize: 11, color: '#94A3B8', marginTop: 6, fontWeight: '600', textAlign: 'center' },
  tabTextActive: { color: '#0077B6', fontWeight: 'bold' },
});
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, Image, Modal, TextInput, Switch, Alert, ActivityIndicator,
  TouchableWithoutFeedback, Platform, KeyboardAvoidingView, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 

import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../../firebaseConfig';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, orderBy, getDoc, getDocs, where } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { addPark, getAllParks, deletePark, updatePark } from '../services/ParkService'; 

export default function TicketManageScreen() {
  const [activeTab, setActiveTab] = useState('settings'); 
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parks, setParks] = useState([]);
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const [editingParkId, setEditingParkId] = useState(null);
  const [showPicker, setShowPicker] = useState(false); 

  const [parkName, setParkName] = useState('');
  const [description, setDescription] = useState('');
  const [negeri, setNegeri] = useState(''); 
  const [isActive, setIsActive] = useState(true);
  const [prices, setPrices] = useState({
    msia: { adult: '', child: '', senior: '', oku: '' },
    intl: { adult: '', child: '', senior: '', oku: '' }
  });
  
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [markerCoords, setMarkerCoords] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState(null);
  const [allTickets, setAllTickets] = useState([]);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null);
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua'); 
  const [filteredAllTickets, setFilteredAllTickets] = useState([]);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [transactionDetail, setTransactionDetail] = useState(null);
  const [isFetchingCustomer, setIsFetchingCustomer] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [selectedQrImage, setSelectedQrImage] = useState(null);
  const [selectedQrImageBase64, setSelectedQrImageBase64] = useState(null);

  const NEGERI_LIST = [
    { label: 'Johor', value: 'Johor' }, { label: 'Kedah', value: 'Kedah' },
    { label: 'Kelantan', value: 'Kelantan' }, { label: 'Melaka', value: 'Melaka' },
    { label: 'Negeri Sembilan', value: 'Negeri Sembilan' }, { label: 'Pahang', value: 'Pahang' },
    { label: 'Perak', value: 'Perak' }, { label: 'Perlis', value: 'Perlis' },
    { label: 'Pulau Pinang', value: 'Pulau Pinang' }, { label: 'Sabah', value: 'Sabah' },
    { label: 'Sarawak', value: 'Sarawak' }, { label: 'Selangor', value: 'Selangor' },
    { label: 'Terengganu', value: 'Terengganu' }, { label: 'WP Kuala Lumpur', value: 'WP Kuala Lumpur' },
    { label: 'WP Labuan', value: 'WP Labuan' }, { label: 'WP Putrajaya', value: 'WP Putrajaya' },
  ];

  useEffect(() => { fetchParks(); }, []);
  useEffect(() => {
    let unsubscribe;
    if (activeTab === 'records') {
      setLoading(true);
      const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
      
      unsubscribe = onSnapshot(q, async (snapshot) => {
        const ticketsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const enrichedTickets = await Promise.all(ticketsData.map(async (ticket) => {
          if (ticket.userId) {
            try {
              const userRef = doc(db, "users", ticket.userId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const userData = userSnap.data();
                return { 
                  ...ticket, 
                  icPassport: userData.icPassport || '', 
                  customerName: userData.fullName || '' 
                };
              }
            } catch (error) {
              console.log("Error fetching user data:", error);
            }
          }
          return ticket;
        }));

        setAllTickets(enrichedTickets);
        setLoading(false);
      });
    }
    return () => unsubscribe && unsubscribe();
  }, [activeTab]);

  useEffect(() => {
    let result = allTickets;

    if (statusFilter !== 'Semua') {
      result = result.filter(ticket => ticket.status === statusFilter);
    }

    if (ticketSearchQuery.trim() !== '') {
      const term = ticketSearchQuery.toLowerCase();
      result = result.filter(ticket => 
        (ticket.id && ticket.id.toLowerCase().includes(term)) || 
        (ticket.parkName && ticket.parkName.toLowerCase().includes(term)) ||
        (ticket.icPassport && ticket.icPassport.toLowerCase().includes(term)) ||
        (ticket.customerName && ticket.customerName.toLowerCase().includes(term)) || // 🌟 新增：支持名字搜索
        (ticket.bookingDate && ticket.bookingDate.toLowerCase().includes(term))
      );
    }

    setFilteredAllTickets(result);
  }, [ticketSearchQuery, statusFilter, allTickets]);

  const fetchParks = async () => {
    try {
      const data = await getAllParks();
      setParks(data);
    } catch (error) { console.error("Fetch error:", error); }
  };

  const handleLogout = async () => {
    setIsProfileMenuVisible(false);
    alert("Anda telah berjaya log keluar.");
    router.replace('/login');
  };

  const handleDummyPress = (featureName) => {
    Alert.alert("Akan Datang", `Modul ${featureName} sedang dalam pembinaan.`);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Kebenaran Diperlukan', 'Sila benarkan akses galeri.'); return; }
    
    let result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ['images'], 
      allowsEditing: true, 
      aspect: [16, 9], 
      quality: 0.2,
      base64: true
    });
    
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setSelectedImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const pickQrImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Kebenaran Diperlukan', 'Sila benarkan akses galeri.'); return; }
    
    let result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ['images'], 
      allowsEditing: true, 
      aspect: [1, 1],
      quality: 0.2, 
      base64: true 
    });
    
    if (!result.canceled) {
      setSelectedQrImage(result.assets[0].uri);
      setSelectedQrImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const uploadImageToCloud = async (localUri, base64String) => {
    if (!localUri || localUri.startsWith('http')) return localUri;
    
    if (!base64String) {
      throw new Error("Sistem sedang memproses gambar. Sila pilih gambar sekali lagi.");
    }

    try {
      const storage = getStorage();
      const filename = `parks/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadString(storageRef, base64String, 'base64', {
        contentType: 'image/jpeg',
      });
      
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL; 
      
    } catch (error) {
      console.error("Upload Error: ", error);
      throw new Error("Gagal muat naik ke Firebase.");
    }
  };

  const handlePriceChange = (category, type, value) => {
    setPrices(prev => ({ ...prev, [category]: { ...prev[category], [type]: value } }));
  };

  const handleSearchLocation = (text) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.length > 3) {
      setIsSearching(true);
      
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&countrycodes=my&limit=5&email=studentfyp@gmail.com`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SistemTiketTamanLaut_FYP/1.0)',
                'Accept': 'application/json'
              }
            }
          );

          if (!response.ok) throw new Error("Server sibuk");

          const data = await response.json();
          setSearchResults(data);
        } catch (error) {
          console.log("Geocoding info:", error.message);
        } finally {
          setIsSearching(false);
        }
      }, 800); 
    } else {
      searchResults.length > 0 && setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    setMarkerCoords({ latitude: lat, longitude: lon });
    setSearchQuery(item.display_name); 
    setSearchResults([]); 

    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 1000);
    }
  };

  const handleMapLongPress = async (e) => {
    const coords = e.nativeEvent.coordinate;
    setMarkerCoords(coords);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&email=studentfyp@gmail.com`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SistemTiketTamanLaut_FYP/1.0)',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error("Server sibuk");

      const data = await response.json();
      if (data && data.display_name) {
        setSearchQuery(data.display_name); 
      }
    } catch (error) {
      console.log("Reverse Geocoding info:", error.message);
    }
  };

  const handleSave = async () => {
    if (!parkName.trim() || !markerCoords || !negeri) {
      Alert.alert("Ralat", "Sila masukkan semua maklumat termasuk negeri dan lokasi peta.");
      return;
    }
    
    setLoading(true);
    try {
      const finalImageUrl = selectedImageBase64 || selectedImage;
      const finalQrUrl = selectedQrImageBase64 || selectedQrImage

      const finalData = { 
        name: parkName, 
        description: description, 
        negeri: negeri, 
        location: markerCoords, 
        address: searchQuery, 
        pricing: prices, 
        status: isActive ? 'Aktif' : 'Tidak Aktif', 
        imageUrl: finalImageUrl || null,
        qrCodeUrl: finalQrUrl || null
      };

      if (editingParkId) { 
        await updatePark(editingParkId, finalData); 
        Alert.alert("Berjaya", "Data taman telah dikemaskini."); 
      } else { 
        await addPark(finalData); 
        Alert.alert("Berjaya", "Taman Laut telah ditambah!"); 
      }
      
      setModalVisible(false); 
      clearForm(); 
      setEditingParkId(null); 
      fetchParks(); 
      
    } catch (error) { 
      Alert.alert("Ralat Firestore", error.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleUpdateTicketStatus = (ticketId, newStatus) => {
    const actionName = newStatus === 'Sah' ? 'mengesahkan' : 'menolak';
    
    Alert.alert(`Sahkan Tindakan`, `Adakah anda pasti ingin ${actionName} tiket ini?`, [
      { text: "Batal", style: "cancel" },
      { 
        text: "Pasti", 
        style: newStatus === 'Sah' ? "default" : "destructive",
        onPress: async () => {
          try {
            setIsProcessing(true);
            
            const ticketRef = doc(db, "tickets", ticketId);
            await updateDoc(ticketRef, {
              status: newStatus,
              processedAt: serverTimestamp(),
            });

            if (selectedTicketDetail?.transactionId) {
              const transactionRef = doc(db, "transactions", selectedTicketDetail.transactionId);
              await updateDoc(transactionRef, {
                status: newStatus === 'Sah' ? 'Sah' : 'Ditolak',
                processedAt: serverTimestamp(),
              });
            }

            Alert.alert("Berjaya", `Tiket dan Transaksi telah dikemaskini.`);
            setIsDetailModalVisible(false);
          } catch (error) {
            console.error("Update status error:", error);
            Alert.alert("Ralat", "Gagal mengemaskini status.");
          } finally {
            setIsProcessing(false);
          }
        }
      }
    ]);
  };

  const handleOpenDetail = async (ticket) => {
    setSelectedTicketDetail(ticket);
    setIsDetailModalVisible(true);
    setCustomerDetail(null); 
    setTransactionDetail(null);
    setIsFetchingCustomer(true);

    try {
      if (ticket.userId) {
        const userRef = doc(db, "users", ticket.userId); 
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setCustomerDetail(userSnap.data());
        }
      }

      const qTx = query(collection(db, "transactions"), where("ticketId", "==", ticket.id));
      const txSnap = await getDocs(qTx);
      if (!txSnap.empty) {
        setTransactionDetail(txSnap.docs[0].data());
      }
    } catch (error) {
      console.error("Gagal mendapatkan maklumat:", error);
    } finally {
      setIsFetchingCustomer(false);
    }
  };

  const handleDelete = (parkId, parkName) => {
    Alert.alert("Padam Taman Laut", `Adakah anda pasti ingin memadam ${parkName}?`, [
      { text: "Batal", style: "cancel" },
      { text: "Padam", style: "destructive", onPress: async () => { setLoading(true); await deletePark(parkId); fetchParks(); setLoading(false); }}
    ]);
  };

  const openEditModal = (park) => {
    setEditingParkId(park.id); setParkName(park.name); setDescription(park.description); setNegeri(park.negeri || '');
    setMarkerCoords(park.location); setPrices({ msia: park.pricing?.msia || {}, intl: park.pricing?.intl || {} });
    setIsActive(park.status === 'Aktif'); 
    setSelectedImage(park.imageUrl); 
    setSelectedQrImage(park.qrCodeUrl || null);
    setSelectedImageBase64(null); 
    setSelectedQrImageBase64(null);
    setSearchQuery(park.address || ''); 
    setModalVisible(true);
  };

  const clearForm = () => {
    setParkName(''); setDescription(''); setNegeri(''); setMarkerCoords(null); 
    setSelectedImage(null);
    setSelectedImageBase64(null);
    setSelectedQrImage(null);
    setSelectedQrImageBase64(null);
    setSearchQuery(''); setSearchResults([]); 
    setPrices({ msia: { adult: '', child: '', senior: '', oku: '' }, intl: { adult: '', child: '', senior: '', oku: '' }});
  };

  const handleAddNewPark = () => {
    clearForm();
    setEditingParkId(null);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {activeTab === 'records' ? 'Rekod Tiket' : 'Tetapan Taman'}
          </Text>
          <Text style={styles.headerSubtitle}>Pengurusan Tiket & Taman Laut</Text>
        </View>
        
        <View style={styles.headerRight}>
          {activeTab === 'settings' && (
            <TouchableOpacity style={styles.addButtonInline} onPress={handleAddNewPark}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setIsProfileMenuVisible(true)} style={{ marginLeft: 15 }}>
            <Image 
              source={{ uri: 'https://ui-avatars.com/api/?name=Admin&background=03045E&color=fff&size=128' }} 
              style={styles.profileImage} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabSwitcherContainer}>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'records' && styles.tabButtonActive]} onPress={() => setActiveTab('records')}>
          <Ionicons name="receipt-outline" size={18} color={activeTab === 'records' ? "#FFFFFF" : "#64748B"} />
          <Text style={[styles.tabButtonText, activeTab === 'records' && styles.tabButtonTextActive]}> Rekod Tiket</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'settings' && styles.tabButtonActive]} onPress={() => setActiveTab('settings')}>
          <Ionicons name="settings-outline" size={18} color={activeTab === 'settings' ? "#FFFFFF" : "#64748B"} />
          <Text style={[styles.tabButtonText, activeTab === 'settings' && styles.tabButtonTextActive]}> Tetapan Taman</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {activeTab === 'records' ? (
          <View>
            <View style={styles.recordsFilterContainer}>
              <View style={styles.ticketSearchWrapper}>
                <Ionicons name="search" size={20} color="#94A3B8" />
                <TextInput
                  style={styles.ticketSearchInput}
                  placeholder="Cari ID, Taman, IC atau Tarikh..."
                  value={ticketSearchQuery}
                  onChangeText={setTicketSearchQuery}
                />
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilterScroll}>
                {['Semua', 'Menunggu Pengesahan', 'Sah', 'Telah Digunakan', 'Ditolak'].map((s) => (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.statusFilterBtn, statusFilter === s && styles.statusFilterBtnActive]}
                    onPress={() => setStatusFilter(s)}
                  >
                    <Text style={[styles.statusFilterBtnText, statusFilter === s && styles.statusFilterBtnTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.sectionTitle}>Semua Pesanan ({filteredAllTickets.length})</Text>
            {loading ? <ActivityIndicator color="#0077B6" /> : 
              filteredAllTickets.length === 0 ? (
                <View style={styles.emptyStateContainer}><Text style={styles.emptyStateText}>Tiada rekod tiket ditemui.</Text></View>
              ) : (
                filteredAllTickets.map((ticket) => {
                  let bgCol = '#FEF3C7', txtCol = '#F59E0B';
                  
                  if (ticket.status === 'Sah' || ticket.status === 'Telah Digunakan') { 
                    bgCol = '#DCFCE7'; txtCol = '#10B981'; 
                  }
                  if (ticket.status === 'Ditolak' || ticket.status === 'Gagal') { 
                    bgCol = '#FEE2E2'; txtCol = '#EF4444'; 
                  }

                  return (
                    <View key={ticket.id} style={styles.adminBriefCard}>
                      <View style={styles.briefHeader}>
                        <Text style={styles.briefId}>ID: {ticket.id.slice(0, 8).toUpperCase()}</Text>
                        <View style={[styles.statusBadgeSmall, { backgroundColor: bgCol }]}>
                          <Text style={[styles.statusTextMini, { color: txtCol }]}>{ticket.status}</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.briefParkName}>{ticket.parkName}</Text>
                      
                      <TouchableOpacity 
                        style={styles.lihatButiranBtn} 
                        onPress={() => handleOpenDetail(ticket)}
                      >
                        <Text style={styles.lihatButiranText}>Lihat Butiran</Text>
                        <Ionicons name="chevron-forward" size={14} color="#0077B6" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )
            }
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Senarai Taman Laut ({parks.length})</Text>
            {parks.map((park) => (
              <View key={park.id} style={styles.parkCardLargeStandard}>
                <Image source={{ uri: park.imageUrl || 'https://via.placeholder.com/800' }} style={styles.parkImageLargeStandard} />
                <View style={styles.infoSectionCompact}>
                  <View style={styles.nameStatusContainer}>
                    <Text style={styles.parkNameStandard}>{park.name}</Text>
                    <View style={[styles.statusBadgeSmallInline, {backgroundColor: park.status === 'Aktif' ? '#D1FAE5' : '#FEE2E2'}]}>
                      <Text style={[styles.statusTextMini, {color: park.status === 'Aktif' ? '#065F46' : '#991B1B'}]}>{park.status}</Text>
                    </View>
                  </View>
                  <View style={styles.actionRowInlineStandard}>
                    <TouchableOpacity style={styles.editButtonSmallInline} onPress={() => openEditModal(park)}>
                      <Ionicons name="pencil" size={12} color="#0077B6" />
                      <Text style={styles.editButtonTextSmallInline}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButtonSmallInline} onPress={() => handleDelete(park.id, park.name)}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal transparent={true} visible={isProfileMenuVisible} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsProfileMenuVisible(false)}>
          <View style={styles.menuModalOverlay}>
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" /><Text style={styles.menuText}>Log Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ================= ADD PARK MODAL ================= */}
      <Modal visible={modalVisible} animationType="slide">
        <KeyboardAvoidingView 
          style={{ flex: 1, backgroundColor: '#FFFFFF' }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 60 : 20 }]}>
            <TouchableOpacity onPress={() => { setModalVisible(false); clearForm(); }}>
              <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600' }}>Batal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingParkId ? "Kemas Kini Taman" : "Tambah Taman Baharu"}
            </Text>
            {loading ? <ActivityIndicator color="#0077B6" /> : (
              <TouchableOpacity onPress={handleSave}>
                <Text style={{ color: '#0077B6', fontSize: 16, fontWeight: 'bold' }}>Simpan</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.formLabel}>Gambar Taman</Text>
            <TouchableOpacity style={styles.imagePickerBox} onPress={pickImage}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.previewImageStandard} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="camera-outline" size={30} color="#94A3B8" />
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>Klik untuk muat naik gambar</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.formLabel}>Nama Taman Laut</Text>
            <TextInput style={styles.formInput} value={parkName} onChangeText={setParkName} placeholder="Contoh: Pulau Redang" />

            <Text style={styles.formLabel}>Pilih Negeri</Text>
            <TouchableOpacity style={styles.pickerContainer} onPress={() => setShowPicker(true)}>
                <Text style={{ color: negeri ? '#334155' : '#94A3B8', fontSize: 15 }}>{negeri || 'Pilih negeri...'}</Text>
                <Ionicons name="chevron-down" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <Modal visible={showPicker} transparent={true} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
                    <View style={styles.modalOverlayPicker}>
                        <TouchableWithoutFeedback>
                            <View style={styles.pickerDropdown}>
                                <Text style={styles.pickerTitle}>Pilih Negeri</Text>
                                <ScrollView style={{ maxHeight: 300 }}>
                                    {NEGERI_LIST.map((item) => (
                                        <TouchableOpacity key={item.value} style={styles.pickerItem} onPress={() => { setNegeri(item.value); setShowPicker(false); }}>
                                            <Text style={styles.pickerItemText}>{item.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
            
            <Text style={styles.formLabel}>Penerangan</Text>
            <TextInput 
              style={[styles.formInput, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]} 
              value={description} onChangeText={setDescription} placeholder="Maklumat tentang taman laut..." 
              multiline={true} numberOfLines={4}
            />

            <Text style={styles.formLabel}>Cari & Tetapkan Lokasi Peta</Text>
            <View style={styles.searchBoxContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={20} color="#94A3B8" style={{ marginRight: 10 }}/>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari lokasi (cth: Bangi)..."
                  value={searchQuery}
                  onChangeText={handleSearchLocation}
                />
                {isSearching && <ActivityIndicator size="small" color="#0077B6" />}
              </View>

              {searchResults.length > 0 && (
                <View style={styles.searchResultsContainer}>
                  {searchResults.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.searchResultItem} onPress={() => handleSelectLocation(item)}>
                      <Ionicons name="location-outline" size={16} color="#0077B6" />
                      <Text style={styles.searchResultText} numberOfLines={2}>{item.display_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.mapContainer}>
              <MapView 
                ref={mapRef}
                style={{ flex: 1 }} 
                initialRegion={{ latitude: 4.2105, longitude: 101.9758, latitudeDelta: 8, longitudeDelta: 8 }}
                onLongPress={handleMapLongPress}
              >
                {markerCoords && <Marker coordinate={markerCoords} pinColor="#0077B6" />}
              </MapView>
            </View>
            <Text style={{fontSize: 11, color: '#94A3B8', marginTop: 5}}>* Anda juga boleh tekan lama pada peta untuk menukar lokasi.</Text>

            <Text style={[styles.formLabel, { color: '#0077B6', marginTop: 25 }]}>
              Harga Tiket (Warganegara - RM)
            </Text>
            <View style={styles.priceGrid}>
              {[ { key: 'adult', label: 'Dewasa' }, { key: 'child', label: 'Kanak-kanak' }, { key: 'senior', label: 'Warga Emas' }, { key: 'oku', label: 'OKU' } ].map((item) => (
                <View key={`msia-${item.key}`} style={styles.priceInputWrapper}>
                  <Text style={styles.priceInputLabel}>{item.label.toUpperCase()}</Text>
                  <TextInput style={styles.priceInputSmall} placeholder="0.00" keyboardType="numeric" value={prices.msia[item.key] ? String(prices.msia[item.key]) : ''} onChangeText={(v) => handlePriceChange('msia', item.key, v)} />
                </View>
              ))}
            </View>

            <Text style={[styles.formLabel, { color: '#D62828', marginTop: 20 }]}>
              Harga Tiket (Bukan Warganegara - RM)
            </Text>
            <View style={styles.priceGrid}>
              {[ { key: 'adult', label: 'Dewasa' }, { key: 'child', label: 'Kanak-kanak' }, { key: 'senior', label: 'Warga Emas' }, { key: 'oku', label: 'OKU' } ].map((item) => (
                <View key={`intl-${item.key}`} style={styles.priceInputWrapper}>
                  <Text style={styles.priceInputLabel}>{item.label.toUpperCase()}</Text>
                  <TextInput style={styles.priceInputSmall} placeholder="0.00" keyboardType="numeric" value={prices.intl[item.key] ? String(prices.intl[item.key]) : ''} onChangeText={(v) => handlePriceChange('intl', item.key, v)} />
                </View>
              ))}
            </View>

            <Text style={[styles.formLabel, { color: '#10B981', marginTop: 25 }]}>Muat Naik DuitNow QR (Untuk Pembayaran)</Text>
            <TouchableOpacity style={styles.qrPickerBox} onPress={pickQrImage}>
              {selectedQrImage ? (
                <Image source={{ uri: selectedQrImage }} style={styles.previewQrImage} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="qr-code-outline" size={36} color="#94A3B8" />
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 8, textAlign: 'center' }}>Muat Naik Kod QR</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status Aktif</Text> 
                <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: "#CBD5E1", true: "#00B4D8" }} />
            </View>
            <View style={{ height: 120 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/admindashboard')}>
          <Ionicons name="grid-outline" size={24} color="#90A4AE" />
          <Text style={styles.tabText}>Utama</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="ticket" size={24} color="#0077B6" />
          <Text style={[styles.tabText, styles.tabTextActive]}>Tiket</Text>
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

      <Modal visible={isDetailModalVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          {selectedTicketDetail && (
            <>
              <View style={[styles.detailModalHeader, { paddingTop: Platform.OS === 'ios' ? 55 : 20 }]}>
                <TouchableOpacity onPress={() => setIsDetailModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="chevron-down" size={28} color="#03045E" />
                </TouchableOpacity>
                <Text style={styles.detailModalTitle}>Butiran Tiket</Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView contentContainerStyle={styles.detailModalContent}>
                
                <View style={styles.infoGroup}>
                  <Text style={styles.infoGroupTitle}>Maklumat Pelanggan</Text>
                  {isFetchingCustomer ? (
                    <ActivityIndicator size="small" color="#0077B6" style={{ marginVertical: 10 }} />
                  ) : (
                    <>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Nama Penuh:</Text>
                        <Text style={styles.infoValue}>{customerDetail?.fullName || '-'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>No. KP / Pasport:</Text>
                        <Text style={styles.infoValue}>{customerDetail?.icPassport || '-'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Negara Asal:</Text>
                        <Text style={styles.infoValue}>{customerDetail?.nationality || '-'}</Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.infoGroup}>
                  <Text style={styles.infoGroupTitle}>Maklumat Tempahan</Text>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Taman Laut:</Text><Text style={styles.infoValue}>{selectedTicketDetail.parkName}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Tarikh Masuk:</Text><Text style={styles.infoValue}>{selectedTicketDetail.bookingDate}</Text></View>
                  
                  <View style={styles.ticketCountsBox}>
                    <Text style={styles.ticketCountsTitle}>Jenis Pelawat (Kuantiti):</Text>
                    {selectedTicketDetail.counts.adult > 0 && <Text style={styles.ticketCountItem}>• Dewasa x {selectedTicketDetail.counts.adult}</Text>}
                    {selectedTicketDetail.counts.child > 0 && <Text style={styles.ticketCountItem}>• Kanak-kanak x {selectedTicketDetail.counts.child}</Text>}
                    {selectedTicketDetail.counts.senior > 0 && <Text style={styles.ticketCountItem}>• Warga Emas x {selectedTicketDetail.counts.senior}</Text>}
                    {selectedTicketDetail.counts.oku > 0 && <Text style={styles.ticketCountItem}>• OKU x {selectedTicketDetail.counts.oku}</Text>}
                  </View>
                  
                  <View style={[styles.infoRow, { marginTop: 15, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10 }]}>
                    <Text style={[styles.infoLabel, { fontSize: 16, color: '#03045E', fontWeight: 'bold' }]}>Jumlah Bayaran:</Text>
                    
                    <Text style={[styles.infoValue, { fontSize: 18, color: '#10B981', fontWeight: '900' }]}>
                      RM {transactionDetail?.amount ? parseFloat(transactionDetail.amount).toFixed(2) : '0.00'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.textLinkBtn}
                  onPress={() => { 
                    setIsImageLoading(true); 
                    setPreviewReceiptUrl(selectedTicketDetail.receiptUrl); 
                    setIsReceiptModalVisible(true); 
                  }}
                >
                  <Ionicons name="document-text-outline" size={18} color="#0077B6" />
                  <Text style={styles.textLinkBtnText}>Tekan di sini untuk lihat Resit Pembayaran</Text>
                </TouchableOpacity>

                {selectedTicketDetail.status === 'Menunggu Pengesahan' ? (
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleUpdateTicketStatus(selectedTicketDetail.id, 'Ditolak')} disabled={isProcessing}>
                      <Text style={styles.actionBtnText}>Batal / Tolak</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => handleUpdateTicketStatus(selectedTicketDetail.id, 'Sah')} disabled={isProcessing}>
                      <Text style={styles.actionBtnText}>Sahkan Tiket</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.statusNoticeBox}><Text style={styles.statusNoticeText}>Tiket ini telah selesai diproses ({selectedTicketDetail.status}).</Text></View>
                )}
                <View style={{ height: 40 }}/>
              </ScrollView>

              {isReceiptModalVisible && (
                <View style={[StyleSheet.absoluteFill, styles.receiptOverlay]}>
                  <TouchableOpacity style={styles.receiptCloseBtn} onPress={() => setIsReceiptModalVisible(false)}>
                    <Ionicons name="close-circle" size={40} color="#FFF" />
                  </TouchableOpacity>

                  {isImageLoading && (
                    <ActivityIndicator size="large" color="#FFF" style={{ position: 'absolute' }} />
                  )}

                  <Image 
                    source={{ uri: previewReceiptUrl }} 
                    style={styles.receiptImageLarge} 
                    resizeMode="contain" 
                    onLoadStart={() => setIsImageLoading(true)}
                    onLoadEnd={() => setIsImageLoading(false)}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 15, paddingBottom: 15 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    profileImage: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: '#03045E' },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#03045E' },
    headerSubtitle: { fontSize: 16, color: '#0077B6', fontWeight: '600', marginTop: 2 },
    addButtonInline: { width: 40, height: 40, backgroundColor: '#00B4D8', borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    
    tabSwitcherContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', marginHorizontal: 25, borderRadius: 12, padding: 4, marginBottom: 20 },
    tabButton: { flex: 1, flexDirection: 'row', paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
    tabButtonActive: { backgroundColor: '#0077B6' },
    tabIcon: { marginRight: 8 },
    tabButtonText: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },
    tabButtonTextActive: { color: '#FFFFFF' },
  
    scrollContent: { paddingHorizontal: 25, paddingBottom: 120 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 15 },
    
    searchBoxContainer: { marginBottom: 10, zIndex: 10 },
    searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 15, height: 50 },
    searchInput: { flex: 1, fontSize: 15, color: '#334155' },
    searchResultsContainer: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, marginTop: 5, maxHeight: 180, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    searchResultText: { flex: 1, marginLeft: 10, fontSize: 13, color: '#475569' },

    pickerContainer: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#F8FAFC', paddingHorizontal: 15, height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
    modalOverlayPicker: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    pickerDropdown: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 8, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
    pickerTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E', padding: 10, textAlign: 'center' },
    pickerItem: { paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    pickerItemText: { fontSize: 16, color: '#334155' },
    
    imagePickerBox: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginTop: 5 },
    previewImageStandard: { width: '100%', height: '100%', aspectRatio: 16 / 9, borderRadius: 20, resizeMode: 'cover' },

    qrPickerBox: { width: 140, height: 140, backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginTop: 5, alignSelf: 'center' },
    previewQrImage: { width: '100%', height: '100%', borderRadius: 20, resizeMode: 'contain' },

    parkCardLargeStandard: { backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 15, overflow: 'hidden', elevation: 3 },
    parkImageLargeStandard: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#F1F5F9' },
    
    infoSectionCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10 },
    nameStatusContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    parkNameStandard: { fontSize: 16, fontWeight: 'bold', color: '#03045E', marginRight: 8 },
    statusBadgeSmallInline: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    statusTextMini: { fontSize: 10, fontWeight: 'bold' },
    
    actionRowInlineStandard: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    editButtonSmallInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    editButtonTextSmallInline: { fontSize: 13, fontWeight: 'bold', color: '#0077B6', marginLeft: 4 },
    deleteButtonSmallInline: { backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 },
  
    bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingBottom: 20, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabText: { fontSize: 12, color: '#90A4AE', marginTop: 6, fontWeight: '500', textAlign: 'center' },
    tabTextActive: { color: '#0077B6', fontWeight: 'bold' },
  
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#EEE', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E' },
    formContent: { paddingHorizontal: 25 },
    formLabel: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginTop: 20, marginBottom: 8 },
    formInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 15, fontSize: 15, color: '#334155' },
    mapContainer: { height: 250, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', marginTop: 5 },
    priceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    priceInputWrapper: { width: '48%', marginBottom: 12 },
    priceInputLabel: { fontSize: 10, color: '#64748B', fontWeight: 'bold', marginBottom: 4 },
    priceInputSmall: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 14, color: '#334155' },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    statusLabel: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
    emptyStateContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyStateText: { marginTop: 15, fontSize: 14, color: '#94A3B8', textAlign: 'center' },
    
    menuModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
    dropdownMenu: { position: 'absolute', top: 70, right: 25, width: 160, backgroundColor: '#FFFFFF', borderRadius: 15, paddingVertical: 10, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
    menuText: { fontSize: 16, marginLeft: 15, fontWeight: '500' },
    adminBriefCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
    briefHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    briefId: { fontSize: 12, color: '#94A3B8', fontWeight: 'bold' },
    statusBadgeSmall: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusTextMini: { fontSize: 11, fontWeight: 'bold' },
    briefParkName: { fontSize: 18, fontWeight: 'bold', color: '#03045E', marginBottom: 15 },
    lihatButiranBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', backgroundColor: '#F0F9FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    lihatButiranText: { fontSize: 13, color: '#0077B6', fontWeight: '600', marginRight: 4 },

    detailModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    closeBtn: { padding: 5 },
    detailModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E' },
    detailModalContent: { padding: 20 },
    infoGroup: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 15, elevation: 1 },
    infoGroupTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748B', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    infoLabel: { fontSize: 14, color: '#475569', flex: 1 },
    infoValue: { fontSize: 14, color: '#1E293B', fontWeight: '600', flex: 2, textAlign: 'right' },
    ticketCountsBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginTop: 10 },
    ticketCountsTitle: { fontSize: 12, color: '#64748B', fontWeight: 'bold', marginBottom: 5 },
    ticketCountItem: { fontSize: 13, color: '#334155', marginBottom: 3 },
    
    textLinkBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0F2FE', padding: 15, borderRadius: 12, marginBottom: 25 },
    textLinkBtnText: { color: '#0077B6', fontWeight: 'bold', fontSize: 13, marginLeft: 8, textDecorationLine: 'underline' },

    actionButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    actionBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
    actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
    statusNoticeBox: { backgroundColor: '#F1F5F9', padding: 15, borderRadius: 12, alignItems: 'center' },
    statusNoticeText: { color: '#64748B', fontWeight: '600', fontStyle: 'italic' },

    receiptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    receiptCloseBtn: { position: 'absolute', top: 50, right: 25, zIndex: 10 },
    receiptImageLarge: { width: '95%', height: '80%' },
    recordsFilterContainer: { marginBottom: 15 },
  ticketSearchWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    height: 45,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  ticketSearchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#334155' },
  statusFilterScroll: { flexDirection: 'row', marginBottom: 5 },
  statusFilterBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#F1F5F9', 
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  statusFilterBtnActive: { backgroundColor: '#0077B6', borderColor: '#0077B6' },
  statusFilterBtnText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  statusFilterBtnTextActive: { color: '#FFFFFF' },
});
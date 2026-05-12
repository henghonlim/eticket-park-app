import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, 
  TouchableOpacity, ScrollView, Alert, Linking, ActivityIndicator, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { auth, db } from '../../firebaseConfig'; 
import { ALL_COUNTRIES } from '../data/countries';
import MaintenanceOverlay from '../components/MaintenanceOverlay';

const InputField = ({ label, value, onChangeText, placeholder, icon, locked = false, prefix = null, keyboardType = "default" }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputBox, locked && styles.inputBoxLocked]}>
      <Ionicons name={icon} size={20} color={locked ? "#CBD5E1" : "#90A4AE"} style={styles.inputIcon} />
      {prefix && <Text style={styles.prefixText}>{prefix} </Text>}
      <TextInput
        style={[styles.input, locked && styles.inputTextLocked]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#CBD5E1"
        editable={!locked} 
        keyboardType={keyboardType} 
      />
      {locked && <Ionicons name="lock-closed" size={18} color="#CBD5E1" />}
    </View>
  </View>
);

const DropdownField = ({ label, value, onPress, placeholder, icon, locked = false }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TouchableOpacity 
      style={[styles.inputBox, locked && styles.inputBoxLocked]}
      onPress={locked ? null : onPress}
      activeOpacity={locked ? 1 : 0.7}
    >
      <Ionicons name={icon} size={20} color={locked ? "#CBD5E1" : "#90A4AE"} style={styles.inputIcon} />
      <Text style={[styles.input, !value && { color: '#CBD5E1' }, locked && styles.inputTextLocked]}>
        {value || placeholder}
      </Text>
      {!locked && <Ionicons name="chevron-down" size={20} color="#90A4AE" />}
      {locked && <Ionicons name="lock-closed" size={18} color="#CBD5E1" />}
    </TouchableOpacity>
  </View>
);

export default function EditProfileScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState(''); 
  const [emergencyContact, setEmergencyContact] = useState('');
  const [email, setEmail] = useState(''); 
  const [fullName, setFullName] = useState('');
  const [icPassport, setIcPassport] = useState('');
  const [nationality, setNationality] = useState('');

  const [lockedFields, setLockedFields] = useState({
    fullName: false,
    email: false,
    icPassport: false,
    nationality: false
  });

  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  const filteredCountries = ALL_COUNTRIES.filter(c => 
    c.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  const isMalaysian = nationality.toLowerCase().includes('malaysia') || nationality.trim() === '';

  const handlePhoneChange = (text) => {
    if (isMalaysian) {
      let cleaned = text.replace(/\D/g, '');
      if (cleaned.length > 10) cleaned = cleaned.substring(0, 10);
      if (cleaned.length > 2) cleaned = cleaned.substring(0, 2) + '-' + cleaned.substring(2);
      setPhone(cleaned);
    } else {
      setPhone(text);
    }
  };

  const handleEmergencyContactChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    setEmergencyContact(cleaned);
  };

  const handleIcPassportChange = (text) => {
    if (isMalaysian) {
      const cleaned = text.replace(/\D/g, '');
      if (cleaned.length <= 12) {
        setIcPassport(cleaned);
      }
    } else {
      setIcPassport(text);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          Alert.alert("Ralat", "Sila log masuk semula.");
          router.replace('/login');
          return;
        }

        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserName(data.userName || data.username || '');
          
          const dbNationality = data.nationality || '';
          setNationality(dbNationality);
          const isMy = dbNationality.toLowerCase().includes('malaysia') || dbNationality.trim() === '';

          let dbPhone = data.phone || '';
          if (isMy && dbPhone.startsWith('+60')) {
            dbPhone = dbPhone.substring(3);
          }
          setPhone(dbPhone);
          
          setEmergencyContact(data.emergencyContact || '');
          
          const fetchedEmail = currentUser.email || data.email || '';
          const fetchedFullName = data.fullName || '';
          const fetchedIc = data.icPassport || data.ic || '';
          
          setEmail(fetchedEmail); 
          setFullName(fetchedFullName);
          setIcPassport(fetchedIc);

          setLockedFields({
            fullName: fetchedFullName.trim().length > 0,
            email: fetchedEmail.trim().length > 0,
            icPassport: fetchedIc.trim().length > 0,
            nationality: dbNationality.trim().length > 0
          });
        }
      } catch (error) {
        console.log("Error fetching user data:", error);
        Alert.alert("Ralat", "Gagal memuat turun data profil.");
      } finally {
        setIsFetching(false); 
      }
    };

    fetchUserData();
  }, []);

  const handleContactAdmin = () => {
    const adminEmail = "admin@tamanlaut.com";
    const subject = "Permohonan Tukar Maklumat Identiti - Sistem e-Tiket";
    const body = `Hai Admin,\n\nSaya ingin memohon untuk menukar maklumat identiti saya di dalam sistem.\n\nID Pengguna: ${auth.currentUser?.uid}\nSebab Penukaran: `;
    Linking.openURL(`mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
      .catch(err => { Alert.alert("Hubungi Kami", "Sila hantar e-mel ke admin@tamanlaut.com atau hubungi 03-12345678."); });
  };

  const handleSave = async () => {
    if (!userName || !phone || !nationality) {
      Alert.alert("Ralat", "Nama Pengguna, No. Telefon dan Negara Asal adalah wajib diisi.");
      return;
    }

    if (isMalaysian) {
      const phoneRegex = /^\d{2}-\d{7,8}$/;
      if (!phoneRegex.test(phone)) {
        Alert.alert("Format Tidak Sah", "Sila masukkan No. Telefon dengan format yang betul.\n\nContoh: 12-3456789");
        return;
      }
    } else {
      if (phone.trim().length < 8) {
        Alert.alert("Format Tidak Sah", "Sila masukkan No. Telefon yang sah berserta kod negara.\n\nContoh: +65 8123 4567");
        return;
      }
    }

    if (emergencyContact && emergencyContact.length < 10) {
      Alert.alert(
        "Format Tidak Sah", 
        "Kenalan Kecemasan mestilah mengandungi sekurang-kurangnya 10 digit nombor.\n\nContoh: 0123456789"
      );
      return;
    }

    if (!lockedFields.icPassport && icPassport) {
      if (isMalaysian) {
        const icRegex = /^\d{12}$/;
        if (!icRegex.test(icPassport)) {
          Alert.alert("Format Tidak Sah", "No. Kad Pengenalan mestilah tepat 12 digit nombor (tanpa -).\n\nContoh: 010203061234");
          return;
        }
      } else {
        if (icPassport.trim().length < 5) {
          Alert.alert("Format Tidak Sah", "Sila masukkan No. Pasport yang sah.");
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      const currentUser = auth.currentUser;
      const userRef = doc(db, "users", currentUser.uid); 

      const updateData = {
        userName: userName,
        phone: isMalaysian ? `+60${phone}` : phone, 
        emergencyContact: emergencyContact,
      };

      if (!lockedFields.fullName) updateData.fullName = fullName;
      if (!lockedFields.email) updateData.email = email;
      if (!lockedFields.icPassport) updateData.icPassport = icPassport;
      if (!lockedFields.nationality) updateData.nationality = nationality;

      await updateDoc(userRef, updateData);

      setIsLoading(false);
      Alert.alert("Berjaya", "Profil anda telah dikemaskini!", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error) {
      console.log("Error updating profile:", error);
      setIsLoading(false);
      Alert.alert("Ralat", "Gagal menyimpan data.");
    }
  };

  const hasAnyLockedField = lockedFields.fullName || lockedFields.email || lockedFields.icPassport || lockedFields.nationality;

  return (
    <SafeAreaView style={styles.container}>
      <MaintenanceOverlay />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#03045E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kemaskini Profil</Text>
        <View style={{ width: 24 }} />
      </View>

      {isFetching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
          <Text style={styles.loadingText}>Memuat turun profil...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <Text style={styles.sectionTitle}>Maklumat Perhubungan (Boleh Diubah)</Text>
          <View style={styles.card}>
            <InputField label="Nama Pengguna (Paparan)" value={userName} onChangeText={setUserName} placeholder="Sila isi nama pengguna" icon="at" />
            <InputField 
              label="No. Telefon" 
              value={phone} 
              onChangeText={handlePhoneChange} 
              placeholder={isMalaysian ? "12-3456789" : "+65 8123 4567"} 
              icon="call-outline" 
              prefix={isMalaysian ? "+60" : null} 
              keyboardType={isMalaysian ? "phone-pad" : "default"} 
            />
            <InputField 
              label="Kenalan Kecemasan (No. Tel)" 
              value={emergencyContact} 
              onChangeText={handleEmergencyContactChange} 
              placeholder="Cth: 0123456789" 
              icon="warning-outline" 
              keyboardType="numeric" 
            />
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Maklumat Identiti & Akaun</Text>
          </View>
          
          <View style={styles.card}>
            
            {hasAnyLockedField && (
              <View style={styles.alertBox}>
                <Ionicons name="information-circle" size={20} color="#0077B6" />
                <View style={styles.alertTextContainer}>
                  <Text style={styles.alertText}>Sebahagian maklumat telah disahkan dan <Text style={{fontWeight: 'bold'}}>dikunci</Text> untuk keselamatan.</Text>
                  <TouchableOpacity onPress={handleContactAdmin}>
                    <Text style={styles.contactAdminText}>Perlu ubah? Hubungi Admin</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <InputField 
              label="Nama Penuh (Ikut IC/Pasport)" 
              value={fullName} 
              onChangeText={setFullName} 
              placeholder="Sila isi nama penuh anda" 
              icon="person-outline" 
              locked={lockedFields.fullName} 
            />
            
            <InputField 
              label="E-mel (Log Masuk)" 
              value={email} 
              onChangeText={setEmail} 
              placeholder="Sila isi e-mel anda" 
              icon="mail-outline" 
              locked={lockedFields.email} 
            />
            
            <InputField 
              label={isMalaysian ? "No. Kad Pengenalan (IC)" : "No. Pasport"} 
              value={icPassport} 
              onChangeText={handleIcPassportChange} 
              placeholder={isMalaysian ? "Cth: 010203061234" : "Sila isi no. pasport anda"} 
              icon="card-outline" 
              locked={lockedFields.icPassport} 
              keyboardType={isMalaysian ? "numeric" : "default"}
            />
            
            <DropdownField 
              label="Negara Asal" 
              value={nationality} 
              onPress={() => {
                setCountrySearchQuery(''); 
                setIsCountryModalVisible(true);
              }}
              placeholder="Pilih negara asal" 
              icon="flag-outline" 
              locked={lockedFields.nationality} 
            />
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {!isFetching && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Simpan Perubahan</Text>}
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={isCountryModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.countryModalContent}>
            <View style={styles.countryModalHeader}>
              <Text style={styles.countryModalTitle}>Pilih Negara</Text>
              <TouchableOpacity onPress={() => setIsCountryModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#90A4AE" style={{ marginRight: 10 }} />
              <TextInput 
                style={styles.searchInput}
                placeholder="Cari negara (Cth: Singapore)"
                placeholderTextColor="#90A4AE"
                value={countrySearchQuery}
                onChangeText={setCountrySearchQuery}
                autoFocus={true} 
              />
            </View>

            <FlatList 
              data={filteredCountries}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.countryItem}
                  onPress={() => {
                    setNationality(item);
                    setIsCountryModalVisible(false);
                  }}
                >
                  <Text style={[styles.countryItemText, nationality === item && styles.countryItemTextSelected]}>
                    {item}
                  </Text>
                  {nationality === item && <Ionicons name="checkmark-circle" size={20} color="#0077B6" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySearchContainer}>
                  <Ionicons name="earth-outline" size={40} color="#CBD5E1" />
                  <Text style={styles.emptySearchText}>Tiada padanan dijumpai.</Text>
                  <Text style={styles.emptySearchSubText}>Sila semak semula ejaan anda.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, backgroundColor: '#FFFFFF' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#0077B6', fontWeight: '500' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748B', marginBottom: 10, marginLeft: 5 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  
  inputContainer: { marginBottom: 15 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8, marginLeft: 5 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 15, height: 50 },
  inputBoxLocked: { backgroundColor: '#F1F5F9', borderColor: '#F1F5F9' },
  inputIcon: { marginRight: 10 },
  prefixText: { fontSize: 15, fontWeight: 'bold', color: '#03045E' },
  input: { flex: 1, fontSize: 15, color: '#03045E' },
  inputTextLocked: { color: '#94A3B8' },

  alertBox: { flexDirection: 'row', backgroundColor: '#E0F2FE', padding: 15, borderRadius: 12, marginBottom: 20 },
  alertTextContainer: { flex: 1, marginLeft: 10 },
  alertText: { fontSize: 12, color: '#0369A1', lineHeight: 18 },
  contactAdminText: { fontSize: 12, color: '#0284C7', fontWeight: 'bold', marginTop: 5, textDecorationLine: 'underline' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#F1F5F9' },
  saveButton: { backgroundColor: '#00B4D8', borderRadius: 14, height: 55, justifyContent: 'center', alignItems: 'center', shadowColor: '#00B4D8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  countryModalContent: { backgroundColor: '#FFFFFF', height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  countryModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  countryModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E' },
  closeModalBtn: { padding: 5, backgroundColor: '#F1F5F9', borderRadius: 20 },
  
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 15, height: 50, marginBottom: 15 },
  searchInput: { flex: 1, fontSize: 16, color: '#03045E' },
  
  countryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  countryItemText: { fontSize: 16, color: '#64748B' },
  countryItemTextSelected: { color: '#0077B6', fontWeight: 'bold' },
  
  emptySearchContainer: { alignItems: 'center', marginTop: 50 },
  emptySearchText: { color: '#64748B', fontSize: 16, fontWeight: 'bold', marginTop: 15 },
  emptySearchSubText: { color: '#90A4AE', fontSize: 14, marginTop: 5 }
});
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Image, Alert, ActivityIndicator, ScrollView, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import MaintenanceOverlay from '../components/MaintenanceOverlay';
import { db } from '../../firebaseConfig'; 
import { collection, serverTimestamp, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const auth = getAuth();

  const { parkId, parkName, date, total, adult, child, senior, oku } = params;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [parkQrUrl, setParkQrUrl] = useState(null);
  const [loadingQr, setLoadingQr] = useState(true);
  
  const [selectedReceiptUri, setSelectedReceiptUri] = useState(null);
  const [receiptBase64, setReceiptBase64] = useState(null);
  const [fileDetails, setFileDetails] = useState(null); 
  const [showPreview, setShowPreview] = useState(false); 

  useEffect(() => {
    const fetchParkQr = async () => {
      try {
        const parkDoc = await getDoc(doc(db, "parks", parkId));
        if (parkDoc.exists() && parkDoc.data().qrCodeUrl) {
          setParkQrUrl(parkDoc.data().qrCodeUrl);
        }
      } catch (error) { console.error(error); } finally { setLoadingQr(false); }
    };
    if (parkId) fetchParkQr();
  }, [parkId]);

  const saveQrToGallery = async () => {
    if (!parkQrUrl) return;
    
    try {
      const fileUri = FileSystem.cacheDirectory + `park_qr_${Date.now()}.png`;
      
      if (parkQrUrl.startsWith('http')) {
        await FileSystem.downloadAsync(parkQrUrl, fileUri);
      } else if (parkQrUrl.includes('base64,')) {
        const base64Data = parkQrUrl.split('base64,')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
      } else if (parkQrUrl.startsWith('file://')) {
        await FileSystem.copyAsync({ from: parkQrUrl, to: fileUri });
      } else {
        await FileSystem.writeAsStringAsync(fileUri, parkQrUrl, { encoding: FileSystem.EncodingType.Base64 });
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(fileUri);
        Alert.alert("Berjaya! ✅", "QR Code telah disimpan ke galeri anda.");
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            dialogTitle: 'Simpan atau Kongsi QR Code',
            mimeType: 'image/png'
          });
        } else {
          Alert.alert("Ralat", "Sistem tidak menyokong fungsi penyimpanan ini.");
        }
      }
    } catch (error) {
      console.error("Save Error:", error);
      Alert.alert("Ralat", "Gagal memproses QR Code.");
    }
  };

  const pickReceipt = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.status === 'denied') {
      Alert.alert('Kebenaran Diperlukan', 'Sila benarkan akses galeri.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.2, 
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedReceiptUri(asset.uri);
      setReceiptBase64(asset.base64);

      try {
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        const sizeInKb = (fileInfo.size / 1024).toFixed(1);
        const extension = asset.uri.split('.').pop().toUpperCase();
        const fileName = asset.uri.split('/').pop().slice(-15); 

        setFileDetails({
          name: fileName,
          size: sizeInKb,
          type: extension
        });
      } catch (e) {
        console.log("Error getting file info", e);
      }
    }
  };

  const handleFinalPayment = async () => {
    if (!receiptBase64) {
      Alert.alert("Ralat", "Sila muat naik resit terlebih dahulu.");
      return;
    }

    setIsProcessing(true);
    try {
      const userId = auth.currentUser?.uid || "guest_user";
      const base64Data = `data:image/jpeg;base64,${receiptBase64}`;

      const newTransactionRef = doc(collection(db, "transactions"));
      const newTicketRef = doc(collection(db, "tickets"));

      const transactionData = {
        userId,
        parkId,
        amount: parseFloat(total),
        method: "DuitNow QR",
        status: "Menunggu Pengesahan",
        receiptUrl: base64Data, 
        ticketId: newTicketRef.id,
        timestamp: serverTimestamp(),
      };

      const ticketData = {
        userId,
        parkId,
        parkName,
        bookingDate: date,
        counts: { adult, child, senior, oku },
        status: "Menunggu Pengesahan", 
        receiptUrl: base64Data,
        transactionId: newTransactionRef.id,
        createdAt: serverTimestamp(),
      };

      await setDoc(newTransactionRef, transactionData);
      await setDoc(newTicketRef, ticketData);

      try {
        const settingsRef = doc(db, "system", "settings");
        const settingsSnap = await getDoc(settingsRef);

        const userDoc = await getDoc(doc(db, "users", userId));
        const realName = userDoc.exists() ? (userDoc.data().fullName || "Pengguna") : "Pengguna";
        
        let notifTitle = "Pembayaran Dihantar";
        let notifBody = `Resit pembayaran anda untuk ${parkName} telah diterima.`;

        if (settingsSnap.exists() && settingsSnap.data().templates?.pending) {
          const template = settingsSnap.data().templates.pending;
          if (template.title) notifTitle = template.title.replace(/\[Nama\]/g, realName).replace(/\[Taman\]/g, parkName);
          if (template.body) notifBody = template.body.replace(/\[Nama\]/g, realName).replace(/\[Taman\]/g, parkName);
        }

        const newNotifRef = doc(collection(db, "notifications"));
        await setDoc(newNotifRef, {
          userId: userId,
          title: notifTitle,
          body: notifBody,
          type: "pending",
          isRead: false,
          ticketId: newTicketRef.id,
          createdAt: serverTimestamp()
        });
      } catch (notifError) {
        console.log("Notif error:", notifError);
      }

      Alert.alert("Berjaya! 🎉", "Resit dihantar. Admin akan menyemak segera.", [
        { text: "OK", onPress: () => router.replace('/mytickets') }
      ]);
    } catch (error) {
      Alert.alert("Ralat", error.message);
    } finally { setIsProcessing(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <MaintenanceOverlay />
      <Modal visible={showPreview} transparent={true} animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.closeModal} onPress={() => setShowPreview(false)}>
            <Ionicons name="close-circle" size={40} color="#FFF" />
          </TouchableOpacity>
          <Image source={{ uri: selectedReceiptUri }} style={styles.fullImage} resizeMode="contain" />
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color="#03045E" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Bayaran</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.qrCard}>
          {loadingQr ? (
            <ActivityIndicator color="#0077B6" />
          ) : parkQrUrl ? (
            <>
              <Image source={{ uri: parkQrUrl }} style={styles.qrImage} />
              <TouchableOpacity style={styles.downloadBtn} onPress={saveQrToGallery}>
                <Ionicons name="download-outline" size={18} color="#0077B6" />
                <Text style={styles.downloadBtnText}>Simpan QR ke Galeri</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Ionicons name="qr-code-outline" size={60} color="#CBD5E1" />
              <Text style={{ color: '#94A3B8', marginTop: 10, fontWeight: 'bold' }}>QR Code Tidak Tersedia</Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 5 }}>Sila hubungi admin untuk mendapatkan maklumat pembayaran.</Text>
            </View>
          )}
          <Text style={[styles.totalText, { marginTop: 15 }]}>RM {parseFloat(total).toFixed(2)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Muat Naik Resit</Text>
        
        {!selectedReceiptUri ? (
          <TouchableOpacity style={styles.uploadRow} onPress={pickReceipt}>
            <View style={styles.iconCircle}>
              <Ionicons name="cloud-upload-outline" size={24} color="#0077B6" />
            </View>
            <View style={styles.uploadTextCol}>
              <Text style={styles.uploadMainText}>Klik untuk muat naik resit</Text>
              <Text style={styles.uploadSubText}>Format JPG, PNG (Maks 1MB)</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.fileInfoCard}>
            <Ionicons name="document-text" size={30} color="#0077B6" />
            <View style={styles.fileTextCol}>
              <Text style={styles.fileNameText} numberOfLines={1}>...{fileDetails?.name}</Text>
              <Text style={styles.fileMetaText}>{fileDetails?.type} • {fileDetails?.size} KB</Text>
            </View>
            <TouchableOpacity style={styles.viewBtn} onPress={() => setShowPreview(true)}>
              <Text style={styles.viewBtnText}>Lihat</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {setSelectedReceiptUri(null); setReceiptBase64(null);}}>
              <Ionicons name="trash-outline" size={20} color="#FF4D4D" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.warningBox}>
          <Ionicons name="information-circle" size={18} color="#0369A1" />
          <Text style={styles.warningText}>Tiket akan dijana selepas admin mengesahkan pembayaran anda.</Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.payBtn, !receiptBase64 && { backgroundColor: '#CBD5E1' }]} 
          onPress={handleFinalPayment} 
          disabled={isProcessing || !receiptBase64}
        >
          {isProcessing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.payBtnText}>Hantar & Sahkan</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E' },
  content: { padding: 20 },
  
  qrCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 30, elevation: 5 },
  qrImage: { width: 200, height: 200 },
  totalText: { fontSize: 24, fontWeight: '900', color: '#0077B6' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginTop: 15, borderWidth: 1, borderColor: '#BAE6FD' },
  downloadBtnText: { fontSize: 13, color: '#0077B6', fontWeight: 'bold', marginLeft: 6 },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#03045E', marginBottom: 15 },
  
  uploadRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  iconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  uploadTextCol: { flex: 1 },
  uploadMainText: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  uploadSubText: { fontSize: 12, color: '#64748B', marginTop: 2 },

  fileInfoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', padding: 15, borderRadius: 15, marginBottom: 20 },
  fileTextCol: { flex: 1, marginLeft: 12 },
  fileNameText: { fontSize: 14, fontWeight: 'bold', color: '#03045E' },
  fileMetaText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  viewBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#0077B6', borderRadius: 8, marginRight: 15 },
  viewBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  warningBox: { flexDirection: 'row', backgroundColor: '#E0F2FE', padding: 15, borderRadius: 12, marginTop: 25, alignItems: 'center' },
  warningText: { flex: 1, fontSize: 12, color: '#0369A1', marginLeft: 10 },

  footer: { padding: 20, backgroundColor: '#FFF' },
  payBtn: { backgroundColor: '#10B981', paddingVertical: 18, borderRadius: 15, alignItems: 'center' },
  payBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeModal: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImage: { width: '90%', height: '80%' }
});
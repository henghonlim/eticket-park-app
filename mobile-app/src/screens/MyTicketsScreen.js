import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, Modal, RefreshControl, TouchableWithoutFeedback, Alert,
  Platform, ImageBackground 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NotificationBell from '../components/NotificationBell';
import MaintenanceOverlay from '../components/MaintenanceOverlay';
import { db } from '../../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { logoutUser } from '../services/AuthService'; 

export default function MyTicketsScreen() {
  const router = useRouter();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  const [activeTickets, setActiveTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  
  const [previewImage, setPreviewImage] = useState(null);
  const [ticketForModal, setTicketForModal] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isQrVisible, setIsQrVisible] = useState(false);
  const [isReceiptVisible, setIsReceiptVisible] = useState(false); 
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "tickets"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const filtered = allData.filter(ticket => {
        if (ticket.status === "Menunggu Pengesahan") return true;
        
        if (ticket.status === "Sah") {
          let baseDate = parseCustomDate(ticket.bookingDate);

          if (isNaN(baseDate.getTime())) {
            if (ticket.createdAt && typeof ticket.createdAt.toDate === 'function') {
              baseDate = ticket.createdAt.toDate();
            } else {
              baseDate = new Date();
            }
          }

          const expiryDate = new Date(baseDate);
          expiryDate.setDate(baseDate.getDate() + 31);
          return today <= expiryDate; 
        }
        
        return false;
      });

      setActiveTickets(filtered);
      setLoading(false);
      setRefreshing(false);
      
    }, () => {
      console.log("Sambungan Firestore ditutup (normal semasa log keluar).");
    });

    return () => unsubscribe();
  }, [userId]);

  const parseCustomDate = (dateStr) => {
    if (!dateStr) return NaN;

    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    const months = {
      "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5,
      "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11,
      "Januari": 0, "Februari": 1, "Mac": 2, "Mei": 4, "Jun": 5, "Julai": 6, "Ogos": 7, "Oktober": 9, "Disember": 11
    };
    
    const parts = String(dateStr).trim().split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = months[parts[1]];
      const year = parseInt(parts[2], 10);
      
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return NaN; 
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

  const handleDummyPress = (featureName) => {
    setIsProfileMenuVisible(false);
    Alert.alert("Notifikasi", `Fungsi ${featureName} akan datang!`);
  };

  const generateQRCodeUrl = (ticketId) => `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${ticketId}`;

  const renderTicketItem = ({ item }) => {
    let badgeBg = "#DCFCE7";
    let badgeTextColor = "#10B981";

    if (item.status === "Menunggu Pengesahan") {
      badgeBg = "#FEF3C7";
      badgeTextColor = "#F59E0B";
    } else if (item.status === "Ditolak" || item.status === "Gagal") {
      badgeBg = "#FEE2E2";
      badgeTextColor = "#EF4444";
    }
    
    return (
      <View style={styles.ticketCard}>
        <View style={styles.cardHeader}>
          <View style={styles.parkInfo}>
            <Ionicons name="ticket" size={20} color="#0077B6" />
            <Text style={styles.parkName} numberOfLines={1}>{item.parkName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.statusText, { color: badgeTextColor }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#475569" />
            <Text style={styles.detailText}>Tarikh Lawatan: <Text style={{fontWeight: '700', color: '#03045E'}}>{item.bookingDate}</Text></Text>
          </View>
          <Text style={styles.hintText}>Tekan 'Paparkan QR' untuk butiran pax & tiket</Text>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => { 
              setPreviewReceiptUrl(item.receiptUrl);
              setIsReceiptVisible(true);
            }}
          >
            <Ionicons name="receipt-outline" size={16} color="#0077B6" />
            <Text style={styles.actionBtnText}>Lihat Resit</Text>
          </TouchableOpacity>

          {item.status === 'Sah' && (
            <TouchableOpacity 
              style={styles.qrBtn} 
              onPress={() => { 
                setIsImageLoading(true); 
                setTicketForModal(item); 
                setIsQrVisible(true); 
              }}
            >
              <Ionicons name="qr-code" size={16} color="#FFFFFF" />
              <Text style={styles.qrBtnText}>Paparkan QR</Text>
            </TouchableOpacity>
          )}

          {item.status === 'Menunggu Pengesahan' && (
            <View style={styles.pendingNoticeBox}>
              <Ionicons name="time-outline" size={16} color="#D97706" />
              <Text style={styles.pendingNoticeText}>Sedang Disemak</Text>
            </View>
          )}

          {(item.status === 'Ditolak' || item.status === 'Gagal') && (
            <View style={styles.rejectedNoticeBox}>
              <Ionicons name="alert-circle" size={16} color="#B91C1C" />
              <Text style={styles.rejectedNoticeText}>Hubungi Admin</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <MaintenanceOverlay />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tiket Saya</Text>
        <View style={styles.headerIcons}>
        <NotificationBell />
          
          <TouchableOpacity onPress={() => setIsProfileMenuVisible(true)}>
            <Image source={{ uri: 'https://ui-avatars.com/api/?name=User&background=0077B6&color=fff&size=128' }} style={styles.profileImage} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <TouchableOpacity 
          style={styles.historyButton} 
          activeOpacity={0.8}
          onPress={() => router.push('/historytickets')} 
        >
          <View style={styles.historyLeft}>
            <Ionicons name="time-outline" size={22} color="#0077B6" />
            <Text style={styles.historyText}>Sejarah Tiket</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#90A4AE" />
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#0077B6" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={activeTickets}
            keyExtractor={(item) => item.id}
            renderItem={renderTicketItem}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="ticket-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyText}>Tiada tiket aktif pada masa ini.</Text>
                <TouchableOpacity style={styles.buyBtn} onPress={() => router.replace('/usermainpage')}>
                  <Text style={styles.buyBtnText}>Beli Tiket Sekarang</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/usermainpage')}>
          <Ionicons name="compass-outline" size={32} color="#90A4AE" />
          <Text style={styles.tabText}>Laman Utama</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tabItem} activeOpacity={1}>
          <Ionicons name="ticket" size={32} color="#0077B6" />
          <Text style={[styles.tabText, styles.tabTextActive]}>Tiket Saya</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/weather')}>
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

      <Modal visible={isQrVisible} transparent={true} animationType="slide">
        <View style={styles.ticketModalBg}>
          {ticketForModal && (
            <View style={styles.modernTicketContainer}>
              <View style={styles.modernTicketTop}>
                <View style={styles.ticketModalHeader}>
                  <Text style={styles.ticketModalTitle}>E-Tiket Rasmi</Text>
                  <TouchableOpacity onPress={() => setIsQrVisible(false)} style={styles.closeBtn}>
                    <Ionicons name="close-circle" size={28} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.ticketParkNameDark}>{ticketForModal.parkName}</Text>
                
                <View style={styles.infoRow}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Tarikh Lawatan</Text>
                    <Text style={styles.infoValue}>{ticketForModal.bookingDate}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <Text style={[styles.infoValue, { color: '#10B981' }]}>Telah Dibayar</Text>
                  </View>
                </View>

                <View style={styles.paxContainer}>
                  <Text style={styles.paxTitle}>Butiran Penumpang:</Text>
                  <View style={styles.paxGrid}>
                    <Text style={styles.paxItem}>Dewasa: {ticketForModal.counts?.adult || 0}</Text>
                    <Text style={styles.paxItem}>Kanak-kanak: {ticketForModal.counts?.child || 0}</Text>
                    <Text style={styles.paxItem}>Warga Emas: {ticketForModal.counts?.senior || 0}</Text>
                    <Text style={styles.paxItem}>OKU: {ticketForModal.counts?.oku || 0}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.punchHoleSeparator}>
                <View style={styles.punchHoleLeft} />
                <View style={styles.dashedLine} />
                <View style={styles.punchHoleRight} />
              </View>

              <View style={styles.modernTicketBottom}>
                <View style={styles.qrWrapper}>
                  {isImageLoading && (
                    <ActivityIndicator size="large" color="#0077B6" style={styles.modalLoadingSpinner} />
                  )}
                  <Image 
                    key={ticketForModal.id}
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${ticketForModal.id}` }} 
                    style={styles.qrImageClean} 
                    resizeMode="contain" 
                    onLoad={() => setIsImageLoading(false)}
                  />
                </View>
                <Text style={styles.scanNoticeText}>Sila tunjuk kod QR ini di pintu masuk</Text>

                <View style={styles.transactionDetails}>
                  <Text style={styles.txText}>No. Tiket: TKT-{ticketForModal.id.slice(0, 8).toUpperCase()}</Text>
                </View>

                <View style={styles.validityNoticeBox}>
                  <Ionicons name="information-circle" size={20} color="#0284C7" />
                  <Text style={styles.validityText}>
                    Tiket ini sah digunakan dalam tempoh <Text style={{fontWeight: '800'}}>31 Hari</Text> bermula dari tarikh lawatan. Selepas tempoh tersebut, tiket akan luput.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={isReceiptVisible} transparent={true} animationType="fade">
        <View style={styles.receiptOverlay}>
          <TouchableOpacity style={styles.receiptCloseBtn} onPress={() => setIsReceiptVisible(false)}>
            <Ionicons name="close-circle" size={40} color="#FFF" />
          </TouchableOpacity>
          {previewReceiptUrl && (
            <Image 
              source={{ uri: previewReceiptUrl }} 
              style={styles.receiptImageLarge} 
              resizeMode="contain" 
            />
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
  iconButton: { marginRight: 18, position: 'relative' },
  notificationDot: { position: 'absolute', top: -2, right: 0, width: 12, height: 12, backgroundColor: '#ef4444', borderRadius: 6, borderWidth: 2, borderColor: '#F8FAFC' },
  profileImage: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: '#0077B6' },
  contentContainer: { flex: 1 },
  historyButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 25, marginBottom: 15, padding: 16, borderRadius: 16, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 },
  historyLeft: { flexDirection: 'row', alignItems: 'center' },
  historyText: { fontSize: 15, fontWeight: '700', color: '#03045E', marginLeft: 10 },
  scrollContent: { paddingHorizontal: 25, paddingBottom: 130 }, 
  ticketCard: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 24, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5, marginBottom: 20, padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 15 },
  parkInfo: { flexDirection: 'row', alignItems: 'center' },
  parkName: { fontSize: 18, fontWeight: '800', color: '#03045E', marginLeft: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  cardBody: { marginBottom: 15 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText: { fontSize: 15, color: '#475569', marginLeft: 8, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 15 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 16 },
  actionBtnText: { fontSize: 14, color: '#0077B6', fontWeight: 'bold', marginLeft: 6 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0077B6', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 16, shadowColor: '#0077B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  qrBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#90A4AE', marginTop: 15, fontSize: 16, textAlign: 'center', marginBottom: 25 },
  buyBtn: { backgroundColor: '#0077B6', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25 },
  buyBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },

  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 20, borderTopLeftRadius: 35, borderTopRightRadius: 35, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 15 },
  tabItem: { width: 70, alignItems: 'center', paddingTop: 0 },
  tabText: { fontSize: 11, color: '#94A3B8', marginTop: 6, fontWeight: '600', textAlign: 'center' },
  tabTextActive: { color: '#0077B6', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  dropdownMenu: { position: 'absolute', top: 70, right: 25, width: 180, backgroundColor: '#FFFFFF', borderRadius: 15, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  menuText: { fontSize: 16, color: '#03045E', marginLeft: 15, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 15 },

  pendingNoticeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 10, flex: 1, justifyContent: 'center' },
  pendingNoticeText: { color: '#D97706', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  rejectedNoticeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 10, flex: 1, justifyContent: 'center' },
  rejectedNoticeText: { color: '#B91C1C', fontSize: 11, fontWeight: 'bold', marginLeft: 4, flexShrink: 1 },

  receiptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  receiptCloseBtn: { position: 'absolute', top: 50, right: 25, zIndex: 10 },
  receiptImageLarge: { width: '95%', height: '80%' },

  ticketModalBg: { flex: 1, backgroundColor: 'rgba(3, 4, 94, 0.85)', justifyContent: 'center', alignItems: 'center' },
  modernTicketContainer: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 20 },
  modernTicketTop: { padding: 25, backgroundColor: '#F8FAFC' },
  ticketModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  ticketModalTitle: { fontSize: 16, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
  closeBtn: { padding: 5 },
  ticketParkNameDark: { fontSize: 26, fontWeight: '900', color: '#03045E', marginBottom: 20, lineHeight: 32 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  infoBox: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  paxContainer: { marginTop: 10, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  paxTitle: { fontSize: 12, color: '#64748B', marginBottom: 8, fontWeight: '600' },
  paxGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  paxItem: { width: '48%', fontSize: 13, color: '#334155', marginBottom: 4, fontWeight: '500' },
  
  punchHoleSeparator: { flexDirection: 'row', alignItems: 'center', height: 40, backgroundColor: '#FFFFFF' },
  punchHoleLeft: { width: 20, height: 40, borderRadius: 20, backgroundColor: 'rgba(3, 4, 94, 0.85)', marginLeft: -10 },
  dashedLine: { flex: 1, height: 1, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', marginHorizontal: 10 },
  punchHoleRight: { width: 20, height: 40, borderRadius: 20, backgroundColor: 'rgba(3, 4, 94, 0.85)', marginRight: -10 },
  
  modernTicketBottom: { padding: 25, alignItems: 'center', backgroundColor: '#FFFFFF' },
  qrWrapper: { padding: 10, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  qrImageClean: { width: 180, height: 180 },
  modalLoadingSpinner: { position: 'absolute', top: '40%', alignSelf: 'center', zIndex: 10 },
  scanNoticeText: { fontSize: 13, color: '#64748B', marginTop: 15, fontWeight: '500' },
  transactionDetails: { marginTop: 20, alignItems: 'center', width: '100%', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 15 },
  txText: { fontSize: 12, color: '#94A3B8', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 4 },
  utilityButtons: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 15 },
  utilBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  utilBtnText: { fontSize: 13, fontWeight: '600', color: '#0077B6', marginLeft: 6 },
  hintText: { fontSize: 12, color: '#94A3B8', marginTop: 4, fontStyle: 'italic' },
  parkInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  parkName: { fontSize: 17, fontWeight: '800', color: '#03045E', marginLeft: 8, flexShrink: 1 },

  validityNoticeBox: { 
    flexDirection: 'row', 
    backgroundColor: '#F0F9FF',
    padding: 12, 
    borderRadius: 12, 
    marginTop: 20, 
    borderWidth: 1, 
    borderColor: '#BAE6FD',
    alignItems: 'flex-start'
  },
  validityText: { 
    flex: 1, 
    marginLeft: 8, 
    fontSize: 12, 
    color: '#0369A1', 
    lineHeight: 18 
  },
});
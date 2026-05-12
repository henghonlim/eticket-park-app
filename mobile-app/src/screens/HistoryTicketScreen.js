import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, Modal, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import MaintenanceOverlay from '../components/MaintenanceOverlay';

export default function HistoryTicketsScreen() {
  const router = useRouter();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  const [historyTickets, setHistoryTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isQrVisible, setIsQrVisible] = useState(false);
  const [ticketForModal, setTicketForModal] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(true);

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

        if (ticket.status === "Telah Digunakan") return true;
        if (ticket.status === "Ditolak" || ticket.status === "Gagal") return true;
        if (ticket.status === "Sah") {
          let baseDate = parseCustomDate(ticket.bookingDate);
          if (isNaN(baseDate.getTime())) {
            baseDate = ticket.createdAt?.toDate?.() || new Date();
          }
          const expiryDate = new Date(baseDate);
          expiryDate.setDate(baseDate.getDate() + 31);
          return today > expiryDate; 
        }
        return false;
      });

      setHistoryTickets(filtered);
      setLoading(false);
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

  const renderHistoryItem = ({ item }) => {
    const isRejected = item.status === "Ditolak" || item.status === "Gagal";
    
    return (
      <View style={[styles.ticketCard, { opacity: 0.8 }]}>
        <View style={styles.cardHeader}>
          <View style={styles.parkInfo}>
            <Ionicons name="archive-outline" size={20} color="#64748B" />
            <Text style={styles.parkName} numberOfLines={1}>{item.parkName}</Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: 
              item.status === "Ditolak" ? '#FEE2E2' : 
              item.status === "Telah Digunakan" ? '#DCFCE7' :
              '#E2E8F0'
          }]}>
            <Text style={[styles.statusText, { 
              color: 
                item.status === "Ditolak" ? '#EF4444' : 
                item.status === "Telah Digunakan" ? '#10B981' :
                '#64748B' 
            }]}>
              {item.status === "Sah" ? "Tamat Tempoh" : item.status}
            </Text>
        </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.detailText}>Tarikh Lawatan: {item.bookingDate}</Text>
          <Text style={styles.hintText}>Klik untuk lihat rekod penuh</Text>
        </View>

        <TouchableOpacity 
          style={styles.detailsBtn} 
          onPress={() => {
            setTicketForModal(item);
            setIsQrVisible(true);
            setIsImageLoading(true);
          }}
        >
          <Text style={styles.detailsBtnText}>Lihat Rekod</Text>
          <Ionicons name="chevron-forward" size={16} color="#0077B6" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <MaintenanceOverlay />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#03045E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sejarah Tiket</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0077B6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={historyTickets}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>Tiada sejarah rekod.</Text>
            </View>
          }
        />
      )}

      <Modal visible={isQrVisible} transparent={true} animationType="fade">
        <View style={styles.modalBg}>
          {ticketForModal && (
            <View style={styles.modernTicketContainer}>
              <View style={[styles.modernTicketTop, { backgroundColor: '#F1F5F9' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalSubTitle}>REKOD TIKET</Text>
                  <TouchableOpacity onPress={() => setIsQrVisible(false)}>
                    <Ionicons name="close-circle" size={28} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.parkNameDark}>{ticketForModal.parkName}</Text>
                
                <View style={styles.paxContainer}>
                  <Text style={styles.paxTitle}>Butiran Pax:</Text>
                  <View style={styles.paxGrid}>
                    <Text style={styles.paxItem}>Dewasa: {ticketForModal.counts?.adult || 0}</Text>
                    <Text style={styles.paxItem}>Kanak: {ticketForModal.counts?.child || 0}</Text>
                    <Text style={styles.paxItem}>Warga: {ticketForModal.counts?.senior || 0}</Text>
                    <Text style={styles.paxItem}>OKU: {ticketForModal.counts?.oku || 0}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.separator}>
                <View style={styles.holeLeft} /><View style={styles.dash} /><View style={styles.holeRight} />
              </View>

              <View style={styles.modernTicketBottom}>
              {ticketForModal.status === "Telah Digunakan" ? (
                  <View style={styles.qrWrapper}>
                    <Image 
                      source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticketForModal.id}` }} 
                      style={[styles.qrImage, { opacity: 0.3 }]} 
                    />
                    <View style={styles.expiredOverlay}>
                      <Text style={[styles.expiredStamp, { borderColor: '#10B981', color: '#10B981' }]}>
                        TELAH DIGUNAKAN
                      </Text>
                    </View>
                  </View>
                ) : ticketForModal.status === "Sah" ? (
                  <View style={styles.qrWrapper}>
                    <Image 
                      source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticketForModal.id}` }} 
                      style={[styles.qrImage, { opacity: 0.3 }]}
                      onLoad={() => setIsImageLoading(false)}
                    />
                    <View style={styles.expiredOverlay}>
                      <Text style={styles.expiredStamp}>TAMAT TEMPOH</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.rejectedBox}>
                    <Ionicons name="close-circle-outline" size={80} color="#EF4444" />
                    <Text style={styles.rejectedStamp}>DITOLAK</Text>
                  </View>
                )}
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tarikh Lawatan:</Text>
                  <Text style={styles.infoValue}>{ticketForModal.bookingDate}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ID Tiket:</Text>
                  <Text style={styles.infoValue}>TKT-{ticketForModal.id.slice(0,8).toUpperCase()}</Text>
                </View>

                <View style={styles.noticeBox}>
                  <Text style={styles.noticeText}>
                    {ticketForModal.status === "Sah" 
                      ? "Rekod ini disimpan untuk rujukan anda sahaja. Tiket ini tidak lagi sah untuk kemasukan." 
                      : "Permohonan tiket ini telah ditolak oleh pihak pengurusan."}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { padding: 8, backgroundColor: '#FFF', borderRadius: 12, elevation: 2 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#03045E' },
  listContent: { padding: 20, paddingBottom: 50 },
  ticketCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  parkInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  parkName: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginLeft: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  cardBody: { marginBottom: 15 },
  detailText: { fontSize: 14, color: '#64748B' },
  hintText: { fontSize: 12, color: '#94A3B8', marginTop: 4, fontStyle: 'italic' },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' },
  detailsBtnText: { color: '#0077B6', fontWeight: 'bold', marginRight: 4 },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modernTicketContainer: { width: '85%', backgroundColor: '#FFF', borderRadius: 24, overflow: 'hidden' },
  modernTicketTop: { padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalSubTitle: { fontSize: 12, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 1 },
  parkNameDark: { fontSize: 22, fontWeight: '900', color: '#03045E', marginTop: 10 },
  paxContainer: { marginTop: 15, padding: 12, backgroundColor: '#FFF', borderRadius: 12 },
  paxTitle: { fontSize: 12, color: '#64748B', marginBottom: 5 },
  paxGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  paxItem: { width: '50%', fontSize: 13, color: '#334155', fontWeight: '600' },
  
  separator: { flexDirection: 'row', alignItems: 'center', height: 30 },
  holeLeft: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.7)', marginLeft: -10 },
  dash: { flex: 1, height: 1, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  holeRight: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.7)', marginRight: -10 },
  
  modernTicketBottom: { padding: 25, alignItems: 'center' },
  qrWrapper: { position: 'relative', padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12 },
  qrImage: { width: 150, height: 150 },
  expiredOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  expiredStamp: { borderWidth: 3, borderColor: '#64748B', color: '#64748B', fontSize: 18, fontWeight: '900', padding: 5, transform: [{ rotate: '-15deg' }] },
  
  rejectedBox: { alignItems: 'center', marginBottom: 20 },
  rejectedStamp: { color: '#EF4444', fontSize: 24, fontWeight: '900', marginTop: 10 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
  infoLabel: { color: '#94A3B8', fontSize: 13 },
  infoValue: { color: '#1E293B', fontWeight: 'bold', fontSize: 13 },
  
  noticeBox: { marginTop: 20, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10 },
  noticeText: { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94A3B8', marginTop: 10 }
});
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, Modal, Platform, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import MaintenanceOverlay from '../components/MaintenanceOverlay';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';

export default function HistoryTicketsScreen() {
  const { t } = useTranslation(); // 自动继承全局语言设定
  const router = useRouter();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  const [historyTickets, setHistoryTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isQrVisible, setIsQrVisible] = useState(false);
  const [ticketForModal, setTicketForModal] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);
  const [isEReceiptVisible, setIsEReceiptVisible] = useState(false); 
  const [isReceiptImageVisible, setIsReceiptImageVisible] = useState(false);

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
    }, (error) => {
      console.log("Pemantauan HistoryTicket dihentikan secara automatik kerana user log keluar.");
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

  // Helper function: Translate database status to display language
  const getTranslatedStatus = (status) => {
    if (status === "Sah") return t('status_expired'); // In history, "Sah" means it expired
    if (status === "Telah Digunakan") return t('status_used');
    if (status === "Ditolak") return t('status_rejected');
    if (status === "Gagal") return t('status_failed');
    return status;
  };

  const handleDownloadPDF = async () => {
    if (!ticketForModal) {
      Alert.alert("Ralat", t('alert_ticket_not_found'));
      return;
    }

    try {
      let itemRowsHtml = "";
      if (ticketForModal.counts?.adult > 0) {
        const uPrice = parseFloat(ticketForModal.prices?.adult || 0).toFixed(2);
        const sub = (ticketForModal.counts.adult * (ticketForModal.prices?.adult || 0)).toFixed(2);
        itemRowsHtml += `<tr><td style="padding: 8px 0; color: #475569;">${ticketForModal.counts.adult} x ${t('pax_adult')} <span style="font-size: 12px; color: #94A3B8;">(RM ${uPrice}/pax)</span></td><td style="padding: 8px 0; text-align: right; font-weight: bold;">RM ${sub}</td></tr>`;
      }
      if (ticketForModal.counts?.child > 0) {
        const uPrice = parseFloat(ticketForModal.prices?.child || 0).toFixed(2);
        const sub = (ticketForModal.counts.child * (ticketForModal.prices?.child || 0)).toFixed(2);
        itemRowsHtml += `<tr><td style="padding: 8px 0; color: #475569;">${ticketForModal.counts.child} x ${t('pax_child')} <span style="font-size: 12px; color: #94A3B8;">(RM ${uPrice}/pax)</span></td><td style="padding: 8px 0; text-align: right; font-weight: bold;">RM ${sub}</td></tr>`;
      }
      if (ticketForModal.counts?.senior > 0) {
        const uPrice = parseFloat(ticketForModal.prices?.senior || 0).toFixed(2);
        const sub = (ticketForModal.counts.senior * (ticketForModal.prices?.senior || 0)).toFixed(2);
        itemRowsHtml += `<tr><td style="padding: 8px 0; color: #475569;">${ticketForModal.counts.senior} x ${t('pax_senior')} <span style="font-size: 12px; color: #94A3B8;">(RM ${uPrice}/pax)</span></td><td style="padding: 8px 0; text-align: right; font-weight: bold;">RM ${sub}</td></tr>`;
      }
      if (ticketForModal.counts?.oku > 0) {
        const uPrice = parseFloat(ticketForModal.prices?.oku || 0).toFixed(2);
        const sub = (ticketForModal.counts.oku * (ticketForModal.prices?.oku || 0)).toFixed(2);
        itemRowsHtml += `<tr><td style="padding: 8px 0; color: #475569;">${ticketForModal.counts.oku} x ${t('pax_oku')} <span style="font-size: 12px; color: #94A3B8;">(RM ${uPrice}/pax)</span></td><td style="padding: 8px 0; text-align: right; font-weight: bold;">RM ${sub}</td></tr>`;
      }

      const htmlTemplate = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 50px; color: #1E293B; }
              .invoice-container { max-width: 700px; margin: auto; border: 1px solid #E2E8F0; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
              .header { text-align: center; border-bottom: 2px dashed #CBD5E1; padding-bottom: 25px; margin-bottom: 25px; }
              .logo { font-size: 22px; font-weight: 900; color: #03045E; letter-spacing: 1px; margin: 0; }
              .sub-logo { font-size: 11px; color: #64748B; margin-top: 5px; text-transform: uppercase; }
              .title { font-size: 26px; font-weight: bold; color: #10B981; margin-top: 20px; letter-spacing: 3px; }
              .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
              .info-label { color: #64748B; padding: 6px 0; width: 35%; }
              .info-value { font-weight: bold; color: #1E293B; padding: 6px 0; text-align: right; }
              .divider { height: 1px; border-top: 2px dashed #CBD5E1; margin: 25px 0; }
              .section-title { font-size: 12px; font-weight: bold; color: #94A3B8; letter-spacing: 1.5px; margin-bottom: 10px; text-transform: uppercase; }
              .total-table { width: 100%; margin-top: 15px; }
              .total-label { font-size: 16px; font-weight: 900; color: #03045E; }
              .total-value { font-size: 24px; font-weight: 900; color: #0077B6; text-align: right; }
              .footer-text { text-align: center; font-size: 12px; color: #94A3B8; margin-top: 60px; font-style: italic; border-top: 1px solid #E2E8F0; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="invoice-container">
              <div class="header">
                <p class="logo">E-TIKET TAMAN LAUT</p>
                <p class="sub-logo">${t('ereceipt_sublogo')}</p>
                <div class="title">${t('ereceipt_title')}</div>
              </div>
              <table class="info-table">
                <tr><td class="info-label">${t('ereceipt_date')}:</td><td class="info-value">${ticketForModal.bookingDate}</td></tr>
                <tr><td class="info-label">${t('ereceipt_tx_no')}:</td><td class="info-value">TX-${ticketForModal.transactionId?.slice(0, 8).toUpperCase() || '10293'}</td></tr>
                <tr><td class="info-label">${t('ereceipt_park')}:</td><td class="info-value">${ticketForModal.parkName}</td></tr>
              </table>
              <div class="divider"></div>
              <div class="section-title">${t('ereceipt_details')}</div>
              <table style="width: 100%; font-size: 15px;">
                ${itemRowsHtml}
              </table>
              <div class="divider"></div>
              <table class="total-table">
                <tr>
                  <td class="total-label">${t('ereceipt_grand_total')}</td>
                  <td class="total-value">RM ${ticketForModal.totalAmount ? parseFloat(ticketForModal.totalAmount).toFixed(2) : "0.00"}</td>
                </tr>
              </table>
              <p class="footer-text">${t('ereceipt_footer')}</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlTemplate });
      const isSharingAvailable = await Sharing.isAvailableAsync();
      
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('share_dialog_title'),
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert("Ralat", t('alert_share_not_supported'));
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Ralat", t('alert_pdf_failed') + error.message);
    }
  };

  const renderHistoryItem = ({ item }) => {
    return (
      <View style={[styles.ticketCard, { opacity: 0.8 }]}>
        <View style={styles.cardHeader}>
          <View style={styles.parkInfo}>
            <Ionicons name="archive-outline" size={20} color="#64748B" />
            <Text style={styles.parkName} numberOfLines={1}>{item.parkName}</Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: 
              item.status === "Ditolak" || item.status === "Gagal" ? '#FEE2E2' : 
              item.status === "Telah Digunakan" ? '#DCFCE7' :
              '#E2E8F0'
          }]}>
            <Text style={[styles.statusText, { 
              color: 
                item.status === "Ditolak" || item.status === "Gagal" ? '#EF4444' : 
                item.status === "Telah Digunakan" ? '#10B981' :
                '#64748B' 
            }]}>
              {getTranslatedStatus(item.status)}
            </Text>
        </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.detailText}>{t('ticket_visit_date')}: {item.bookingDate}</Text>
          <Text style={styles.hintText}>{t('ticket_hint_full_record')}</Text>
        </View>

        <View style={styles.cardFooter}>
          {item.status === 'Telah Digunakan' || item.status === 'Sah' ? (
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', borderWidth: 1 }]} 
              onPress={() => { 
                setTicketForModal(item);
                setIsEReceiptVisible(true);
              }}
            >
              <Ionicons name="receipt-outline" size={16} color="#0077B6" />
              <Text style={styles.actionBtnText}>{t('ticket_btn_ereceipt')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => { 
                setPreviewReceiptUrl(item.receiptUrl);
                setIsReceiptImageVisible(true);
              }}
            >
              <Ionicons name="image-outline" size={16} color="#64748B" />
              <Text style={[styles.actionBtnText, { color: '#64748B' }]}>{t('ticket_btn_proof')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.qrBtn} 
            onPress={() => {
              setTicketForModal(item);
              setIsQrVisible(true);
              setIsImageLoading(true);
            }}
          >
            <Ionicons name="archive-outline" size={16} color="#FFFFFF" />
            <Text style={styles.qrBtnText}>{t('ticket_btn_view_record')}</Text>
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>{t('header_ticket_history')}</Text>
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
              <Text style={styles.emptyText}>{t('empty_no_history')}</Text>
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
                  <Text style={styles.modalSubTitle}>{t('modal_history_title')}</Text>
                  <TouchableOpacity onPress={() => setIsQrVisible(false)}>
                    <Ionicons name="close-circle" size={28} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.parkNameDark}>{ticketForModal.parkName}</Text>
                
                <View style={styles.paxContainer}>
                  <Text style={styles.paxTitle}>{t('modal_qr_pax_details')}</Text>
                  <View style={styles.paxGrid}>
                    <Text style={styles.paxItem}>{t('pax_adult')}: {ticketForModal.counts?.adult || 0}</Text>
                    <Text style={styles.paxItem}>{t('pax_child')}: {ticketForModal.counts?.child || 0}</Text>
                    <Text style={styles.paxItem}>{t('pax_senior')}: {ticketForModal.counts?.senior || 0}</Text>
                    <Text style={styles.paxItem}>{t('pax_oku')}: {ticketForModal.counts?.oku || 0}</Text>
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
                        {t('status_used')}
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
                      <Text style={styles.expiredStamp}>{t('status_expired')}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.rejectedBox}>
                    <Ionicons name="close-circle-outline" size={80} color="#EF4444" />
                    <Text style={styles.rejectedStamp}>{t('status_rejected')}</Text>
                  </View>
                )}
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('ticket_visit_date')}:</Text>
                  <Text style={styles.infoValue}>{ticketForModal.bookingDate}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ID Tiket:</Text>
                  <Text style={styles.infoValue}>TKT-{ticketForModal.id.slice(0,8).toUpperCase()}</Text>
                </View>

                <View style={styles.noticeBox}>
                  <Text style={styles.noticeText}>
                    {ticketForModal.status === "Sah" || ticketForModal.status === "Telah Digunakan"
                      ? t('notice_history_expired') 
                      : t('notice_history_rejected')}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={isReceiptImageVisible} transparent={true} animationType="fade">
        <View style={styles.receiptOverlay}>
          <TouchableOpacity style={styles.receiptCloseBtn} onPress={() => setIsReceiptImageVisible(false)}>
            <Ionicons name="close-circle" size={40} color="#FFF" />
          </TouchableOpacity>
          {previewReceiptUrl && (
            <Image source={{ uri: previewReceiptUrl }} style={styles.receiptImageLarge} resizeMode="contain" />
          )}
        </View>
      </Modal>

      <Modal visible={isEReceiptVisible} transparent={true} animationType="slide">
        <View style={styles.eReceiptBg}>
          {ticketForModal && (
            <View style={styles.eReceiptContainer}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.eReceiptTop}>
                  <Text style={styles.eReceiptLogo}>E-TIKET TAMAN LAUT</Text>
                  <Text style={styles.eReceiptSubLogo}>{t('ereceipt_sublogo')}</Text>
                  <Text style={styles.eReceiptTitle}>{t('ereceipt_title')}</Text>
                </View>

                <View style={styles.eReceiptBody}>
                  <View style={styles.eReceiptRow}>
                    <Text style={styles.eReceiptLabel}>{t('ereceipt_date')}:</Text>
                    <Text style={styles.eReceiptValue}>{ticketForModal.bookingDate}</Text>
                  </View>
                  <View style={styles.eReceiptRow}>
                    <Text style={styles.eReceiptLabel}>{t('ereceipt_tx_no')}:</Text>
                    <Text style={styles.eReceiptValue}>TX-{ticketForModal.transactionId?.slice(0,8).toUpperCase() || '10293'}</Text>
                  </View>
                  <View style={styles.eReceiptRow}>
                    <Text style={styles.eReceiptLabel}>{t('ereceipt_park')}:</Text>
                    <Text style={styles.eReceiptValue}>{ticketForModal.parkName}</Text>
                  </View>
                  
                  <View style={styles.dashedDivider} />

                  <Text style={styles.tableHeader}>{t('ereceipt_details')}</Text>
                  
                  {ticketForModal.counts?.adult > 0 && (
                    <View style={styles.eReceiptRow}>
                      <Text style={styles.eReceiptLabel}>
                        {ticketForModal.counts.adult} x {t('pax_adult')} <Text style={{fontSize: 12, color: '#94A3B8'}}>(RM {parseFloat(ticketForModal.prices?.adult || 0).toFixed(2)}/pax)</Text>
                      </Text>
                      <Text style={styles.eReceiptValue}>RM {(ticketForModal.counts.adult * (ticketForModal.prices?.adult || 0)).toFixed(2)}</Text>
                    </View>
                  )}
                  {ticketForModal.counts?.child > 0 && (
                    <View style={styles.eReceiptRow}>
                      <Text style={styles.eReceiptLabel}>
                        {ticketForModal.counts.child} x {t('pax_child')} <Text style={{fontSize: 12, color: '#94A3B8'}}>(RM {parseFloat(ticketForModal.prices?.child || 0).toFixed(2)}/pax)</Text>
                      </Text>
                      <Text style={styles.eReceiptValue}>RM {(ticketForModal.counts.child * (ticketForModal.prices?.child || 0)).toFixed(2)}</Text>
                    </View>
                  )}
                  {ticketForModal.counts?.senior > 0 && (
                    <View style={styles.eReceiptRow}>
                      <Text style={styles.eReceiptLabel}>
                        {ticketForModal.counts.senior} x {t('pax_senior')} <Text style={{fontSize: 12, color: '#94A3B8'}}>(RM {parseFloat(ticketForModal.prices?.senior || 0).toFixed(2)}/pax)</Text>
                      </Text>
                      <Text style={styles.eReceiptValue}>RM {(ticketForModal.counts.senior * (ticketForModal.prices?.senior || 0)).toFixed(2)}</Text>
                    </View>
                  )}
                  {ticketForModal.counts?.oku > 0 && (
                    <View style={styles.eReceiptRow}>
                      <Text style={styles.eReceiptLabel}>
                        {ticketForModal.counts.oku} x {t('pax_oku')} <Text style={{fontSize: 12, color: '#94A3B8'}}>(RM {parseFloat(ticketForModal.prices?.oku || 0).toFixed(2)}/pax)</Text>
                      </Text>
                      <Text style={styles.eReceiptValue}>RM {(ticketForModal.counts.oku * (ticketForModal.prices?.oku || 0)).toFixed(2)}</Text>
                    </View>
                  )}

                  <View style={styles.dashedDivider} />

                  <View style={styles.eReceiptRowTotal}>
                    <Text style={styles.eReceiptLabelTotal}>{t('ereceipt_grand_total')}</Text>
                    <Text style={styles.eReceiptValueTotal}>RM {ticketForModal.totalAmount ? parseFloat(ticketForModal.totalAmount).toFixed(2) : "0.00"}</Text>
                  </View>

                  <Text style={styles.eReceiptFooter}>{t('ereceipt_footer')}</Text>
                </View>
              </ScrollView>

              <View style={styles.eReceiptActions}>
                <TouchableOpacity style={styles.closeReceiptBtn} onPress={() => setIsEReceiptVisible(false)}>
                  <Text style={styles.closeReceiptBtnText}>{t('btn_close')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.downloadPdfBtn} onPress={handleDownloadPDF}>
                  <Ionicons name="download-outline" size={18} color="#FFF" />
                  <Text style={styles.downloadPdfBtnText}>{t('btn_download_pdf')}</Text>
                </TouchableOpacity>
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
  emptyText: { color: '#94A3B8', marginTop: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 15 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 16 },
  actionBtnText: { fontSize: 13, color: '#0077B6', fontWeight: 'bold', marginLeft: 6 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#64748B', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 16, shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  qrBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginLeft: 6 },

  receiptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  receiptCloseBtn: { position: 'absolute', top: 50, right: 25, zIndex: 10 },
  receiptImageLarge: { width: '95%', height: '80%' },

  eReceiptBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  eReceiptContainer: { width: '88%', maxHeight: '85%', backgroundColor: '#F8FAFC', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  eReceiptTop: { backgroundColor: '#FFF', padding: 25, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', borderStyle: 'dashed' },
  eReceiptLogo: { fontSize: 18, fontWeight: '900', color: '#03045E', letterSpacing: 1 },
  eReceiptSubLogo: { fontSize: 10, color: '#64748B', marginTop: 4, textAlign: 'center' },
  eReceiptTitle: { fontSize: 22, fontWeight: 'bold', color: '#10B981', marginTop: 15, letterSpacing: 2 },
  eReceiptBody: { padding: 25, backgroundColor: '#FFF', position: 'relative' },
  eReceiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  eReceiptLabel: { fontSize: 14, color: '#64748B' },
  eReceiptValue: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', textAlign: 'right', flex: 1, marginLeft: 10 },
  dashedDivider: { height: 1, borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', marginVertical: 15 },
  tableHeader: { fontSize: 12, fontWeight: 'bold', color: '#94A3B8', marginBottom: 10, letterSpacing: 1 },
  eReceiptRowTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  eReceiptLabelTotal: { fontSize: 16, fontWeight: '900', color: '#03045E' },
  eReceiptValueTotal: { fontSize: 20, fontWeight: '900', color: '#0077B6' },
  eReceiptFooter: { textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 40, fontStyle: 'italic' },
  eReceiptActions: { flexDirection: 'row', padding: 15, backgroundColor: '#F1F5F9', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  closeReceiptBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, marginRight: 10, backgroundColor: '#E2E8F0' },
  closeReceiptBtnText: { color: '#475569', fontWeight: 'bold' },
  downloadPdfBtn: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0077B6', borderRadius: 10 },
  downloadPdfBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },
});
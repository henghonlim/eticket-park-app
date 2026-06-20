import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AdminHeader from '../components/AdminHeader';
import MaintenanceOverlay from '../components/MaintenanceOverlay';

export default function AdminFinanceScreen() {
  const [activeTab, setActiveTab] = useState('sales'); 
  const [dateFilter, setDateFilter] = useState('Sepanjang Masa');
  const [isDateDropdownVisible, setIsDateDropdownVisible] = useState(false); 

  const [visitorFilter, setVisitorFilter] = useState('Semua'); 
  
  const [seasonView, setSeasonView] = useState('Bulan'); 
  const [seasonMonth, setSeasonMonth] = useState(new Date().getMonth());
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [seasonDecade, setSeasonDecade] = useState(Math.floor(new Date().getFullYear() / 10) * 10);

  const DATE_OPTIONS = ['Sepanjang Masa', 'Hari Ini', 'Bulan Ini', 'Tahun Ini'];
  const MONTH_NAMES = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];

  const [loading, setLoading] = useState(true);
  const [rawTickets, setRawTickets] = useState([]);
  const [rawTransactions, setRawTransactions] = useState([]);

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const txSnap = await getDocs(collection(db, "transactions"));
      const txData = txSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const tkSnap = await getDocs(collection(db, "tickets"));
      const tkData = tkSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setRawTransactions(txData);
      setRawTickets(tkData);
    } catch (error) {
      Alert.alert("Ralat", "Gagal memuat turun data kewangan.");
    } finally {
      setLoading(false);
    }
  };

  const parseCustomDate = (dateStr) => {
    if (!dateStr) return new Date();
    const months = { "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5, "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11, "Januari": 0, "Februari": 1, "Mac": 2, "Mei": 4, "Jun": 5, "Julai": 6, "Ogos": 7, "Oktober": 9, "Disember": 11 };
    const parts = String(dateStr).trim().split(' ');
    if (parts.length === 3) return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
    return new Date(dateStr);
  };

  const processedData = useMemo(() => {
    const now = new Date();
    let filteredTk = rawTickets;

    if (dateFilter !== 'Sepanjang Masa') {
      filteredTk = rawTickets.filter(tk => {
        const tkDate = parseCustomDate(tk.bookingDate);
        if (dateFilter === 'Hari Ini') return tkDate.toDateString() === now.toDateString();
        if (dateFilter === 'Bulan Ini') return tkDate.getMonth() === now.getMonth() && tkDate.getFullYear() === now.getFullYear();
        if (dateFilter === 'Tahun Ini') return tkDate.getFullYear() === now.getFullYear();
        return true;
      });
    }

    const validTickets = filteredTk.filter(tk => tk.status === 'Sah' || tk.status === 'Telah Digunakan');
    const rejectedTickets = filteredTk.filter(tk => tk.status === 'Ditolak' || tk.status === 'Gagal');

    let totalRevenue = 0, totalVisitors = 0, missedRevenue = 0; 
    const parkStats = {}, lossStats = {}; 

    validTickets.forEach(tk => {
      const park = tk.parkName || "Lain-lain";
      if (!parkStats[park]) parkStats[park] = { revenue: 0, tickets: 0, visitors: 0, warganegara: { total: 0, dewasa: 0, kanak: 0, senior: 0, oku: 0 }, bukanWarganegara: { total: 0, dewasa: 0, kanak: 0, senior: 0, oku: 0 } };
      
      const amount = parseFloat(tk.totalAmount || 0);
      totalRevenue += amount;
      parkStats[park].revenue += amount;

      const c = tk.counts || {};
      const d = Number(c.adult||0), k = Number(c.child||0), s = Number(c.senior||0), o = Number(c.oku||0);
      const sumPax = d + k + s + o; 
      
      totalVisitors += sumPax;
      parkStats[park].tickets += sumPax;
      parkStats[park].visitors += sumPax;

      const isBukan = tk.ticketCategory === 'Bukan Warganegara' || tk.nationalityType === 'Bukan Warganegara';
      if (!isBukan) {
        parkStats[park].warganegara.total += sumPax; parkStats[park].warganegara.dewasa += d; parkStats[park].warganegara.kanak += k; parkStats[park].warganegara.senior += s; parkStats[park].warganegara.oku += o;
      } else {
        parkStats[park].bukanWarganegara.total += sumPax; parkStats[park].bukanWarganegara.dewasa += d; parkStats[park].bukanWarganegara.kanak += k; parkStats[park].bukanWarganegara.senior += s; parkStats[park].bukanWarganegara.oku += o;
      }
    });

    rejectedTickets.forEach(tk => {
      const amt = parseFloat(tk.totalAmount || 0);
      missedRevenue += amt;
      lossStats[tk.parkName || "Lain-lain"] = (lossStats[tk.parkName || "Lain-lain"] || 0) + amt;
    });

    const salesBarData = Object.keys(parkStats).map(park => ({ value: parkStats[park].tickets, label: park.split(' ').pop(), frontColor: '#0077B6', topLabelComponent: () => <Text style={{fontSize: 10, color: '#03045E', fontWeight: 'bold'}}>{parkStats[park].tickets}</Text> }));
    const revenueBarData = Object.keys(parkStats).map(park => ({ value: parkStats[park].revenue, label: park.split(' ').pop(), frontColor: '#10B981', topLabelComponent: () => <Text style={{fontSize: 9, color: '#065F46', fontWeight: 'bold'}}>{Math.round(parkStats[park].revenue)}</Text> }));

    let globalWarganegara = 0, globalBukan = 0;
    Object.values(parkStats).forEach(p => { globalWarganegara += p.warganegara.total; globalBukan += p.bukanWarganegara.total; });
    const totalPieVisitors = globalWarganegara + globalBukan;
    const getPct = (val) => totalPieVisitors > 0 ? parseFloat((val / totalPieVisitors * 100).toFixed(1)) + '%' : '0%';
    const visitorPieData = [ { value: globalWarganegara, color: '#03045E', pct: getPct(globalWarganegara), labelName: 'Warganegara', pax: globalWarganegara }, { value: globalBukan, color: '#00B4D8', pct: getPct(globalBukan), labelName: 'Bukan Warga', pax: globalBukan } ].filter(i => i.value > 0);

    const sortedParksBySales = Object.keys(parkStats).sort((a,b) => parkStats[b].tickets - parkStats[a].tickets);

    const allValidTickets = rawTickets.filter(tk => tk.status === 'Sah' || tk.status === 'Telah Digunakan');
    let seasonDataFinal = [];
    
    if (seasonView === 'Hari') {
      const daysInMonth = new Date(seasonYear, seasonMonth + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) seasonDataFinal.push({ label: i.toString(), value: 0 });
    } else if (seasonView === 'Bulan') {
      for (let i = 0; i < 12; i++) seasonDataFinal.push({ label: MONTH_NAMES[i], value: 0 });
    } else if (seasonView === 'Tahun') {
      for (let i = 0; i < 10; i++) seasonDataFinal.push({ label: (seasonDecade + i).toString(), value: 0 });
    }

    allValidTickets.forEach(tk => {
      const bDate = parseCustomDate(tk.bookingDate);
      const sumPax = Number(tk.counts?.adult||0) + Number(tk.counts?.child||0) + Number(tk.counts?.senior||0) + Number(tk.counts?.oku||0);
      
      if (seasonView === 'Hari' && bDate.getMonth() === seasonMonth && bDate.getFullYear() === seasonYear) {
        seasonDataFinal[bDate.getDate() - 1].value += sumPax;
      } else if (seasonView === 'Bulan' && bDate.getFullYear() === seasonYear) {
        seasonDataFinal[bDate.getMonth()].value += sumPax;
      } else if (seasonView === 'Tahun' && bDate.getFullYear() >= seasonDecade && bDate.getFullYear() < seasonDecade + 10) {
        seasonDataFinal[bDate.getFullYear() - seasonDecade].value += sumPax;
      }
    });

    let peakInfoSeason = { label: '-', max: 0, fullLabel: '' };
    seasonDataFinal.forEach((item) => {
      if (item.value > peakInfoSeason.max) {
        let displayStr = item.label;
        if (seasonView === 'Hari') displayStr = `${item.label} ${MONTH_NAMES[seasonMonth]} ${seasonYear}`;
        else if (seasonView === 'Bulan') displayStr = `${item.label} ${seasonYear}`;
        else displayStr = `Tahun ${item.label}`;
        peakInfoSeason = { label: item.label, max: item.value, fullLabel: displayStr };
      }
    });

    return { 
      totalRevenue, totalVisitors, totalTicketsSold: totalVisitors, missedRevenue, parkStats, lossStats, 
      salesBarData, revenueBarData, visitorPieData, globalWarganegara, globalBukan, totalPieVisitors,
      sortedParksBySales, seasonDataFinal, peakInfoSeason
    };
  }, [rawTickets, rawTransactions, dateFilter, seasonView, seasonMonth, seasonYear, seasonDecade]);

  const handlePrevTime = () => {
    if (seasonView === 'Hari') {
      if (seasonMonth === 0) { setSeasonMonth(11); setSeasonYear(y => y - 1); } else setSeasonMonth(m => m - 1);
    } else if (seasonView === 'Bulan') { setSeasonYear(y => y - 1); } 
    else if (seasonView === 'Tahun') { setSeasonDecade(d => d - 10); }
  };

  const handleNextTime = () => {
    if (seasonView === 'Hari') {
      if (seasonMonth === 11) { setSeasonMonth(0); setSeasonYear(y => y + 1); } else setSeasonMonth(m => m + 1);
    } else if (seasonView === 'Bulan') { setSeasonYear(y => y + 1); } 
    else if (seasonView === 'Tahun') { setSeasonDecade(d => d + 10); }
  };

  const getTimeNavLabel = () => {
    if (seasonView === 'Hari') return `${MONTH_NAMES[seasonMonth]} ${seasonYear}`;
    if (seasonView === 'Bulan') return `${seasonYear}`;
    if (seasonView === 'Tahun') return `${seasonDecade} - ${seasonDecade + 9}`;
  };

  const exportPDFReport = async () => {
    try {
      let parkDetailsHtml = "";
      Object.keys(processedData.parkStats).forEach(park => {
        const p = processedData.parkStats[park];
        const totalDws = p.warganegara.dewasa + p.bukanWarganegara.dewasa;
        const totalKnk = p.warganegara.kanak + p.bukanWarganegara.kanak;
        const totalSnr = p.warganegara.senior + p.bukanWarganegara.senior;
        const totalOku = p.warganegara.oku + p.bukanWarganegara.oku;

        parkDetailsHtml += `
          <tr style="background: #FFFFFF; border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 12px 10px; font-weight: bold; color: #1E293B;">${park}</td>
            <td style="padding: 12px 10px; text-align: center; color: #0077B6; font-weight: bold;">${p.tickets}</td>
            <td style="padding: 12px 10px; text-align: center; font-size: 11px; color: #475569;">
              <span style="color: #03045E; font-weight: bold;">Warga: ${p.warganegara.total}</span><br/>
              <span style="color: #00B4D8; font-weight: bold;">Asing: ${p.bukanWarganegara.total}</span>
            </td>
            <td style="padding: 12px 10px; font-size: 11px; color: #475569;">
              Dws: <b>${totalDws}</b> | Knk: <b>${totalKnk}</b><br/>
              Emas: <b>${totalSnr}</b> | OKU: <b>${totalOku}</b>
            </td>
            <td style="padding: 12px 10px; text-align: right; color: #10B981; font-weight: 900;">RM ${p.revenue.toFixed(2)}</td>
          </tr>
        `;
      });

      let lossDetailsHtml = "";
      if (Object.keys(processedData.lossStats || {}).length > 0) {
        Object.keys(processedData.lossStats).forEach(park => {
          lossDetailsHtml += `
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #FECACA; font-size: 13px;">
              <span style="color: #7F1D1D;">${park}</span>
              <span style="color: #DC2626; font-weight: bold;">RM ${processedData.lossStats[park].toFixed(2)}</span>
            </div>
          `;
        });
      } else {
        lossDetailsHtml = `<p style="color: #9CA3AF; font-size: 12px; font-style: italic;">Tiada rekod tiket ditolak atau dibatalkan.</p>`;
      }

      const peakHtml = processedData.peakInfoSeason.max > 0 
        ? `Waktu puncak dikesan pada <b>${processedData.peakInfoSeason.fullLabel}</b> dengan kehadiran seramai <b style="color: #D97706;">${processedData.peakInfoSeason.max} Pax</b>.`
        : `Tiada data kemasukan pelawat yang mencukupi untuk menganalisis musim puncak dalam tempoh ini.`;

      const htmlTemplate = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #334155; background-color: #F8FAFC; }
              .report-container { background: #FFFFFF; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #03045E; padding-bottom: 20px; }
              .header h1 { color: #03045E; margin: 0 0 5px 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
              .header p { color: #64748B; margin: 0; font-size: 13px; }
              
              .summary-grid { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 15px; }
              .summary-box { flex: 1; background: #F1F5F9; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0; }
              .summary-box.green { background: #ECFDF5; border-color: #A7F3D0; }
              .summary-box.red { background: #FEF2F2; border-color: #FECACA; }
              .summary-title { font-size: 11px; font-weight: bold; color: #64748B; text-transform: uppercase; margin-bottom: 5px; }
              .summary-value { font-size: 20px; font-weight: 900; color: #1E293B; }
              
              .section-title { font-size: 14px; font-weight: bold; color: #03045E; margin: 30px 0 10px 0; border-left: 4px solid #0077B6; padding-left: 10px; }
              
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
              th { background: #03045E; color: #FFFFFF; padding: 12px 10px; text-align: center; font-size: 12px; text-transform: uppercase; }
              th:first-child { text-align: left; }
              th:last-child { text-align: right; }
              
              .insights-box { background: #FFFBEB; border: 1px solid #FDE68A; padding: 15px; border-radius: 8px; font-size: 13px; color: #92400E; margin-bottom: 30px; }
              .loss-box { background: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
              
              .footer-signature { margin-top: 60px; display: flex; justify-content: space-between; }
              .sign-box { width: 200px; text-align: center; }
              .sign-line { border-top: 1px solid #94A3B8; margin-top: 50px; padding-top: 10px; font-size: 12px; color: #64748B; font-weight: bold; }
              
              .auto-gen { text-align: center; font-size: 10px; color: #94A3B8; margin-top: 50px; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="report-container">
              
              <div class="header">
                <h1>Laporan Kewangan & Demografi</h1>
                <p>Jabatan Taman Laut Malaysia</p>
                <p style="margin-top: 10px; font-weight: bold; color: #0077B6;">Tempoh Analisis: ${dateFilter}</p>
              </div>

              <div class="summary-grid">
                <div class="summary-box green">
                  <div class="summary-title">Jumlah Hasil Sah</div>
                  <div class="summary-value" style="color: #059669;">RM ${processedData.totalRevenue.toFixed(2)}</div>
                </div>
                <div class="summary-box">
                  <div class="summary-title">Jumlah Pelawat Masuk</div>
                  <div class="summary-value" style="color: #0284C7;">${processedData.totalTicketsSold} Pax</div>
                </div>
                <div class="summary-box red">
                  <div class="summary-title">Pendapatan Terlepas</div>
                  <div class="summary-value" style="color: #DC2626;">RM ${processedData.missedRevenue.toFixed(2)}</div>
                </div>
              </div>

              <div class="section-title">Sorotan Prestasi & Musim</div>
              <div class="insights-box">
                💡 <b>Analisis AI:</b> ${peakHtml}
              </div>

              <div class="section-title">Pecahan Jualan Mengikut Taman Laut</div>
              <table>
                <tr>
                  <th>Taman Laut</th>
                  <th>Jumlah (Pax)</th>
                  <th>Kewarganegaraan</th>
                  <th>Kategori Umur</th>
                  <th>Jumlah Hasil (RM)</th>
                </tr>
                ${parkDetailsHtml}
              </table>

              <div class="section-title">Perincian Pendapatan Terlepas (Kehilangan)</div>
              <div class="loss-box">
                <p style="margin-top: 0; font-size: 12px; color: #991B1B; margin-bottom: 10px;">Rekod nilai tiket yang ditolak, gagal atau dibatalkan:</p>
                ${lossDetailsHtml}
              </div>

              <div class="footer-signature">
                <div class="sign-box">
                  <div class="sign-line">Disediakan Oleh<br/>(Sistem e-Tiket)</div>
                </div>
                <div class="sign-box">
                  <div class="sign-line">Disemak & Disahkan Oleh<br/>(Pengurus Kewangan)</div>
                </div>
              </div>

              <div class="auto-gen">
                Dokumen ini dijana secara automatik oleh Sistem e-Tiket Taman Laut pada ${new Date().toLocaleString('ms-MY')}.
              </div>

            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlTemplate });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        try {
          const auth = getAuth();
          const adminEmail = auth.currentUser?.email || 'Admin';
          await addDoc(collection(db, "auditLogs"), {
            action: "Eksport Laporan Kewangan",
            details: `Admin (${adminEmail}) telah menjana dan memuat turun Laporan Kewangan PDF (Tempoh: ${dateFilter}).`,
            timestamp: serverTimestamp()
          });
        } catch (logError) {
          console.log("Gagal log eksport laporan:", logError);
        }
      }
    } catch (error) {
      Alert.alert("Ralat", "Gagal menjana laporan PDF.");
    }
  };

  const renderHeatmap = () => {
    const data = processedData.seasonDataFinal;
    const maxVal = processedData.peakInfoSeason.max || 1;

    const getBgColor = (val) => {
      if (val === 0) return '#F8FAFC';
      const ratio = val / maxVal;
      if (ratio <= 0.3) return '#BAE6FD';
      if (ratio <= 0.6) return '#38BDF8';
      if (ratio <= 0.9) return '#0284C7';
      return '#03045E';
    };

    const getTextColor = (val) => {
      if (val === 0) return '#94A3B8';
      const ratio = val / maxVal;
      if (ratio > 0.4) return '#FFFFFF';
      return '#03045E';
    };

    let itemStyle = styles.heatBlockHari;
    if (seasonView === 'Bulan') itemStyle = styles.heatBlockBulan;
    if (seasonView === 'Tahun') itemStyle = styles.heatBlockTahun;

    return (
      <View style={styles.heatmapContainer}>
        {data.map((item, idx) => (
          <View key={idx} style={[itemStyle, { backgroundColor: getBgColor(item.value) }]}>
            <Text style={[styles.heatLabel, { color: getTextColor(item.value) }]}>{item.label}</Text>
            {item.value > 0 ? (
              <Text style={[styles.heatValue, { color: getTextColor(item.value) }]}>{item.value} Pax</Text>
            ) : (
              <Text style={[styles.heatValueZero, { color: getTextColor(item.value) }]}>-</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <MaintenanceOverlay />
      
      <Modal visible={isDateDropdownVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setIsDateDropdownVisible(false)} activeOpacity={1}>
          <View style={styles.dropdownMenu}>
            {DATE_OPTIONS.map(option => (
              <TouchableOpacity key={option} style={[styles.dropdownItem, dateFilter === option && styles.dropdownItemActive]} onPress={() => { setDateFilter(option); setIsDateDropdownVisible(false); }}>
                <Text style={[styles.dropdownItemText, dateFilter === option && styles.dropdownItemTextActive]}>{option}</Text>
                {dateFilter === option && <Ionicons name="checkmark-circle" size={20} color="#0077B6" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <AdminHeader title="Kewangan & Analisis" subtitle="Laporan Data Taman Laut" />

      <View style={styles.globalToolsRow}>
        <TouchableOpacity style={styles.dateDropdownTrigger} onPress={() => setIsDateDropdownVisible(true)}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="calendar" size={18} color="#0077B6" style={{marginRight: 8}} />
            <Text style={styles.dateDropdownText}>{dateFilter}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={exportPDFReport}>
          <Ionicons name="document-text" size={18} color="#FFF" />
          <Text style={styles.exportBtnText}>PDF</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {loading ? (
          <ActivityIndicator size="large" color="#0077B6" style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.kpiContainer}>
            <View style={styles.kpiMainCard}>
              <View style={styles.kpiIconBox}><Ionicons name="wallet" size={24} color="#0077B6" /></View>
              <View><Text style={styles.kpiLabel}>Jumlah Hasil (RM)</Text><Text style={styles.kpiValueMain}>{processedData.totalRevenue.toFixed(2)}</Text></View>
            </View>
          </View>
        )}

        <View style={{ marginHorizontal: -20 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabSwitcherContainer}>
            {[ { id: 'sales', label: 'Tiket', icon: 'ticket-outline' }, { id: 'revenue', label: 'Hasil', icon: 'cash-outline' }, { id: 'visitors', label: 'Pelawat', icon: 'people-outline' }, { id: 'loss', label: 'Kehilangan', icon: 'trending-down-outline' }, { id: 'season', label: 'Musim', icon: 'calendar-outline' }].map(tab => (
              <TouchableOpacity key={tab.id} style={[styles.modernTab, activeTab === tab.id && styles.modernTabActive]} onPress={() => setActiveTab(tab.id)}>
                <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? '#FFF' : '#64748B'} style={{marginRight: 6}} />
                <Text style={[styles.modernTabText, activeTab === tab.id && styles.modernTabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {!loading && (
          <View style={styles.chartArea}>
            
            {activeTab === 'sales' && (
              <View>
                <View style={styles.premiumChartCard}>
                  <View style={styles.cardHeaderRow}><Ionicons name="stats-chart" size={20} color="#0077B6" /><Text style={styles.chartTitle}>Prestasi Jualan</Text></View>
                  {processedData.salesBarData.length > 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 30 }}><BarChart data={processedData.salesBarData} barWidth={35} barBorderRadius={8} frontColor="#0077B6" yAxisThickness={0} xAxisThickness={0} height={180} hideRules xAxisLabelTextStyle={{fontSize: 10, color: '#64748B', fontWeight: 'bold'}} /></View>
                  ) : <Text style={styles.emptyChartText}>Tiada data.</Text>}
                </View>
                <Text style={styles.sectionSubTitle}>Kedudukan Jualan Taman</Text>
                {processedData.sortedParksBySales.map((park, idx) => (
                    <View key={idx} style={styles.leaderboardCard}>
                      <View style={[styles.rankBadge, idx === 0 && {backgroundColor: '#FFD700'}]}><Text style={[styles.rankText, idx === 0 && {color: '#856404'}]}>{idx + 1}</Text></View>
                      <View style={{ flex: 1, marginLeft: 15 }}><Text style={styles.parkNameRank}>{park}</Text><Text style={styles.parkSubRank}>{processedData.parkStats[park].visitors} Pax telah berdaftar</Text></View>
                      <View style={{ alignItems: 'flex-end' }}><Text style={styles.rankValue}>{processedData.parkStats[park].tickets}</Text><Text style={styles.rankLabel}>Keping</Text></View>
                    </View>
                ))}
              </View>
            )}

            {activeTab === 'revenue' && (
              <View>
                <View style={[styles.premiumChartCard, {borderColor: '#10B981'}]}>
                  <View style={styles.cardHeaderRow}><Ionicons name="cash" size={20} color="#10B981" /><Text style={styles.chartTitle}>Analisis Pendapatan</Text></View>
                  {processedData.revenueBarData.length > 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 30 }}><BarChart data={processedData.revenueBarData} barWidth={35} barBorderRadius={8} frontColor="#10B981" yAxisThickness={0} xAxisThickness={0} height={180} hideRules xAxisLabelTextStyle={{fontSize: 10, color: '#64748B', fontWeight: 'bold'}} /></View>
                  ) : <Text style={styles.emptyChartText}>Tiada data.</Text>}
                </View>
                <View style={styles.revenueGrid}>
                  {Object.keys(processedData.parkStats).map((park, idx) => (
                    <View key={idx} style={styles.revenueSmallCard}><Text style={styles.revCardPark}>{park}</Text><Text style={styles.revCardVal}>RM {processedData.parkStats[park].revenue.toFixed(2)}</Text><View style={styles.revProgressBar}><View style={[styles.revProgressFill, {width: '100%'}]} /></View></View>
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'visitors' && (
              <View>
                <View style={styles.premiumChartCard}>
                  <Text style={styles.chartTitle}>Pecahan Demografi</Text>
                  {processedData.visitorPieData.length > 0 ? (
                    <View style={styles.pieContainer}>
                      <PieChart data={processedData.visitorPieData} donut innerRadius={65} radius={85} centerLabelComponent={() => (<View style={{justifyContent: 'center', alignItems: 'center'}}><Text style={{fontSize: 24, color: '#03045E', fontWeight: '900'}}>{processedData.totalPieVisitors}</Text><Text style={{fontSize: 10, color: '#94A3B8', fontWeight: 'bold'}}>JUMLAH PAX</Text></View>)} />
                      <View style={styles.legendContainer}>
                        {processedData.visitorPieData.map((item, idx) => (
                          <View key={idx} style={styles.legendItem}><View style={[styles.legendColor, { backgroundColor: item.color }]} /><View><Text style={styles.legendText}>{item.labelName}</Text><Text style={styles.legendSubText}>{item.pax} Pax ({item.pct})</Text></View></View>
                        ))}
                      </View>
                    </View>
                  ) : <Text style={styles.emptyChartText}>Tiada data.</Text>}
                </View>

                <View style={styles.subFilterRow}>
                  {['Semua', 'Warganegara', 'Bukan Warganegara'].map(f => (
                    <TouchableOpacity key={f} style={[styles.subFilterBtn, visitorFilter === f && styles.subFilterBtnActive]} onPress={() => setVisitorFilter(f)}>
                      <Text style={[styles.subFilterText, visitorFilter === f && styles.subFilterTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {Object.keys(processedData.parkStats).map((park, idx) => {
                  const p = processedData.parkStats[park];
                  let dp = visitorFilter === 'Semua' ? { total: p.warganegara.total + p.bukanWarganegara.total, d: p.warganegara.dewasa + p.bukanWarganegara.dewasa, k: p.warganegara.kanak + p.bukanWarganegara.kanak, s: p.warganegara.senior + p.bukanWarganegara.senior, o: p.warganegara.oku + p.bukanWarganegara.oku } : (visitorFilter === 'Warganegara' ? { total: p.warganegara.total, d: p.warganegara.dewasa, k: p.warganegara.kanak, s: p.warganegara.senior, o: p.warganegara.oku } : { total: p.bukanWarganegara.total, d: p.bukanWarganegara.dewasa, k: p.bukanWarganegara.kanak, s: p.bukanWarganegara.senior, o: p.bukanWarganegara.oku });
                  if (dp.total === 0) return null; 
                  return (
                    <View key={idx} style={styles.premiumParkCard}>
                      <View style={styles.premiumParkHeader}><Text style={styles.premiumParkTitle}>{park}</Text><View style={styles.premiumPaxBadge}><Text style={styles.premiumPaxText}>{dp.total} Pax</Text></View></View>
                      <View style={styles.visitorCatGrid}>
                        <View style={styles.vCatBox}><Text style={styles.vCatLabel}>Dewasa</Text><Text style={styles.vCatValue}>{dp.d}</Text></View>
                        <View style={styles.vCatBox}><Text style={styles.vCatLabel}>Kanak</Text><Text style={styles.vCatValue}>{dp.k}</Text></View>
                        <View style={styles.vCatBox}><Text style={styles.vCatLabel}>Warga Emas</Text><Text style={styles.vCatValue}>{dp.s}</Text></View>
                        <View style={styles.vCatBox}><Text style={styles.vCatLabel}>OKU</Text><Text style={styles.vCatValue}>{dp.o}</Text></View>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}

            {activeTab === 'loss' && (
              <View style={[styles.premiumChartCard, {borderColor: '#EF4444'}]}>
                <View style={styles.cardHeaderRow}><Ionicons name="trending-down" size={20} color="#EF4444" /><Text style={[styles.chartTitle, {color: '#991B1B'}]}>Pendapatan Terlepas</Text></View>
                <Text style={styles.chartDesc}>Nilai tiket yang ditolak atau dibatalkan mengikut taman.</Text>
                <View style={styles.detailList}>
                  {Object.keys(processedData.lossStats || {}).length > 0 ? (
                    Object.keys(processedData.lossStats).map((park, idx) => (
                      <View key={idx} style={styles.detailRow}><Text style={styles.detailParkName}>{park}</Text><Text style={[styles.detailValHighlight, { color: '#EF4444' }]}>RM {processedData.lossStats[park].toFixed(2)}</Text></View>
                    ))
                  ) : <Text style={styles.emptyChartText}>Tiada rekod tiket ditolak/batal.</Text>}
                </View>
                <View style={styles.totalLossBox}><Text style={styles.totalLossText}>JUMLAH KEHILANGAN</Text><Text style={styles.totalLossVal}>RM {processedData.missedRevenue.toFixed(2)}</Text></View>
              </View>
            )}

            {activeTab === 'season' && (
              <View>
                <View style={styles.premiumChartCard}>
                  <Text style={styles.chartTitle}>Heatmap Kemasukan 📅</Text>
                  
                  <View style={styles.seasonToggleRow}>
                    {['Hari', 'Bulan', 'Tahun'].map(view => (
                      <TouchableOpacity key={view} style={[styles.seasonToggleBtn, seasonView === view && styles.seasonToggleBtnActive]} onPress={() => setSeasonView(view)}>
                        <Text style={[styles.seasonToggleText, seasonView === view && styles.seasonToggleTextActive]}>{view}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.timeNavBox}>
                    <TouchableOpacity onPress={handlePrevTime} style={styles.timeNavBtn}><Ionicons name="chevron-back" size={20} color="#03045E" /></TouchableOpacity>
                    <Text style={styles.timeNavLabel}>{getTimeNavLabel()}</Text>
                    <TouchableOpacity onPress={handleNextTime} style={styles.timeNavBtn}><Ionicons name="chevron-forward" size={20} color="#03045E" /></TouchableOpacity>
                  </View>

                  {renderHeatmap()}

                </View>

                {processedData.peakInfoSeason.max > 0 ? (
                  <View style={styles.highlightBanner}>
                    <View style={styles.highlightIcon}><Ionicons name="flash" size={24} color="#FFF" /></View>
                    <View style={{flex: 1, marginLeft: 15}}>
                      <Text style={styles.highlightTitle}>Waktu Puncak Dikesan!</Text>
                      <Text style={styles.highlightDesc}>Pada <Text style={{fontWeight:'bold'}}>{processedData.peakInfoSeason.fullLabel}</Text>, seramai <Text style={{fontWeight:'bold'}}>{processedData.peakInfoSeason.max} Pax</Text> telah berkunjung.</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.highlightBanner, {backgroundColor: '#F8FAFC', borderColor: '#E2E8F0'}]}>
                    <View style={[styles.highlightIcon, {backgroundColor: '#CBD5E1'}]}><Ionicons name="moon" size={24} color="#FFF" /></View>
                    <View style={{flex: 1, marginLeft: 15}}>
                      <Text style={[styles.highlightTitle, {color: '#64748B'}]}>Tiada Rekod Pelawat</Text>
                      <Text style={[styles.highlightDesc, {color: '#94A3B8'}]}>Tiada tiket disahkan dalam tempoh ini.</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/admindashboard')}><Ionicons name="grid-outline" size={24} color="#90A4AE" /><Text style={styles.tabText}>Utama</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/ticketmanage')}><Ionicons name="ticket-outline" size={24} color="#90A4AE" /><Text style={styles.tabText}>Tiket</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/usermanage')}><Ionicons name="people-outline" size={24} color="#90A4AE" /><Text style={styles.tabText}>Pengguna</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}><Ionicons name="stats-chart" size={24} color="#0077B6" /><Text style={[styles.tabText, styles.tabTextActive]}>Kewangan</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/adminnotification')}><Ionicons name="notifications-outline" size={24} color="#90A4AE" /><Text style={styles.tabText}>Notifikasi</Text></TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/adminsystem')}><Ionicons name="settings-outline" size={24} color="#90A4AE" /><Text style={styles.tabText}>Sistem</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  dropdownMenu: { position: 'absolute', top: 125, left: 20, width: 200, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  dropdownItemActive: { backgroundColor: '#F0F9FF' },
  dropdownItemText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  dropdownItemTextActive: { color: '#0077B6', fontWeight: 'bold' },

  globalToolsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 10, marginBottom: 20, justifyContent: 'space-between' },
  dateDropdownTrigger: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 15, elevation: 2 },
  dateDropdownText: { fontSize: 14, fontWeight: '700', color: '#03045E' },
  exportBtn: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, elevation: 2 },
  exportBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 13 },

  kpiContainer: { marginBottom: 10 },
  kpiMainCard: { backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 24, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  kpiIconBox: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  kpiLabel: { fontSize: 11, color: '#94A3B8', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  kpiValueMain: { fontSize: 32, fontWeight: '900', color: '#03045E' },
  kpiSubRow: { flexDirection: 'row', gap: 12 },
  kpiSubCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, elevation: 3 },
  kpiValueSub: { fontSize: 24, fontWeight: '800', color: '#00B4D8' },

  tabSwitcherContainer: { paddingHorizontal: 20, marginBottom: 20, gap: 10 },
  modernTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  modernTabActive: { backgroundColor: '#0077B6', borderColor: '#0077B6' },
  modernTabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  modernTabTextActive: { color: '#FFFFFF' },

  chartArea: { paddingBottom: 20 },
  premiumChartCard: { backgroundColor: '#FFFFFF', padding: 22, borderRadius: 28, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, marginBottom: 25, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  chartTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginLeft: 8 },
  emptyChartText: { textAlign: 'center', color: '#94A3B8', marginVertical: 40, fontStyle: 'italic' },
  sectionSubTitle: { fontSize: 16, fontWeight: '800', color: '#03045E', marginBottom: 15, marginTop: 5 },
  chartDesc: { fontSize: 12, color: '#94A3B8', marginTop: 4, marginLeft: 8 },

  leaderboardCard: { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 10, elevation: 2 },
  rankBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  rankText: { fontWeight: '900', color: '#64748B', fontSize: 14 },
  parkNameRank: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  parkSubRank: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  rankValue: { fontSize: 18, fontWeight: '900', color: '#0077B6' },
  rankLabel: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' },

  revenueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  revenueSmallCard: { width: '48%', backgroundColor: '#FFF', padding: 15, borderRadius: 18, elevation: 2 },
  revCardPark: { fontSize: 12, color: '#64748B', fontWeight: 'bold' },
  revCardVal: { fontSize: 16, fontWeight: '900', color: '#10B981', marginTop: 5 },
  revProgressBar: { height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, marginTop: 10 },
  revProgressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 2 },

  totalLossBox: { marginTop: 15, padding: 15, backgroundColor: '#FEF2F2', borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  totalLossText: { fontWeight: 'bold', color: '#991B1B', fontSize: 13 },
  totalLossVal: { fontWeight: '900', color: '#B91C1C', fontSize: 20 },

  detailList: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  detailParkName: { fontSize: 14, color: '#1E293B', fontWeight: '500' },
  detailValHighlight: { fontSize: 14, color: '#0077B6', fontWeight: 'bold' },

  pieContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  legendContainer: { marginLeft: 25 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  legendColor: { width: 12, height: 12, borderRadius: 4, marginRight: 10 },
  legendText: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  legendSubText: { fontSize: 11, color: '#64748B' },
  subFilterRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 15, padding: 5, marginBottom: 15 },
  subFilterBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  subFilterBtnActive: { backgroundColor: '#FFF', elevation: 2 },
  subFilterText: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8' },
  subFilterTextActive: { color: '#0077B6' },
  premiumParkCard: { backgroundColor: '#FFF', padding: 18, borderRadius: 24, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  premiumParkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  premiumParkTitle: { fontSize: 16, fontWeight: '900', color: '#03045E' },
  premiumPaxBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  premiumPaxText: { color: '#0369A1', fontSize: 12, fontWeight: '900' },
  visitorCatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vCatBox: { width: '48%', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 14 },
  vCatLabel: { fontSize: 11, color: '#94A3B8', fontWeight: 'bold' },
  vCatValue: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginTop: 2 },

  seasonToggleRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginTop: 15, marginBottom: 15 },
  seasonToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  seasonToggleBtnActive: { backgroundColor: '#FFFFFF', elevation: 2 },
  seasonToggleText: { fontSize: 12, fontWeight: 'bold', color: '#64748B' },
  seasonToggleTextActive: { color: '#0077B6' },
  
  timeNavBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 5, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  timeNavBtn: { padding: 8, backgroundColor: '#FFF', borderRadius: 8, elevation: 1 },
  timeNavLabel: { fontSize: 14, fontWeight: '800', color: '#03045E' },

  heatmapContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  heatBlockHari: { width: '13%', aspectRatio: 1, margin: '0.6%', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  heatBlockBulan: { width: '23%', aspectRatio: 1, margin: '1%', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  heatBlockTahun: { width: '31%', aspectRatio: 1, margin: '1%', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  heatLabel: { fontSize: 12, fontWeight: 'bold' },
  heatValue: { fontSize: 10, marginTop: 2, fontWeight: '900' },
  heatValueZero: { fontSize: 10, marginTop: 2, fontWeight: 'bold', color: 'transparent' }, // 0人时占位隐藏

  highlightBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', padding: 20, borderRadius: 24, marginTop: 15, borderWidth: 1, borderColor: '#FDE68A' },
  highlightIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  highlightTitle: { fontSize: 16, fontWeight: '900', color: '#B45309' },
  highlightDesc: { fontSize: 12, color: '#92400E', marginTop: 2, lineHeight: 18 },

  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingBottom: 20, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 15 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, color: '#90A4AE', marginTop: 6, fontWeight: '500', textAlign: 'center' },
  tabTextActive: { color: '#0077B6', fontWeight: 'bold' }
});
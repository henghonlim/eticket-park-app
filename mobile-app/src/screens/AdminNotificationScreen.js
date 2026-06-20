import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, ActivityIndicator, Modal, TouchableWithoutFeedback, Alert, Image, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; 
import { collection, getDocs, doc, getDoc, query, where, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebaseConfig';
import MaintenanceOverlay from '../components/MaintenanceOverlay';
import AdminClosureTab from '../components/AdminClosureTab';
import AdminHeader from '../components/AdminHeader';

export default function AdminNotificationScreen() {
  const [activeTab, setActiveTab] = useState('weather'); 

  const [parks, setParks] = useState([]);
  const [selectedPark, setSelectedPark] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [dailyForecast, setDailyForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [forecastTab, setForecastTab] = useState('hourly');
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
  const [isAnnounceModalVisible, setIsAnnounceModalVisible] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');

  const getWeatherInfo = (code, isDay = 1) => {
    if (code === 0) return { title: 'Cerah', icon: isDay ? 'weather-sunny' : 'weather-night', color: '#F59E0B', badWeather: false };
    if (code >= 1 && code <= 3) return { title: 'Berawan Separa', icon: isDay ? 'weather-partly-cloudy' : 'weather-night-partly-cloudy', color: '#60A5FA', badWeather: false };
    if (code >= 4 && code <= 49) return { title: 'Kabus', icon: 'weather-fog', color: '#CBD5E1', badWeather: false };
    if (code >= 50 && code <= 62) return { title: 'Hujan Ringan', icon: 'weather-partly-rainy', color: '#38BDF8', alertBg: '#F0F9FF', alertBorder: '#BAE6FD', alertText: '#0284C7', badWeather: true };
    if (code >= 63 && code <= 64) return { title: 'Hujan Sederhana', icon: 'weather-rainy', color: '#3B82F6', alertBg: '#EFF6FF', alertBorder: '#BFDBFE', alertText: '#1D4ED8', badWeather: true };
    if (code >= 65 && code <= 84) return { title: 'Hujan Lebat', icon: 'weather-pouring', color: '#2563EB', alertBg: '#DBEAFE', alertBorder: '#93C5FD', alertText: '#1E40AF', badWeather: true };
    if (code >= 85 && code <= 99) return { title: 'Ribut Petir', icon: 'weather-lightning-rainy', color: '#4C1D95', alertBg: '#F3E8FF', alertBorder: '#D8B4FE', alertText: '#6B21A8', badWeather: true };
    return { title: 'Tidak Diketahui', icon: 'weather-cloudy-alert', color: '#64748B', badWeather: false };
  };

  useEffect(() => {
    const fetchParks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "parks"));
        const parkList = querySnapshot.docs.map(doc => ({
          id: doc.id, ...doc.data()
        })).filter(park => park.location);

        setParks(parkList);
        if (parkList.length > 0) handleSelectPark(parkList[0]);
        else setLoading(false);
      } catch (error) { setLoading(false); }
    };
    fetchParks();
  }, []);

  const fetchWeather = async (lat, lon) => {
    setFetchingWeather(true);
    setErrorMsg(null);
    try {
      const safeLat = parseFloat(lat);
      const safeLon = parseFloat(lon);
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${safeLat}&longitude=${safeLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,is_day,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSingapore`
      );
      if (!response.ok) throw new Error(`Server Error: ${response.status}`);
      const data = await response.json();
      setWeatherData(data.current);

      const currentHourStr = data.current.time.slice(0, 13); 
      const currentIndex = data.hourly.time.findIndex(t => t.startsWith(currentHourStr));
      const startIndex = currentIndex !== -1 ? currentIndex : 0;
      
      const hourly = [];
      for (let i = startIndex; i < startIndex + 24; i++) {
        if(data.hourly.time[i]){
          const timeObj = new Date(data.hourly.time[i]);
          hourly.push({
            time: `${timeObj.getHours().toString().padStart(2, '0')}:00`, 
            temp: Math.round(data.hourly.temperature_2m[i]),
            code: data.hourly.weather_code[i],
            isDay: data.hourly.is_day[i],
            wind: data.hourly.wind_speed_10m[i]
          });
        }
      }
      setHourlyForecast(hourly);

      const daysName = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
      const daily = [];
      for (let i = 0; i < 7; i++) {
        const dateObj = new Date(data.daily.time[i]);
        daily.push({
          day: i === 0 ? 'Hari Ini' : daysName[dateObj.getDay()],
          max: Math.round(data.daily.temperature_2m_max[i]),
          min: Math.round(data.daily.temperature_2m_min[i]),
          code: data.daily.weather_code[i]
        });
      }
      setDailyForecast(daily);
    } catch (error) {
      setErrorMsg("Gagal memuatkan data cuaca. Sila semak sambungan internet.");
    } finally {
      setFetchingWeather(false); setLoading(false);
    }
  };

  const handleSelectPark = (park) => {
    setSelectedPark(park); setShowPicker(false);
    fetchWeather(park.location.latitude, park.location.longitude);
  };

  const handleOpenAnnouncementEditor = async () => {
    if (!selectedPark) return;
    setLoading(true);

    try {
      const docRef = doc(db, "system", "settings");
      const settingsSnap = await getDoc(docRef);
      
      let defaultTitle = "Amaran Cuaca di [Taman]";
      let defaultBody = "Hai [Nama], amaran cuaca tidak menentu telah dikeluarkan di sekitar [Taman]...";

      if (settingsSnap.exists()) {
        const resData = settingsSnap.data();
        
        if (resData.templates && resData.templates.weather) {
          const template = resData.templates.weather;
          if (template.title) defaultTitle = template.title;
          if (template.body) defaultBody = template.body;
        }
      }

      defaultTitle = defaultTitle.replace(/\[Taman\]/g, selectedPark.name);
      defaultBody = defaultBody.replace(/\[Taman\]/g, selectedPark.name);

      setAnnounceTitle(defaultTitle);
      setAnnounceBody(defaultBody);
      setIsAnnounceModalVisible(true);

    } catch (err) {
      Alert.alert("Ralat", "Gagal memuatkan templat: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFinalAnnouncement = async () => {
    if (!announceTitle.trim() || !announceBody.trim()) {
      Alert.alert("Perhatian", "Tajuk dan kandungan mesej tidak boleh dibiarkan kosong.");
      return;
    }

    try {
      setIsSendingAnnouncement(true);

      const ticketsQuery = query(
        collection(db, "tickets"),
        where("parkId", "==", selectedPark.id),
        where("status", "==", "Sah")
      );
      const ticketsSnap = await getDocs(ticketsQuery);
      
      if (ticketsSnap.empty) {
        Alert.alert("Info", "Tiada pelawat aktif (status Sah) dikesan untuk taman laut ini.");
        setIsAnnounceModalVisible(false);
        setIsSendingAnnouncement(false);
        return;
      }

      const userIds = [...new Set(ticketsSnap.docs.map(doc => doc.data().userId))].filter(Boolean);

      const userDetails = await Promise.all(
        userIds.map(async (uid) => {
          try {
            const userSnap = await getDoc(doc(db, "users", uid));
            const fullName = userSnap.exists() ? (userSnap.data().fullName || "Pelawat") : "Pelawat";
            return { uid, fullName };
          } catch (e) {
            return { uid, fullName: "Pelawat" };
          }
        })
      );

      const batch = writeBatch(db);
      userDetails.forEach(({ uid, fullName }) => {
        let finalizedTitle = announceTitle.replace(/\[Nama\]/g, fullName);
        let finalizedBody = announceBody.replace(/\[Nama\]/g, fullName);

        const newNotifRef = doc(collection(db, "notifications"));
        batch.set(newNotifRef, {
          userId: uid,
          title: finalizedTitle,
          body: finalizedBody,
          type: 'weather', 
          isRead: false,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
      try {
        const auth = getAuth();
        const adminEmail = auth.currentUser?.email || 'Admin';
        await addDoc(collection(db, "auditLogs"), {
          action: "Siaran Pengumuman Cuaca",
          details: `Admin (${adminEmail}) telah menghantar amaran cuaca buruk kepada ${userIds.length} pelawat di ${selectedPark.name}.`,
          timestamp: serverTimestamp()
        });
      } catch (logError) {
        console.log("Gagal log pengumuman cuaca:", logError);
      }
      setIsAnnounceModalVisible(false);
      Alert.alert("Berjaya! ✅", `Pengumuman kecemasan telah dihantar secara peribadi kepada ${userIds.length} pelawat terkesan.`);
    } catch (err) {
      Alert.alert("Ralat", "Gagal menyebarkan pengumuman: " + err.message);
    } finally {
      setIsSendingAnnouncement(false);
    }
  };

  const handleDummyPress = (featureName) => {
    Alert.alert("Akan Datang", `Modul ${featureName} sedang dalam pembinaan.`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#03045E" />
        <Text style={{ marginTop: 15, color: '#03045E', fontWeight: 'bold' }}>Menyemak status cuaca...</Text>
      </SafeAreaView>
    );
  }

  const currentWeatherState = weatherData ? getWeatherInfo(weatherData.weather_code, weatherData.is_day) : null;
  const currentWindSpeed = weatherData ? weatherData.wind_speed_10m : 0;
  const badWeatherHours = hourlyForecast.slice(0, 24).filter(item => item.code >= 50);
  
  let upcomingBadRainInfo = null;
  if (badWeatherHours.length > 0) {
    const worstHour = badWeatherHours.reduce((prev, current) => (prev.code > current.code) ? prev : current);
    upcomingBadRainInfo = getWeatherInfo(worstHour.code, worstHour.isDay);
  }
  
  const hasStrongWindUpcoming = hourlyForecast.slice(0, 24).some(item => item.wind >= 30);

  return (
    <SafeAreaView style={styles.container}>
      <MaintenanceOverlay />
      
      <AdminHeader title="Modul Amaran" subtitle="Penyebaran Notifikasi & Cuaca" />

      <View style={styles.topTabContainer}>
        <TouchableOpacity style={[styles.topTabBtn, activeTab === 'weather' && styles.topTabBtnActive]} onPress={() => setActiveTab('weather')}>
          <MaterialCommunityIcons name="weather-partly-lightning" size={18} color={activeTab === 'weather' ? "#FFF" : "#64748B"} />
          <Text style={[styles.topTabBtnText, activeTab === 'weather' && styles.topTabBtnTextActive]}> Ramalan Cuaca</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.topTabBtn, activeTab === 'closure' && styles.topTabBtnActive]} onPress={() => setActiveTab('closure')}>
          <MaterialCommunityIcons name="store-off-outline" size={18} color={activeTab === 'closure' ? "#FFF" : "#64748B"} />
          <Text style={[styles.topTabBtnText, activeTab === 'closure' && styles.topTabBtnTextActive]}> Penutupan Taman Laut</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'weather' ? (
        <View style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={styles.sectionLabel}>Semak Lokasi Taman Laut</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowPicker(true)}>
              <Ionicons name="location" size={20} color="#0077B6" />
              <Text style={styles.pickerText}>{selectedPark ? selectedPark.name : 'Tiada lokasi tersedia'}</Text>
              <Ionicons name="chevron-down" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {fetchingWeather ? (
              <View style={styles.weatherMainCard}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : weatherData && currentWeatherState ? (
              <>
                <View style={[styles.weatherMainCard, { backgroundColor: currentWeatherState?.color || '#0077B6' }]}>
              <MaterialCommunityIcons name={currentWeatherState?.icon || 'weather-cloudy'} size={90} color="#FFFFFF" />
              <Text style={styles.tempText}>{Math.round(weatherData.temperature_2m)}°C</Text>
              <Text style={styles.conditionText}>{currentWeatherState?.title}</Text>
              <Text style={styles.feelsLikeText}>Terasa seperti {Math.round(weatherData.apparent_temperature)}°C</Text>
            </View>

            {currentWeatherState?.badWeather ? (
              <View style={[styles.alertBox, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}>
                <MaterialCommunityIcons name={currentWeatherState.icon} size={24} color={currentWeatherState.color} style={{ marginRight: 15 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#334155' }}>[MONITOR] Auto-Alert Terpapar pada User</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>API mencatat status '{currentWeatherState.title}'. Aplikasi user sedang memaparkan amaran cuaca buruk secara automatik.</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.alertBox, { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }]}>
                <MaterialCommunityIcons name="cloud-check" size={24} color="#10B981" style={{ marginRight: 15 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#334155' }}>[MONITOR] Status Sistem Kosong (Cerah)</Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Aplikasi user memaparkan cuaca aman. Jika keadaan di lokasi didapati hujan/ribut, sila klik butang di bawah untuk melakukan pengumuman manual.</Text>
                </View>
              </View>
            )}

                <Text style={styles.sectionLabel}>Butiran Cuaca API</Text>
                <View style={styles.gridContainer}>
                  <View style={styles.gridItem}><Ionicons name="water-outline" size={24} color="#0077B6" /><Text style={styles.gridValue}>{weatherData.relative_humidity_2m}%</Text><Text style={styles.gridLabel}>Kelembapan</Text></View>
                  <View style={styles.gridItem}><Ionicons name="leaf-outline" size={24} color="#10B981" /><Text style={styles.gridValue}>{weatherData.wind_speed_10m} km/h</Text><Text style={styles.gridLabel}>Kelajuan Angin</Text></View>
                  <View style={styles.gridItem}><MaterialCommunityIcons name="weather-rainy" size={24} color="#3B82F6" /><Text style={styles.gridValue}>{weatherData.precipitation} mm</Text><Text style={styles.gridLabel}>Kerpasan Hujan</Text></View>
                </View>

                <View style={styles.forecastContainer}>
                  <View style={styles.forecastTabs}>
                    <TouchableOpacity style={[styles.forecastTab, forecastTab === 'hourly' && styles.forecastTabActive]} onPress={() => setForecastTab('hourly')}>
                      <Text style={[styles.forecastTabText, forecastTab === 'hourly' && styles.forecastTabTextActive]}>24 Jam</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.forecastTab, forecastTab === 'daily' && styles.forecastTabActive]} onPress={() => setForecastTab('daily')}>
                      <Text style={[styles.forecastTabText, forecastTab === 'daily' && styles.forecastTabTextActive]}>7 Hari</Text>
                    </TouchableOpacity>
                  </View>
                  {forecastTab === 'hourly' ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyScroll}>
                      {hourlyForecast.map((item, index) => {
                        const info = getWeatherInfo(item.code, item.isDay);
                        return (
                          <View key={index} style={styles.hourlyItem}>
                            <Text style={styles.hourlyTime}>{index === 0 ? 'Sekarang' : item.time}</Text>
                            <MaterialCommunityIcons name={info.icon} size={28} color={info.color} style={{ marginVertical: 8 }} />
                            <Text style={styles.hourlyTemp}>{item.temp}°</Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <View style={styles.dailyContainer}>
                      {dailyForecast.map((item, index) => {
                        const info = getWeatherInfo(item.code);
                        return (
                          <View key={index} style={styles.dailyItem}>
                            <Text style={styles.dailyDay}>{item.day}</Text>
                            <View style={styles.dailyIconBox}><MaterialCommunityIcons name={info.icon} size={26} color={info.color} /><Text style={styles.dropdownItemText}>{info.title}</Text></View>
                            <View style={styles.dailyTempBox}><Text style={styles.dailyTempMin}>{item.min}°</Text><View style={styles.tempBar} /><Text style={styles.dailyTempMax}>{item.max}°</Text></View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </>
            ) : null}
          </ScrollView>

          <TouchableOpacity 
            style={styles.fabAnnouncementButton} 
            onPress={handleOpenAnnouncementEditor}
          >
            <Ionicons name="flash" size={20} color="#FFFFFF" />
            <Text style={styles.fabButtonText}>Cipta Pengumuman</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <AdminClosureTab parks={parks} />
      )}

      <Modal visible={showPicker} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownBox}>
                <Text style={styles.modalTitle}>Pilih Lokasi Kawalan</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {parks.map((park) => (
                    <TouchableOpacity key={park.id} style={styles.dropdownItem} onPress={() => handleSelectPark(park)}>
                      <Text style={{ fontSize: 16, color: '#334155' }}>{park.name}</Text>
                      {selectedPark?.id === park.id && <Ionicons name="checkmark" size={20} color="#0077B6" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/admindashboard')}>
          <Ionicons name="grid-outline" size={24} color="#90A4AE" /><Text style={styles.tabText}>Utama</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/ticketmanage')}>
          <Ionicons name="ticket-outline" size={24} color="#90A4AE" /><Text style={styles.tabText}>Tiket</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/usermanage')}>
          <Ionicons name="people-outline" size={24} color="#90A4AE" /><Text style={styles.tabText}>Pengguna</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/adminfinance')}>
          <Ionicons name="stats-chart-outline" size={24} color="#90A4AE" /><Text style={styles.tabText}>Kewangan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="notifications" size={24} color="#0077B6" /><Text style={[styles.tabText, styles.tabTextActive]}>Notifikasi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/adminsystem')}>
          <Ionicons name="settings-outline" size={24} color="#90A4AE" /><Text style={styles.tabText}>Sistem</Text>
        </TouchableOpacity>
      </View>
      
      <Modal visible={isAnnounceModalVisible} transparent={true} animationType="slide">
        <TouchableWithoutFeedback onPress={() => { if(!isSendingAnnouncement) setIsAnnounceModalVisible(false); }}>
          <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
            <TouchableWithoutFeedback>
              <View style={{ width: '100%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' }}>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#03045E' }}>Semakan Kandungan Pengumuman</Text>
                  <TouchableOpacity onPress={() => setIsAnnounceModalVisible(false)} disabled={isSendingAnnouncement}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#64748B', marginBottom: 6 }}>TAJUK NOTIFIKASI</Text>
                  <TextInput 
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 15, fontSize: 14, color: '#334155', fontWeight: 'bold', marginBottom: 15 }}
                    value={announceTitle}
                    onChangeText={setAnnounceTitle}
                    placeholder="Masukkan tajuk pengumuman..."
                    editable={!isSendingAnnouncement}
                  />

                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#64748B', marginBottom: 6 }}>KANDUNGAN MESEJ (BOLEH DIEDIT)</Text>
                  <TextInput 
                    style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 15, fontSize: 14, color: '#334155', height: 120, textAlignVertical: 'top', lineHeight: 22, marginBottom: 5 }}
                    value={announceBody}
                    onChangeText={setAnnounceBody}
                    placeholder="Tulis kandungan pengumuman di sini..."
                    multiline={true}
                    numberOfLines={5}
                    editable={!isSendingAnnouncement}
                  />
                  <Text style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginBottom: 25, paddingHorizontal: 4 }}>
                    * Nota: Kekalkan kod <Text style={{fontWeight:'bold', color:'#0077B6'}}>[Nama]</Text> jika anda mahu sistem menukar nama pelanggan secara dinamik semasa menghantar.
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    <TouchableOpacity 
                      style={{ flex: 1, backgroundColor: '#E2E8F0', paddingVertical: 15, borderRadius: 12, alignItems: 'center' }} 
                      onPress={() => setIsAnnounceModalVisible(false)}
                      disabled={isSendingAnnouncement}
                    >
                      <Text style={{ color: '#475569', fontWeight: 'bold' }}>Batal</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={{ flex: 2, backgroundColor: '#D62828', paddingVertical: 15, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }} 
                      onPress={handleSendFinalAnnouncement}
                      disabled={isSendingAnnouncement}
                    >
                      {isSendingAnnouncement ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="send" size={16} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Sahkan & Hantar Kilat</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 15, paddingBottom: 15, backgroundColor: '#FFFFFF' },
  headerTitleMain: { fontSize: 26, fontWeight: 'bold', color: '#03045E' },
  headerSubtitle: { fontSize: 14, color: '#0077B6', fontWeight: '600', marginTop: 1 },
  profileImage: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: '#03045E' },
  
  topTabContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', marginHorizontal: 25, borderRadius: 12, padding: 4, marginBottom: 15 },
  topTabBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  topTabBtnActive: { backgroundColor: '#03045E' },
  topTabBtnText: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },
  topTabBtnTextActive: { color: '#FFFFFF' },

  content: { paddingHorizontal: 25, paddingBottom: 180 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  pickerText: { flex: 1, marginLeft: 10, fontSize: 16, color: '#334155', fontWeight: '500' },

  weatherMainCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 35, borderRadius: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 5, minHeight: 220 },
  tempText: { fontSize: 55, fontWeight: '900', color: '#FFFFFF', marginTop: 5 },
  conditionText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: -2 },
  feelsLikeText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },

  alertBox: { flexDirection: 'row', borderWidth: 1, padding: 15, borderRadius: 16, marginBottom: 20, alignItems: 'center' },
  alertTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  alertMessage: { fontSize: 12, lineHeight: 18 },

  gridContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  gridItem: { flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 15, alignItems: 'center', borderRadius: 20, marginHorizontal: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
  gridValue: { fontSize: 15, fontWeight: 'bold', color: '#03045E', marginTop: 8 },
  gridLabel: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },

  forecastContainer: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, marginTop: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
  forecastTabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 15 },
  forecastTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  forecastTabActive: { backgroundColor: '#FFFFFF', elevation: 1 },
  forecastTabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  forecastTabTextActive: { color: '#0077B6' },
  hourlyScroll: { paddingBottom: 5 },
  hourlyItem: { alignItems: 'center', marginRight: 22 },
  hourlyTime: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  hourlyTemp: { fontSize: 15, color: '#03045E', fontWeight: 'bold' },
  
  dailyContainer: { marginTop: 2 },
  dailyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dailyDay: { flex: 1, fontSize: 14, color: '#03045E', fontWeight: '700' },
  dailyIconBox: { flex: 1.5, flexDirection: 'row', alignItems: 'center' },
  dailyTempBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  dailyTempMin: { fontSize: 13, color: '#64748B', width: 25, textAlign: 'right' },
  tempBar: { width: 25, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginHorizontal: 6 },
  dailyTempMax: { fontSize: 14, color: '#1E293B', fontWeight: 'bold', width: 25 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 10, elevation: 10 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#03045E', padding: 15, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },

  fabAnnouncementButton: { 
    position: 'absolute', 
    bottom: 115, 
    left: 25, 
    backgroundColor: '#D62828',
    flexDirection: 'row', 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    borderRadius: 16, 
    alignItems: 'center', 
    elevation: 6,
    shadowColor: '#D62828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  fabButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  dummyExpandBtn: { backgroundColor: '#03045E', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12, marginTop: 25 },

  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingBottom: 20, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, color: '#90A4AE', marginTop: 6, fontWeight: '500', textAlign: 'center' },
  tabTextActive: { color: '#0077B6', fontWeight: 'bold' },
  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  adminDropdownMenu: { position: 'absolute', top: 75, right: 25, width: 140, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 8 },
  adminMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18 },
  adminMenuText: { fontSize: 15, color: '#ef4444', marginLeft: 10, fontWeight: 'bold' },
});
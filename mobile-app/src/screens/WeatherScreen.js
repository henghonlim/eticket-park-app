import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, ActivityIndicator, Modal, TouchableWithoutFeedback, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; 
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { logoutUser } from '../services/AuthService';
import NotificationBell from '../components/NotificationBell';
import MaintenanceOverlay from '../components/MaintenanceOverlay';

export default function WeatherScreen() {
  const router = useRouter();

  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  
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

  const getWeatherInfo = (code, isDay = 1) => {
    if (code === 0) return { title: 'Cerah', icon: isDay ? 'weather-sunny' : 'weather-night', color: '#F59E0B', badWeather: false };
    
    if (code >= 1 && code <= 3) return { title: 'Berawan Separa', icon: isDay ? 'weather-partly-cloudy' : 'weather-night-partly-cloudy', color: '#60A5FA', badWeather: false };
    if (code >= 4 && code <= 49) return { title: 'Kabus', icon: 'weather-fog', color: '#CBD5E1', badWeather: false };

    if (code >= 50 && code <= 62)
      return { title: 'Hujan Ringan', icon: 'weather-partly-rainy', color: '#38BDF8', alertBg: '#F0F9FF', alertBorder: '#BAE6FD', alertText: '#0284C7', badWeather: true };

    if (code >= 63 && code <= 64)
      return { title: 'Hujan Sederhana', icon: 'weather-rainy', color: '#3B82F6', alertBg: '#EFF6FF', alertBorder: '#BFDBFE', alertText: '#1D4ED8', badWeather: true };

    if (code >= 65 && code <= 84)
      return { title: 'Hujan Lebat', icon: 'weather-pouring', color: '#2563EB', alertBg: '#DBEAFE', alertBorder: '#93C5FD', alertText: '#1E40AF', badWeather: true };

    if (code >= 85 && code <= 99)
      return { title: 'Ribut Petir', icon: 'weather-lightning-rainy', color: '#4C1D95', alertBg: '#F3E8FF', alertBorder: '#D8B4FE', alertText: '#6B21A8', badWeather: true };

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const safeLat = parseFloat(lat);
      const safeLon = parseFloat(lon);

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${safeLat}&longitude=${safeLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,is_day,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSingapore`,
        { headers: { 'User-Agent': 'SistemTiketTamanLaut_FYP/1.0', 'Accept': 'application/json' },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

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
      if (error.name === 'AbortError') {
        setErrorMsg("Sistem cuaca lambat bertindak balas (Timeout). Sila cuba lagi.");
      } else {
        setErrorMsg("Gagal memuatkan data cuaca. Sila semak internet anda.");
      }
      console.log("Weather Fetching Error:", error.message);
    } finally {
      setFetchingWeather(false); setLoading(false);
    }
  };

  const handleSelectPark = (park) => {
    setSelectedPark(park); setShowPicker(false);
    fetchWeather(park.location.latitude, park.location.longitude);
  };

  const handleLogout = async () => {
    try {
      setIsProfileMenuVisible(false);
      await logoutUser();
      Alert.alert("Berjaya", "Anda telah log keluar.");
      router.replace('/login');
    } catch (error) { Alert.alert("Ralat", error.message); }
  };
  
  const handleDummyPress = (featureName) => {
    Alert.alert("Akan Datang", `Fungsi ${featureName} akan datang! (Menunggu tetapan Admin)`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#03045E" />
        <Text style={{ marginTop: 15, color: '#03045E', fontWeight: 'bold' }}>Menyemak cuaca...</Text>
      </SafeAreaView>
    );
  }

  if (errorMsg) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="cloud-offline" size={70} color="#94A3B8" />
        <Text style={{ marginTop: 20, color: '#64748B', fontSize: 16, textAlign: 'center', paddingHorizontal: 40 }}>
          {errorMsg}
        </Text>
        <TouchableOpacity 
          style={{ marginTop: 25, backgroundColor: '#0077B6', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 15 }}
          onPress={() => {
            setLoading(true);
            setErrorMsg(null);
            getDocs(collection(db, "parks")).then(snapshot => {
              const parkList = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})).filter(p => p.location);
              if (parkList.length > 0) handleSelectPark(parkList[0]);
              else { setLoading(false); setErrorMsg("Tiada lokasi taman laut dijumpai."); }
            }).catch(() => { setLoading(false); setErrorMsg("Gagal menyambung ke pangkalan data."); });
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>Cuba Lagi</Text>
        </TouchableOpacity>
        
        <View style={styles.bottomTabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/usermainpage')}>
            <Ionicons name="compass-outline" size={32} color="#90A4AE" />
            <Text style={styles.tabText}>Laman Utama</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/mytickets')}>
            <Ionicons name="ticket-outline" size={32} color="#90A4AE" />
            <Text style={styles.tabText}>Tiket Saya</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="partly-sunny" size={32} color="#0077B6" />
            <Text style={[styles.tabText, styles.tabTextActive]}>Cuaca</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/usermap')}>
            <Ionicons name="map-outline" size={32} color="#90A4AE" />
            <Text style={styles.tabText}>Peta</Text>
          </TouchableOpacity>
        </View>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ramalan Cuaca</Text>
        <View style={styles.headerIcons}>
          <NotificationBell />
        
          <TouchableOpacity onPress={() => setIsProfileMenuVisible(true)}>
            <Image source={{ uri: 'https://ui-avatars.com/api/?name=User&background=0077B6&color=fff&size=128' }} style={styles.profileImage} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionLabel}>Pilih Lokasi Taman Laut</Text>
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
            <View style={[styles.weatherMainCard, { backgroundColor: currentWeatherState.color }]}>
              <MaterialCommunityIcons name={currentWeatherState.icon} size={90} color="#FFFFFF" />
              <Text style={styles.tempText}>{Math.round(weatherData.temperature_2m)}°C</Text>
              <Text style={styles.conditionText}>{currentWeatherState.title}</Text>
              <Text style={styles.feelsLikeText}>Terasa seperti {Math.round(weatherData.apparent_temperature)}°C</Text>
            </View>

            {currentWeatherState.badWeather ? (
              <View style={[styles.alertBox, { backgroundColor: currentWeatherState.alertBg, borderColor: currentWeatherState.alertBorder }]}>
                <View style={[styles.alertIconBox, { backgroundColor: currentWeatherState.alertBg }]}>
                  <MaterialCommunityIcons name={currentWeatherState.icon} size={26} color={currentWeatherState.alertText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: currentWeatherState.alertText }]}>Amaran: Sedang {currentWeatherState.title}</Text>
                  <Text style={[styles.alertMessage, { color: currentWeatherState.alertText }]}>
                    Kawasan ini sedang mengalami {currentWeatherState.title.toLowerCase()}. Sila berhati-hati dan tangguhkan aktiviti air.
                  </Text>
                </View>
              </View>

            ) : upcomingBadRainInfo ? (
              <View style={[styles.alertBox, { backgroundColor: upcomingBadRainInfo.alertBg, borderColor: upcomingBadRainInfo.alertBorder }]}>
                <View style={[styles.alertIconBox, { backgroundColor: upcomingBadRainInfo.alertBg }]}>
                  <MaterialCommunityIcons name={upcomingBadRainInfo.icon} size={26} color={upcomingBadRainInfo.alertText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: upcomingBadRainInfo.alertText }]}>Ramalan 24 Jam: {upcomingBadRainInfo.title}</Text>
                  <Text style={[styles.alertMessage, { color: upcomingBadRainInfo.alertText }]}>
                    Berdasarkan ramalan terkini, {upcomingBadRainInfo.title.toLowerCase()} dijangka berlaku dalam tempoh 24 jam. Sila buat persiapan.
                  </Text>
                </View>
              </View>

            ) : currentWindSpeed >= 30 ? (
              <View style={[styles.alertBox, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                <View style={[styles.alertIconBox, { backgroundColor: '#FEF2F2' }]}>
                  <MaterialCommunityIcons name="weather-windy" size={26} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: '#991B1B' }]}>Amaran: Angin Kencang</Text>
                  <Text style={[styles.alertMessage, { color: '#7F1D1D' }]}>
                    Kelajuan angin kini mencapai {currentWindSpeed} km/h. Keadaan laut mungkin bergelora.
                  </Text>
                </View>
              </View>

            ) : hasStrongWindUpcoming ? (
              <View style={[styles.alertBox, { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }]}>
                <View style={[styles.alertIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialCommunityIcons name="weather-windy" size={26} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: '#B45309' }]}>Ramalan 24 Jam: Angin Kuat</Text>
                  <Text style={[styles.alertMessage, { color: '#92400E' }]}>
                    Kelajuan angin dijangka melebihi 30 km/h dalam tempoh 24 jam akan datang. Harap maklum.
                  </Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>Butiran Cuaca</Text>
            <View style={styles.gridContainer}>
              <View style={styles.gridItem}>
                <Ionicons name="water-outline" size={24} color="#0077B6" />
                <Text style={styles.gridValue}>{weatherData.relative_humidity_2m}%</Text>
                <Text style={styles.gridLabel}>Kelembapan</Text>
              </View>
              <View style={styles.gridItem}>
                <Ionicons name="leaf-outline" size={24} color="#10B981" />
                <Text style={styles.gridValue}>{weatherData.wind_speed_10m} km/h</Text>
                <Text style={styles.gridLabel}>Kelajuan Angin</Text>
              </View>
              <View style={styles.gridItem}>
                <MaterialCommunityIcons name="weather-rainy" size={24} color="#3B82F6" />
                <Text style={styles.gridValue}>{weatherData.precipitation} mm</Text>
                <Text style={styles.gridLabel}>Kerpasan Hujan</Text>
              </View>
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
                        <View style={styles.dailyIconBox}>
                          <MaterialCommunityIcons name={info.icon} size={26} color={info.color} />
                          <Text style={styles.dailyCondition}>{info.title}</Text>
                        </View>
                        <View style={styles.dailyTempBox}>
                          <Text style={styles.dailyTempMin}>{item.min}°</Text>
                          <View style={styles.tempBar} />
                          <Text style={styles.dailyTempMax}>{item.max}°</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.centerContainer}>
            <Text style={{color: '#94A3B8'}}>Sila pilih lokasi untuk melihat cuaca.</Text>
          </View>
        )}
      </ScrollView>

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
                <TouchableOpacity style={styles.menuItem} onPress={() => { setIsProfileMenuVisible(false); router.push('/favorites'); }}>
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

      <Modal visible={showPicker} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownBox}>
                <Text style={styles.modalTitle}>Pilih Taman Laut</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {parks.map((park) => (
                    <TouchableOpacity key={park.id} style={styles.dropdownItem} onPress={() => handleSelectPark(park)}>
                      <Text style={styles.dropdownItemText}>{park.name}</Text>
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
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/usermainpage')}>
          <Ionicons name="compass-outline" size={32} color="#90A4AE" />
          <Text style={styles.tabText}>Laman Utama</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/mytickets')}>
          <Ionicons name="ticket-outline" size={32} color="#90A4AE" />
          <Text style={styles.tabText}>Tiket Saya</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="partly-sunny" size={32} color="#0077B6" />
          <Text style={[styles.tabText, styles.tabTextActive]}>Cuaca</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.replace('/usermap')}>
          <Ionicons name="map-outline" size={32} color="#90A4AE" />
          <Text style={styles.tabText}>Peta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 10, paddingBottom: 10, backgroundColor: '#FFFFFF' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#03045E', letterSpacing: 0.5 },
  iconButton: { marginRight: 18, position: 'relative' },
  notificationDot: { position: 'absolute', top: -2, right: 0, width: 12, height: 12, backgroundColor: '#ef4444', borderRadius: 6, borderWidth: 2, borderColor: '#F8FAFC' },
  profileImage: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: '#0077B6' },
  dropdownMenu: { position: 'absolute', top: 70, right: 25, width: 180, backgroundColor: '#FFFFFF', borderRadius: 15, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  menuText: { fontSize: 16, color: '#03045E', marginLeft: 15, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }, 
  content: { padding: 25, paddingBottom: 120 },  
  sectionLabel: { fontSize: 24, fontWeight: '800', color: '#03045E', marginBottom: 15, marginTop: 0 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 25 },
  pickerText: { flex: 1, marginLeft: 10, fontSize: 16, color: '#334155', fontWeight: '500' },  

  weatherMainCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, borderRadius: 24, marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 6, minHeight: 250 },
  tempText: { fontSize: 60, fontWeight: '900', color: '#FFFFFF', marginTop: 10 },
  conditionText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginTop: -5 },
  feelsLikeText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 5, fontWeight: '500' },

  alertBox: { flexDirection: 'row', borderWidth: 1, padding: 15, borderRadius: 16, marginBottom: 25, alignItems: 'flex-start' },
  alertIconBox: { width: 35, height: 35, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  alertTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  alertMessage: { fontSize: 13, lineHeight: 20, fontWeight: '500' },
    
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  gridItem: { flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 20, alignItems: 'center', borderRadius: 20, marginHorizontal: 5, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  gridValue: { fontSize: 16, fontWeight: 'bold', color: '#03045E', marginTop: 10 },
  gridLabel: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '600' },

  forecastContainer: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginTop: 25, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  forecastTabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
  forecastTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  forecastTabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  forecastTabText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  forecastTabTextActive: { color: '#0077B6' },
  hourlyScroll: { paddingBottom: 5 },
  hourlyItem: { alignItems: 'center', marginRight: 25 },
  hourlyTime: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  hourlyTemp: { fontSize: 16, color: '#03045E', fontWeight: 'bold' },
  dailyContainer: { marginTop: 5 },
  dailyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dailyDay: { flex: 1, fontSize: 15, color: '#03045E', fontWeight: '700' },
  dailyIconBox: { flex: 1.5, flexDirection: 'row', alignItems: 'center' },
  dailyCondition: { fontSize: 13, color: '#64748B', marginLeft: 8 },
  dailyTempBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  dailyTempMin: { fontSize: 14, color: '#64748B', width: 28, textAlign: 'right' },
  tempBar: { width: 30, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginHorizontal: 8 },
  dailyTempMax: { fontSize: 14, color: '#1E293B', fontWeight: 'bold', width: 28 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 10, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E', padding: 15, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemText: { fontSize: 16, color: '#334155' },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 95, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingBottom: 20, borderTopLeftRadius: 35, borderTopRightRadius: 35, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 15 },
  tabItem: { width: 70, alignItems: 'center', paddingTop: 0 },
  tabText: { fontSize: 11, color: '#94A3B8', marginTop: 6, fontWeight: '600', textAlign: 'center' },
  tabTextActive: { color: '#0077B6', fontWeight: 'bold' },
});
import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  Image, FlatList, ActivityIndicator, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; 
import MaintenanceOverlay from '../components/MaintenanceOverlay';

export default function FavoriteScreen() {
  const router = useRouter();
  const auth = getAuth();
  
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    setLoading(true);
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "favorites"),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      const favList = querySnapshot.docs.map(doc => ({
        docId: doc.id, 
        ...doc.data()  
      }));
      setFavorites(favList);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  const handleRemoveFavorite = async (docId, parkName) => {
    Alert.alert(
      "Buang dari Kegemaran",
      `Adakah anda pasti ingin membuang ${parkName} dari senarai kegemaran?`,
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Buang", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "favorites", docId));
              setFavorites(prev => prev.filter(item => item.docId !== docId));
            } catch (error) {
              Alert.alert("Ralat", "Gagal membuang kegemaran.");
            }
          }
        }
      ]
    );
  };

  const renderFavoriteItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: '/buyticket', params: { id: item.parkId } })}
    >
      <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/400' }} style={styles.cardImage} />
      
      <TouchableOpacity 
        style={styles.heartButton} 
        onPress={() => handleRemoveFavorite(item.docId, item.parkName)}
      >
        <Ionicons name="heart" size={22} color="#EF4444" />
      </TouchableOpacity>

      <View style={styles.cardInfo}>
        <Text style={styles.parkName} numberOfLines={1}>{item.parkName}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#64748B" />
          <Text style={styles.parkLocation}>{item.negeri}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <MaintenanceOverlay />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#03045E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kegemaran Saya</Text>
        <View style={styles.rightPlaceholder} /> 
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
          <Text style={styles.loadingText}>Memuatkan kegemaran...</Text>
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={80} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Tiada Kegemaran</Text>
          <Text style={styles.emptySubtitle}>Anda belum menambah mana-mana taman laut ke dalam senarai kegemaran anda.</Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => router.replace('/usermainpage')}>
            <Text style={styles.exploreBtnText}>Teroka Taman Laut</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList 
          data={favorites}
          keyExtractor={(item) => item.docId}
          renderItem={renderFavoriteItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ================= Styles =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 15, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 3 },  
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  rightPlaceholder: { width: 40, height: 40 }, 
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#03045E' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, color: '#0077B6', fontWeight: '500' },
  listContainer: { padding: 20, paddingBottom: 50 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  cardImage: { width: '100%', height: 160, backgroundColor: '#E2E8F0' },
  cardInfo: { padding: 18 },
  parkName: { fontSize: 18, fontWeight: 'bold', color: '#03045E', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  parkLocation: { fontSize: 13, color: '#64748B', marginLeft: 4, fontWeight: '500' },
  heartButton: { position: 'absolute', top: 15, right: 15, backgroundColor: '#FFFFFF', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#03045E', marginTop: 20, marginBottom: 10 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  exploreBtn: { backgroundColor: '#0077B6', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, shadowColor: '#0077B6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  exploreBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
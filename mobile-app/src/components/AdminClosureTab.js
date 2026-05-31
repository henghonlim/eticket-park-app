import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ScrollView, ActivityIndicator, TextInput, Alert, Modal, TouchableWithoutFeedback, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, doc, getDoc, query, where, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebaseConfig';

export default function AdminClosureTab({ parks }) {
  const [selectedPark, setSelectedPark] = useState(parks[0] || null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // 这里的输入框内容直接平铺在页面上
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');

  // 🌟 自动化联动：只要选中的公园发生改变，立刻去数据库拉取并刷新对应的模板内容
  useEffect(() => {
    const fetchClosureTemplate = async () => {
      if (!selectedPark) return;
      setLoading(true);
      try {
        const docRef = doc(db, "system", "settings");
        const settingsSnap = await getDoc(docRef);
        
        let defaultTitle = "Notifikasi Penutupan: [Taman]";
        let defaultBody = "Hai [Nama], harap maklum bahawa [Taman] ditutup buat sementara waktu...";

        if (settingsSnap.exists()) {
          const resData = settingsSnap.data();
          if (resData.templates && resData.templates.closure) {
            const template = resData.templates.closure;
            if (template.title) defaultTitle = template.title;
            if (template.body) defaultBody = template.body;
          }
        }

        // 自动将 [Taman] 标签动态替换为当前所选公园名
        setAnnounceTitle(defaultTitle.replace(/\[Taman\]/g, selectedPark.name));
        setAnnounceBody(defaultBody.replace(/\[Taman\]/g, selectedPark.name));
      } catch (err) {
        console.log("Gagal memuatkan templat closure:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClosureTemplate();
  }, [selectedPark]); // ⚡ 绑定 selectedPark，切换公园自动变色换字

  // 🌟 发送广播函数：直接读取当前屏幕输入框修改后的真实文字
  const handleSendAnnouncement = async () => {
    if (!announceTitle.trim() || !announceBody.trim()) {
      Alert.alert("Perhatian", "Tajuk dan kandungan mesej tidak boleh kosong.");
      return;
    }

    Alert.alert(
      "Sahkan Pengumuman Global 📢",
      `Adakah anda pasti ingin menghantar Notifikasi Penutupan ini kepada SEMUA pengguna berdaftar di dalam sistem?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hantar Global",
          style: "destructive",
          onPress: async () => {
            try {
              setIsSending(true);

              // 1. 🌟 直接一把抓出全平台所有的注册用户数据
              const usersSnap = await getDocs(collection(db, "users"));
              
              if (usersSnap.empty) {
                Alert.alert("Info", "Tiada pengguna dikesan di dalam sistem.");
                setIsSending(false);
                return;
              }

              // 2. 🌟 考虑到你的 FYP 毕业答辩加分项：Firestore Batch 写入单次上限是 500 条
              // 为了绝对的安全和商业级性能，我们引入分块批处理（Chunked Batch）算法
              const allUsersDocs = usersSnap.docs;
              const chunkSize = 400; // 每 400 条打包成一个 Batch 发送
              let totalSent = 0;

              for (let i = 0; i < allUsersDocs.length; i += chunkSize) {
                const batch = writeBatch(db);
                const chunk = allUsersDocs.slice(i, i + chunkSize);

                chunk.forEach((userDoc) => {
                  const uid = userDoc.id;
                  const userData = userDoc.data();

                  if (userData.role === 'admin') {
                    return; // 退出当前循环，继续检查下一个用户
                  }
                  // 顺手直接从当前 document 抓取真实姓名，没有就 Fallback 变成 Pelawat
                  const fullName = userData.fullName || "Pelawat";

                  // 分别替换每一个独立用户的 [Nama] 标签
                  let finalTitle = announceTitle.replace(/\[Nama\]/g, fullName);
                  let finalBody = announceBody.replace(/\[Nama\]/g, fullName);

                  const newNotifRef = doc(collection(db, "notifications"));
                  batch.set(newNotifRef, {
                    userId: uid,
                    title: finalTitle,
                    body: finalBody,
                    type: 'closure', // 对应用户端红色警告图标
                    isRead: false,
                    createdAt: serverTimestamp()
                  });
                  totalSent++;
                });

                // 正式提交这一个分段的 Batch
                await batch.commit();
              }

              try {
                const auth = getAuth();
                const adminEmail = auth.currentUser?.email || 'Admin';
                await addDoc(collection(db, "auditLogs"), {
                  action: "Penutupan Taman Laut",
                  details: `Admin (${adminEmail}) telah menutup taman laut: ${selectedPark.name} dan menghantar notifikasi kepada ${totalSent} pengguna.`,
                  timestamp: serverTimestamp()
                });
              } catch (logError) {
                console.log("Gagal log penutupan taman:", logError);
              }

              Alert.alert("Berjaya Rasmi! 🚨", `Notifikasi penutupan global telah berjaya disebarkan kepada semua ${totalSent} pengguna berdaftar.`);
            } catch (err) {
              Alert.alert("Ralat", "Gagal menyebarkan pengumuman global: " + err.message);
            } finally {
              setIsSending(false);
            }
          }
        }
      ]
    );
  };

  return (
    // 🌟 1. 外层改回最纯净的 View，把复杂的避让交给 ScrollView 自己处理
    <View style={{ flex: 1 }}>
      
      {/* 🌟 2. 这里的属性是魔法核心！ */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled" 
        
        // 🚀 【核心大招】开启原生键盘安全域动态调整（系统会自动把聚焦的输入框死死推到键盘上方）
        automaticallyAdjustKeyboardInsets={true}
      >
        
        {/* 1. 顶部选择公园栏 */}
        <Text style={styles.sectionLabel}>Pilih Taman Laut Yang Ingin Ditutup</Text>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowPicker(true)}>
          <Ionicons name="business" size={20} color="#D62828" />
          <Text style={styles.pickerText}>{selectedPark ? selectedPark.name : 'Sila pilih lokasi'}</Text>
          <Ionicons name="chevron-down" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* 2. 保留的核心特色管控看板框 */}
        <View style={styles.monitorBox}>
          <MaterialCommunityIcons name="alert-octagon" size={36} color="#D62828" />
          <Text style={styles.monitorTitle}>Zon Kawalan Penutupan Taman</Text>
          <Text style={styles.monitorDesc}>
            Gunakan modul ini apabila taman laut diarahkan tutup atas faktor keselamatan, bencana alam, pemulihan ekosistem atau penyelenggaraan bermusim.
          </Text>
        </View>

        {/* 3. 核心编辑表单大厅 */}
        {loading ? (
          <ActivityIndicator size="large" color="#D62828" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.fieldLabel}>TAJUK NOTIFIKASI AMARAN RASMI</Text>
            <TextInput 
              style={styles.textInputBold} 
              value={announceTitle} 
              onChangeText={setAnnounceTitle} 
              placeholder="Masukkan tajuk penutupan..."
              editable={!isSending} 
            />

            <Text style={styles.fieldLabel}>KANDUNGAN MESEJ (DRAF UTAMA)</Text>
            <TextInput 
              style={styles.textInputArea} 
              value={announceBody} 
              onChangeText={setAnnounceBody} 
              placeholder="Tulis draf kandungan penutupan di sini..."
              multiline={true} 
              numberOfLines={6} 
              editable={!isSending} 
            />
            <Text style={styles.tipText}>
              * Nota: Kekalkan kod <Text style={{fontWeight:'bold', color:'#D62828'}}>[Nama]</Text> jika mahu nama pelanggan diubah secara dinamik oleh sistem.
            </Text>

            {/* 4. 终极广播发射按钮 */}
            <TouchableOpacity 
              style={[styles.btnSend, isSending && { backgroundColor: '#94A3B8' }]} 
              onPress={handleSendAnnouncement}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>Sahkan & Hantar Isyarat Tutup</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* 公园选择底盘弹出窗 */}
      <Modal visible={showPicker} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownBox}>
                <Text style={styles.modalTitle}>Pilih Taman Laut</Text>
                <ScrollView style={{ maxHeight: 250 }}>
                  {parks.map((p) => (
                    <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => { setSelectedPark(p); setShowPicker(false); }}>
                      <Text style={{ fontSize: 16, color: '#334155' }}>{p.name}</Text>
                      {selectedPark?.id === p.id && <Ionicons name="checkmark" size={20} color="#D62828" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ================= Styles 样式美装组 (无缝对接，更加紧凑高级) =================
const styles = StyleSheet.create({
  content: { paddingHorizontal: 25, paddingTop: 15, paddingBottom: 95 },
  sectionLabel: { fontSize: 15, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  pickerText: { flex: 1, marginLeft: 10, fontSize: 16, color: '#334155', fontWeight: '500' },
  
  monitorBox: { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FEE2E2', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 25 },
  monitorTitle: { fontSize: 16, fontWeight: 'bold', color: '#991B1B', marginTop: 10, marginBottom: 4 },
  monitorDesc: { fontSize: 12, color: '#7F1D1D', textAlign: 'center', lineHeight: 18 },
  
  formContainer: { marginTop: 5 },
  fieldLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748B', marginBottom: 6, letterSpacing: 0.5 },
  textInputBold: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 15, fontSize: 14, color: '#334155', fontWeight: 'bold', marginBottom: 18, elevation: 1, shadowColor: '#000', shadowOpacity: 0.02 },
  textInputArea: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 15, fontSize: 14, color: '#334155', height: 130, textAlignVertical: 'top', lineHeight: 22, marginBottom: 5, elevation: 1, shadowColor: '#000', shadowOpacity: 0.02 },
  tipText: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginBottom: 25, paddingHorizontal: 4 },
  
  btnSend: { backgroundColor: '#D62828', flexDirection: 'row', paddingVertical: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#D62828', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  dropdownBox: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 10, elevation: 10 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#03045E', padding: 15, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }
});
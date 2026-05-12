import { db } from '../../firebaseConfig';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    doc, 
    getDocs,
    getDoc,
    query, 
    orderBy, 
    serverTimestamp 
} from 'firebase/firestore';

const parksCol = collection(db, "parks");

export const addPark = async (parkData) => {
    try {
        const docRef = await addDoc(parksCol, {
            name: parkData.name || '',
            description: parkData.description || '',
            negeri: parkData.negeri || '',
            location: {
                latitude: parkData.location?.latitude || 0,
                longitude: parkData.location?.longitude || 0,
            },
            pricing: {
                msia: parkData.pricing?.msia || { adult: '', child: '', senior: '', oku: '' },
                intl: parkData.pricing?.intl || { adult: '', child: '', senior: '', oku: '' }
            },
            status: parkData.status || 'Tidak Aktif',
            imageUrl: parkData.imageUrl || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        console.error("Add Park Error:", error);
        throw error;
    }
};

export const getAllParks = async () => {
    try {
        const q = query(parksCol, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Get Parks Error:", error);
        throw error;
    }
};

export const getParkById = async (parkId) => {
    try {
        const docRef = doc(db, "parks", parkId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("Get Park By ID Error:", error);
        throw error;
    }
};

export const updatePark = async (parkId, updatedData) => {
    try {
        const parkRef = doc(db, "parks", parkId);
        await updateDoc(parkRef, {
            ...updatedData,
            updatedAt: serverTimestamp(),
        });
        return true;
    } catch (error) {
        console.error("Update Park Error:", error);
        throw error;
    }
};

export const deletePark = async (parkId) => {
    try {
        const parkRef = doc(db, "parks", parkId);
        await deleteDoc(parkRef);
        return true;
    } catch (error) {
        console.error("Delete Park Error:", error);
        throw error;
    }
};
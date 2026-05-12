import { 
    collection, 
    getDocs, 
    getDoc, 
    doc, 
    query, 
    where, 
    limit 
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export const getTickets = async () => {
    try {
        const ticketCol = collection(db, 'tickets');
        const snapshot = await getDocs(ticketCol);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching tickets:", error);
        return [];
    }
};


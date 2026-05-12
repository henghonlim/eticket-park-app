// src/services/AuthService.js
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from 'firebase/auth';
import {
    doc,
    getDoc,
    setDoc,
    getDocs,
    collection,
    updateDoc,
    query,
    where,
    serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

export const registerUser = async (email, password, username) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            userName: username,
            role: 'user',
            accountStatus: 'Aktif',
            createdAt: serverTimestamp(),
            fullName: '',
            icPassport: '',
            nationality: '',
            phone: '',
            emergencyContact: '',
            totalTickets: 0,
            totalSpending: 0
        });

        return user;
    } catch (error) {
        console.log("AuthService Register Error:", error.message);
        throw error;
    }
};

export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return { user, ...userData };
        } else {
            return { user, role: 'user' };
        }
    } catch (error) {
        console.log("AuthService Login Error:", error.message);
        throw error;
    }
};

export const resetUserPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        return true;
    } catch (error) {
        console.log("Reset Password Error:", error.message);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        await signOut(auth);
        return true;
    } catch (error) {
        throw error;
    }
};

export const updateUserProfile = async (uid, updateData) => {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, updateData);
        return true;
    } catch (error) {
        console.log("Update Profile Error:", error.message);
        throw error;
    }
};

export const getAllUsers = async () => {
    try {
        const q = query(collection(db, "users"), where("role", "==", "user"));
        const querySnapshot = await getDocs(q);
        
        const usersList = [];
        querySnapshot.forEach((doc) => {
            usersList.push({ id: doc.id, ...doc.data() });
        });
        return usersList;
    } catch (error) {
        console.log("Ralat mengambil senarai pengguna:", error);
        throw error;
    }
};

export const getCurrentUserData = async () => {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            return { uid: user.uid, ...userDoc.data() };
        }
        return null;
    } catch (error) {
        console.error("Error fetching user data:", error);
        throw error;
    }
};

export const adminUpdateUser = async (userId, newData) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, newData);
        return true;
    } catch (error) {
        console.log("Error admin updating user:", error.message);
        throw error;
    }
};
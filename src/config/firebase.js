// Firebase configuration — reads from environment variables
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDdzGx1e4JRX8kEYLpTV_ulY4mM3R1G2aQ",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mindgigs-62f27.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mindgigs-62f27",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mindgigs-62f27.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "856428049510",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:856428049510:web:9276e3f88909ae0425a9a7",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Z3MHRP34F8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

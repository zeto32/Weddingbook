
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB6dvT-3SZBpa2GxuZNUaNzM-oXaQ8nVR0",
  authDomain: "wedding-book-27002.firebaseapp.com",
  projectId: "wedding-book-27002",
  storageBucket: "wedding-book-27002.firebasestorage.app",
  messagingSenderId: "175739326234",
  appId: "1:175739326234:web:7ec57cdca1d0cb5bd8a6a3",
  measurementId: "G-58Q8JKKW03"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDdAH3_U_d5fKJIK21VP7rSeD5aUjJ0Db4",
  authDomain: "gmcontrol-42fd3.firebaseapp.com",
  projectId: "gmcontrol-42fd3",
  storageBucket: "gmcontrol-42fd3.firebasestorage.app",
  messagingSenderId: "190319713049",
  appId: "1:190319713049:web:f3f9f6e7718af13ae64388"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDocs
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC3_UZcAp_pnrWPI1U68qXZXe9NdN-aR4s",
  authDomain: "menew-78832.firebaseapp.com",
  projectId: "menew-78832",
  storageBucket: "menew-78832.appspot.com",
  messagingSenderId: "399065956634",
  appId: "1:399065956634:web:316614bafe4321b46f2ca3",
  measurementId: "G-E6X2G758FT"
};

const app = initializeApp(firebaseConfig);

// إعداد Firebase Services
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// تعيين على window (يجب أن يتم بعد init)
window.auth = auth;
window.provider = provider;
window.signInWithPopup = signInWithPopup;
window.signInAnonymously = signInAnonymously;
window.onAuthStateChanged = onAuthStateChanged;
window.signOut = signOut;
window.db = db;
window.doc = doc;
window.setDoc = setDoc;
window.collection = collection;
window.getDocs = getDocs;
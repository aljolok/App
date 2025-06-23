// firebase_code.js

const firebaseConfig = {
  apiKey: "AIzaSyC3_UZcAp_pnrWPI1U68qXZXe9NdN-aR4s",
  authDomain: "menew-78832.firebaseapp.com",
  projectId: "menew-78832",
  storageBucket: "menew-78832.appspot.com",
  messagingSenderId: "399065956634",
  appId: "1:399065956634:web:316614bafe4321b46f2ca3",
  measurementId: "G-E6X2G758FT"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
const db = firebase.firestore();

// make available globally
window.auth = auth;
window.provider = provider;
window.signInWithPopup = auth.signInWithPopup.bind(auth);
window.signInAnonymously = auth.signInAnonymously.bind(auth);
window.onAuthStateChanged = auth.onAuthStateChanged.bind(auth);
window.signOut = auth.signOut.bind(auth);
window.db = db;
window.doc = (collectionName, id) => db.collection(collectionName).doc(id);
window.setDoc = (docRef, data) => docRef.set(data);
window.collection = (path) => db.collection(path);
window.getDocs = (ref) => ref.get();
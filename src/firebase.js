import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC-Q_csm59ZeHP6s23CECG8XRmT4B2o994",
  authDomain: "cobranzas-galarraga.firebaseapp.com",
  databaseURL: "https://cobranzas-galarraga-default-rtdb.firebaseio.com",
  projectId: "cobranzas-galarraga",
  storageBucket: "cobranzas-galarraga.firebasestorage.app",
  messagingSenderId: "269412172247",
  appId: "1:269412172247:web:961f16a3c230fc05754b92",
};

const firebaseApp = initializeApp(firebaseConfig);
export const db = getDatabase(firebaseApp);

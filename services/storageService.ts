
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { db, auth } from './firebaseConfig';
import { Tire, Vehicle } from '../types';

// Helper para sanitizar objetos (remover undefined) antes de enviar para o Firestore
const sanitize = (obj: any) => JSON.parse(JSON.stringify(obj));

export const storageService = {
  // --- Autenticação ---
  login: async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  },

  logout: async () => {
    await signOut(auth);
  },

  subscribeToAuth: (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // --- Pneus (Firestore) ---
  subscribeToTires: (callback: (tires: Tire[]) => void) => {
    const q = collection(db, "tires");
    return onSnapshot(q, (snapshot) => {
      const tires: Tire[] = [];
      snapshot.forEach((doc) => {
        tires.push(doc.data() as Tire);
      });
      callback(tires);
    });
  },

  addTire: async (tire: Tire) => {
    await setDoc(doc(db, "tires", tire.id), sanitize(tire));
  },

  updateTire: async (tire: Tire) => {
    await setDoc(doc(db, "tires", tire.id), sanitize(tire), { merge: true });
  },

  deleteTire: async (id: string) => {
    await deleteDoc(doc(db, "tires", id));
  },

  // --- Veículos (Firestore) ---
  subscribeToVehicles: (callback: (vehicles: Vehicle[]) => void) => {
    const q = collection(db, "vehicles");
    return onSnapshot(q, (snapshot) => {
      const vehicles: Vehicle[] = [];
      snapshot.forEach((doc) => {
        vehicles.push(doc.data() as Vehicle);
      });
      callback(vehicles);
    });
  },

  addVehicle: async (vehicle: Vehicle) => {
    await setDoc(doc(db, "vehicles", vehicle.id), sanitize(vehicle));
  },

  updateVehicle: async (vehicle: Vehicle) => {
    await setDoc(doc(db, "vehicles", vehicle.id), sanitize(vehicle), { merge: true });
  },

  deleteVehicle: async (id: string) => {
    await deleteDoc(doc(db, "vehicles", id));
  },

  // --- Exportação/Backup ---
  exportData: (tires: Tire[], vehicles: Vehicle[]) => {
     const data = {
         tires,
         vehicles,
         exportedAt: new Date().toISOString(),
         version: '3.0.0-firebase'
     };
     const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `GMcontrol_Cloud_Backup_${new Date().toISOString().slice(0, 10)}.json`;
     a.target = "_blank"; // Fix for black screen on some environments
     a.rel = "noopener noreferrer";
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     setTimeout(() => URL.revokeObjectURL(url), 100);
  },
  
  // --- Importação em Massa (Batch Write) ---
  importDataBatch: async (tires: Tire[], vehicles: Vehicle[]) => {
      const batchSize = 450; // Limite do Firestore é 500 operações por batch
      
      // Combina todas as operações
      const allOps = [
        ...tires.map(t => ({ type: 'tire', data: sanitize(t) })),
        ...vehicles.map(v => ({ type: 'vehicle', data: sanitize(v) }))
      ];

      // Processa em chunks
      for (let i = 0; i < allOps.length; i += batchSize) {
          const batch = writeBatch(db);
          const chunk = allOps.slice(i, i + batchSize);
          
          chunk.forEach(op => {
              if (op.type === 'tire') {
                  batch.set(doc(db, "tires", op.data.id), op.data);
              } else {
                  batch.set(doc(db, "vehicles", op.data.id), op.data);
              }
          });
          
          await batch.commit();
      }
  }
};
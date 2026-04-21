import { collection, getDocs, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Spot } from '../types';

const COLLECTION = 'spots';

const BASE = 'https://raw.githubusercontent.com/HectorGuzman/sup-vision/main';

const DEFAULT_SPOTS: Omit<Spot, 'id'>[] = [
  { nombre: 'La Herradura',  lat: -29.983059, lng: -71.365225, dataUrl: `${BASE}/data-herradura.json` },
  { nombre: 'Viña del Mar',  lat: -33.0243,   lng: -71.5516,   dataUrl: `${BASE}/data-vina.json` },
  { nombre: 'Pichilemu',     lat: -34.3869,   lng: -72.0045,   dataUrl: `${BASE}/data-pichilemu.json` },
  { nombre: 'Iquique',       lat: -20.2133,   lng: -70.1503,   dataUrl: `${BASE}/data-iquique.json` },
  { nombre: 'Bahía Inglesa', lat: -27.1058,   lng: -70.8571,   dataUrl: `${BASE}/data-bahia_inglesa.json` },
  { nombre: 'Arica',         lat: -18.4783,   lng: -70.3126,   dataUrl: `${BASE}/data-arica.json` },
];

export async function getSpots(): Promise<Spot[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  if (snap.empty) return DEFAULT_SPOTS.map((s, i) => ({ ...s, id: `default-${i}` }));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Spot));
}

export async function addSpot(spot: Omit<Spot, 'id'>): Promise<Spot> {
  const docRef = await addDoc(collection(db, COLLECTION), spot);
  return { id: docRef.id, ...spot };
}

export async function deleteSpot(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export function subscribeSpots(cb: (spots: Spot[]) => void): () => void {
  const defaults = DEFAULT_SPOTS.map((s, i) => ({ ...s, id: `default-${i}` }));
  return onSnapshot(
    collection(db, COLLECTION),
    snap => {
      if (snap.empty) { cb(defaults); return; }
      cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Spot)));
    },
    _err => cb(defaults)
  );
}

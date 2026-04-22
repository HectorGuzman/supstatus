import { collection, getDocs, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Spot } from '../types';

const COLLECTION = 'spots';

const BASE = 'https://raw.githubusercontent.com/HectorGuzman/sup-vision/main';
const SPOTS_CONFIG_URL = `${BASE}/spots-config.json`;

async function fetchDefaultSpots(): Promise<Omit<Spot, 'id'>[]> {
  const res = await fetch(`${SPOTS_CONFIG_URL}?cb=${Date.now()}`, { cache: 'no-store' });
  const config: { id: string; nombre: string; lat: number; lng: number }[] = await res.json();
  return config.map(s => ({
    nombre: s.nombre,
    lat: s.lat,
    lng: s.lng,
    dataUrl: `${BASE}/data-${s.id}.json`,
  }));
}

export async function fetchSpotsConfig(): Promise<{ id: string; nombre: string }[]> {
  try {
    const res = await fetch(`${SPOTS_CONFIG_URL}?cb=${Date.now()}`, { cache: 'no-store' });
    const config: { id: string; nombre: string }[] = await res.json();
    return config.map(s => ({ id: s.id, nombre: s.nombre }));
  } catch { return []; }
}

export async function getSpots(): Promise<Spot[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  if (snap.empty) {
    const defaults = await fetchDefaultSpots();
    return defaults.map((s, i) => ({ ...s, id: `default-${i}` }));
  }
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
  return onSnapshot(
    collection(db, COLLECTION),
    async snap => {
      if (snap.empty) {
        try {
          const defaults = await fetchDefaultSpots();
          cb(defaults.map((s, i) => ({ ...s, id: `default-${i}` })));
        } catch {
          cb([]);
        }
        return;
      }
      cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Spot)));
    },
    async _err => {
      try {
        const defaults = await fetchDefaultSpots();
        cb(defaults.map((s, i) => ({ ...s, id: `default-${i}` })));
      } catch {
        cb([]);
      }
    }
  );
}

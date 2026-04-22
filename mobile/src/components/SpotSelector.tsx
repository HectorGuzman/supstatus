import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  StyleSheet, Linking,
} from 'react-native';
import { Spot } from '../types';
import { subscribeSpots } from '../services/spots';

interface Props {
  selected: Spot | null;
  onSelect: (spot: Spot) => void;
}

export default function SpotSelector({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [spots, setSpots] = useState<Spot[]>([]);

  useEffect(() => subscribeSpots(setSpots), []);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>📍 {selected?.nombre ?? 'Seleccionar spot'}</Text>
        <Text style={styles.arrow}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Spots</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {spots.map(spot => (
                <TouchableOpacity
                  key={spot.id}
                  style={[styles.spotBtn, selected?.id === spot.id && styles.spotBtnActive]}
                  onPress={() => { onSelect(spot); setOpen(false); }}
                >
                  <Text style={[styles.spotName, selected?.id === spot.id && styles.spotNameActive]}>
                    {spot.nombre}
                  </Text>
                  <Text style={styles.spotCoords}>{spot.lat.toFixed(3)}, {spot.lng.toFixed(3)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.suggestBtn}
              onPress={() => Linking.openURL('https://instagram.com/__supstatus')}
            >
              <Text style={styles.suggestText}>¿Tu spot no está? Escríbenos en Instagram</Text>
              <Text style={styles.suggestHandle}>@__supstatus</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnSecondary, { marginTop: 8 }]} onPress={() => setOpen(false)}>
              <Text style={styles.btnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#334155', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  triggerText: { color: '#e2e8f0', fontWeight: '600', fontSize: 14 },
  arrow: { color: '#94a3b8', marginLeft: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1e293b', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 16 },
  spotBtn: { backgroundColor: '#0f172a', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', marginBottom: 8 },
  spotBtnActive: { borderColor: '#0ea5e9' },
  spotName: { color: '#e2e8f0', fontWeight: '600' },
  spotNameActive: { color: '#0ea5e9' },
  spotCoords: { color: '#64748b', fontSize: 12, marginTop: 2 },
  suggestBtn: { backgroundColor: '#0f172a', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#334155' },
  suggestText: { color: '#94a3b8', fontSize: 13, marginBottom: 2 },
  suggestHandle: { color: '#e1306c', fontWeight: '700', fontSize: 13 },
  btnSecondary: { backgroundColor: '#334155', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Spot } from '../types';
import { subscribeSpots, addSpot, deleteSpot } from '../services/spots';
import { auth } from '../services/firebase';

interface Props {
  selected: Spot | null;
  onSelect: (spot: Spot) => void;
}

export default function SpotSelector({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ nombre: '', lat: '', lng: '', dataUrl: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeSpots(setSpots), []);

  const handleAdd = async () => {
    if (!form.nombre || !form.lat || !form.lng || !form.dataUrl) {
      Alert.alert('Completa todos los campos'); return;
    }
    setSaving(true);
    try {
      const spot = await addSpot({
        nombre: form.nombre,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        dataUrl: form.dataUrl,
        createdBy: auth.currentUser!.uid,
      });
      onSelect(spot);
      setShowAdd(false);
      setOpen(false);
      setForm({ nombre: '', lat: '', lng: '', dataUrl: '' });
    } catch { Alert.alert('Error', 'No se pudo guardar el spot.'); }
    finally { setSaving(false); }
  };

  const handleDelete = (spot: Spot) => {
    Alert.alert('Eliminar spot', `¿Eliminar "${spot.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteSpot(spot.id) },
    ]);
  };

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
                <View key={spot.id} style={styles.row}>
                  <TouchableOpacity
                    style={[styles.spotBtn, selected?.id === spot.id && styles.spotBtnActive]}
                    onPress={() => { onSelect(spot); setOpen(false); }}
                  >
                    <Text style={[styles.spotName, selected?.id === spot.id && styles.spotNameActive]}>
                      {spot.nombre}
                    </Text>
                    <Text style={styles.spotCoords}>{spot.lat.toFixed(3)}, {spot.lng.toFixed(3)}</Text>
                  </TouchableOpacity>
                  {auth.currentUser && !spot.id.startsWith('default') && (
                    <TouchableOpacity onPress={() => handleDelete(spot)} style={styles.deleteBtn}>
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>

            {auth.currentUser && !showAdd && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
                <Text style={styles.addBtnText}>+ Agregar spot</Text>
              </TouchableOpacity>
            )}

            {showAdd && (
              <View style={styles.addForm}>
                <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor="#64748b" value={form.nombre} onChangeText={v => setForm(f => ({ ...f, nombre: v }))} />
                <View style={styles.row}>
                  <TextInput style={[styles.input, { flex: 1, marginRight: 6 }]} placeholder="Lat" placeholderTextColor="#64748b" keyboardType="numeric" value={form.lat} onChangeText={v => setForm(f => ({ ...f, lat: v }))} />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Lng" placeholderTextColor="#64748b" keyboardType="numeric" value={form.lng} onChangeText={v => setForm(f => ({ ...f, lng: v }))} />
                </View>
                <TextInput style={styles.input} placeholder="URL del data.json" placeholderTextColor="#64748b" autoCapitalize="none" value={form.dataUrl} onChangeText={v => setForm(f => ({ ...f, dataUrl: v }))} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => setShowAdd(false)}>
                    <Text style={styles.btnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={handleAdd} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Guardar</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity style={[styles.btnSecondary, { marginTop: 8 }]} onPress={() => { setOpen(false); setShowAdd(false); }}>
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
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  spotBtn: { flex: 1, backgroundColor: '#0f172a', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  spotBtnActive: { borderColor: '#0ea5e9' },
  spotName: { color: '#e2e8f0', fontWeight: '600' },
  spotNameActive: { color: '#0ea5e9' },
  spotCoords: { color: '#64748b', fontSize: 12, marginTop: 2 },
  deleteBtn: { marginLeft: 8, padding: 10 },
  deleteText: { color: '#ef4444', fontSize: 16 },
  addBtn: { backgroundColor: '#0f172a', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  addBtnText: { color: '#0ea5e9', fontWeight: '600' },
  addForm: { marginTop: 12 },
  input: { backgroundColor: '#0f172a', color: '#f1f5f9', padding: 12, borderRadius: 10, marginBottom: 8 },
  btnPrimary: { backgroundColor: '#0ea5e9', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnSecondary: { backgroundColor: '#334155', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});

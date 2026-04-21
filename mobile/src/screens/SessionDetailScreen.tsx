import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { api } from '../services/api';
import { Session } from '../types';

const { width } = Dimensions.get('window');
const MAP_H = 240;
const PAD = 12;

interface Props {
  route?: { params: { session: Session } };
  navigation?: any;
}

function buildSvgHtml(track: { lat: number; lng: number }[]): string {
  const W = width - PAD * 2;
  const H = MAP_H;
  const margin = 20;

  const lats = track.map(p => p.lat);
  const lngs = track.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 0.001;
  const spanLng = maxLng - minLng || 0.001;

  const toX = (lng: number) => ((lng - minLng) / spanLng) * (W - margin * 2) + margin;
  const toY = (lat: number) => ((maxLat - lat) / spanLat) * (H - margin * 2) + margin;

  const points = track.map(p => `${toX(p.lng).toFixed(1)},${toY(p.lat).toFixed(1)}`).join(' ');
  const sx = toX(track[0].lng).toFixed(1);
  const sy = toY(track[0].lat).toFixed(1);
  const ex = toX(track[track.length - 1].lng).toFixed(1);
  const ey = toY(track[track.length - 1].lat).toFixed(1);

  return `<!DOCTYPE html><html><body style="margin:0;background:#0f172a;">
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <polyline points="${points}" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${sx}" cy="${sy}" r="6" fill="#22c55e"/>
      <circle cx="${ex}" cy="${ey}" r="6" fill="#ef4444"/>
    </svg>
  </body></html>`;
}

export default function SessionDetailScreen({ route, navigation }: Props) {
  const { session } = route!.params;
  const track = session.trackPoints ?? [];

  const handleDelete = () => {
    Alert.alert('Eliminar remada', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await api.deleteSession(session.id);
          navigation?.goBack();
        }
      },
    ]);
  };

  const fmtDuration = (min: number) =>
    min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.deleteText}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {track.length > 1 ? (
          <View style={styles.mapContainer}>
            <WebView
              source={{ html: buildSvgHtml(track) }}
              style={styles.map}
              scrollEnabled={false}
              pointerEvents="none"
            />
            <View style={styles.legend}>
              <Text style={styles.legendItem}>🟢 Inicio</Text>
              <Text style={styles.legendItem}>🔴 Fin</Text>
            </View>
          </View>
        ) : (
          <View style={styles.noMap}>
            <Text style={styles.noMapText}>Sin datos GPS</Text>
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.spot}>{session.spot}</Text>
          <Text style={styles.date}>
            {new Date(session.date).toLocaleDateString('es-CL', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </Text>

          <View style={styles.statsGrid}>
            {session.distanceKm != null && (
              <StatCard label="Distancia" value={`${session.distanceKm} km`} icon="📏" />
            )}
            {session.durationMin != null && (
              <StatCard label="Duración" value={fmtDuration(session.durationMin)} icon="⏱️" />
            )}
            {session.distanceKm && session.durationMin && session.durationMin > 0 && (
              <StatCard
                label="Velocidad media"
                value={`${((session.distanceKm / session.durationMin) * 60).toFixed(1)} km/h`}
                icon="🚀"
              />
            )}
            {track.length > 0 && (
              <StatCard label="Puntos GPS" value={String(track.length)} icon="📍" />
            )}
          </View>

          {session.notes && (
            <View style={styles.notes}>
              <Text style={styles.notesLabel}>Notas</Text>
              <Text style={styles.notesText}>{session.notes}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#1e293b', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backText: { color: '#0ea5e9', fontWeight: '600', fontSize: 16 },
  deleteText: { color: '#ef4444', fontWeight: '600' },
  mapContainer: { marginHorizontal: PAD, marginTop: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0f172a' },
  map: { width: width - PAD * 2, height: MAP_H, backgroundColor: '#0f172a' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: 8, backgroundColor: '#1e293b' },
  legendItem: { color: '#94a3b8', fontSize: 13 },
  noMap: { height: 120, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', margin: PAD, borderRadius: 12 },
  noMapText: { color: '#475569' },
  body: { padding: 20 },
  spot: { fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
  date: { color: '#64748b', marginTop: 4, marginBottom: 20, textTransform: 'capitalize' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: '#1e293b', padding: 16, borderRadius: 12, alignItems: 'center' },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  notes: { marginTop: 20, backgroundColor: '#1e293b', padding: 16, borderRadius: 12 },
  notesLabel: { color: '#64748b', fontSize: 12, marginBottom: 6 },
  notesText: { color: '#e2e8f0', lineHeight: 22 },
});

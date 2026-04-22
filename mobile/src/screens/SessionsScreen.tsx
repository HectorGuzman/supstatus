import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StyleSheet, Alert, ActivityIndicator, Dimensions, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gradient as LinearGradient } from '../components/Gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { WebView } from 'react-native-webview';
import { api } from '../services/api';
import { Session } from '../types';
import { auth } from '../services/firebase';
import { requestLocationPermission } from '../services/permissions';
import { colors, radius, spacing } from '../theme';

const { width } = Dimensions.get('window');
const MAP_H = 220;
const PAD = 16;

interface TrackPoint { lat: number; lng: number; timestamp: number }

function buildSvgHtml(track: { lat: number; lng: number }[]): string {
  const W = width - PAD * 2;
  const margin = 24;
  const lats = track.map(p => p.lat), lngs = track.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 0.001, spanLng = maxLng - minLng || 0.001;
  const toX = (lng: number) => ((lng - minLng) / spanLng) * (W - margin * 2) + margin;
  const toY = (lat: number) => ((maxLat - lat) / spanLat) * (MAP_H - margin * 2) + margin;
  const points = track.map(p => `${toX(p.lng).toFixed(1)},${toY(p.lat).toFixed(1)}`).join(' ');
  const sx = toX(track[0].lng).toFixed(1), sy = toY(track[0].lat).toFixed(1);
  const ex = toX(track[track.length - 1].lng).toFixed(1), ey = toY(track[track.length - 1].lat).toFixed(1);
  return `<!DOCTYPE html><html><body style="margin:0;background:#071828;overflow:hidden;">
    <svg width="${W}" height="${MAP_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <polyline points="${points}" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#glow)" opacity="0.6"/>
      <polyline points="${points}" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${sx}" cy="${sy}" r="7" fill="#10b981" opacity="0.3"/>
      <circle cx="${sx}" cy="${sy}" r="4" fill="#10b981"/>
      <circle cx="${ex}" cy="${ey}" r="7" fill="#ef4444" opacity="0.3"/>
      <circle cx="${ex}" cy="${ey}" r="4" fill="#ef4444"/>
    </svg>
  </body></html>`;
}

function SessionDetail({ session, onClose, onDeleted }: { session: Session; onClose: () => void; onDeleted: () => void }) {
  const track = session.trackPoints ?? [];

  const handleDelete = () => Alert.alert('Eliminar remada', '¿Estás seguro?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: async () => { await api.deleteSession(session.id); onDeleted(); onClose(); } },
  ]);

  const fmtDuration = (min: number) => min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;

  return (
    <Modal visible animationType="slide">
      <View style={styles.container}>
        <LinearGradient colors={['#071828', '#040e1e']} style={styles.detailHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Detalle de remada</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false}>
          {track.length > 1 ? (
            <View style={styles.mapContainer}>
              <WebView source={{ html: buildSvgHtml(track) }} style={styles.mapView} scrollEnabled={false} />
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10b981' }]} /><Text style={styles.legendText}>Inicio</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={styles.legendText}>Fin</Text></View>
                <Text style={styles.legendPoints}>{track.length} pts GPS</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noMapBox}>
              <Ionicons name="location-outline" size={32} color={colors.textMuted} />
              <Text style={styles.noMapText}>Sin datos GPS</Text>
            </View>
          )}

          <View style={styles.detailBody}>
            <Text style={styles.detailSpot}>{session.spot}</Text>
            <Text style={styles.detailDate}>
              {new Date(session.date).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>

            <View style={styles.statsGrid}>
              {session.distanceKm != null && (
                <LinearGradient colors={['#0c2035', '#071828']} style={styles.statGridCard}>
                  <Ionicons name="map-outline" size={20} color={colors.primary} />
                  <Text style={styles.statGridValue}>{session.distanceKm}</Text>
                  <Text style={styles.statGridUnit}>km</Text>
                </LinearGradient>
              )}
              {session.durationMin != null && (
                <LinearGradient colors={['#0c2035', '#071828']} style={styles.statGridCard}>
                  <Ionicons name="timer-outline" size={20} color={colors.warning} />
                  <Text style={styles.statGridValue}>{fmtDuration(session.durationMin)}</Text>
                  <Text style={styles.statGridUnit}>duración</Text>
                </LinearGradient>
              )}
              {session.distanceKm && session.durationMin && session.durationMin > 0 && (
                <LinearGradient colors={['#0c2035', '#071828']} style={styles.statGridCard}>
                  <Ionicons name="speedometer-outline" size={20} color={colors.success} />
                  <Text style={styles.statGridValue}>{((session.distanceKm / session.durationMin) * 60).toFixed(1)}</Text>
                  <Text style={styles.statGridUnit}>km/h media</Text>
                </LinearGradient>
              )}
            </View>

            {session.notes && (
              <View style={styles.notesCard}>
                <View style={styles.notesHeader}>
                  <Ionicons name="document-text-outline" size={15} color={colors.textMuted} />
                  <Text style={styles.notesLabel}>Notas</Text>
                </View>
                <Text style={styles.notesText}>{session.notes}</Text>
              </View>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function SessionsScreen() {
  const insets = useSafeAreaInsets();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [completedSession, setCompletedSession] = useState<Session | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [pendingSession, setPendingSession] = useState<{ dist: number; min: number; pts: TrackPoint[] } | null>(null);
  const [spotName, setSpotName] = useState('');
  const trackPoints = useRef<TrackPoint[]>([]);
  const elapsedRef = useRef(0);
  const distanceRef = useRef(0);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const unsub = (auth as any).onAuthStateChanged((u: any) => {
      setCurrentUser(u);
      setAuthLoaded(true);
      if (u) loadSessions();
      else setLoading(false);
    });
    return unsub;
  }, []);

  const loadSessions = async () => {
    try {
      const d = await api.getMySessions();
      const normalized = (d.sessions ?? []).map((s: any) => ({
        ...s,
        date: s.date || (s.startedAt ? s.startedAt : new Date().toISOString()),
        trackPoints: s.trackPoints?.map((p: any) => ({ lat: p.lat, lng: p.lng ?? p.lon, timestamp: p.timestamp })),
      }));
      setSessions(normalized);
    } finally { setLoading(false); }
  };

  const startTracking = async () => {
    if (!(await requestLocationPermission())) return;
    trackPoints.current = []; elapsedRef.current = 0; distanceRef.current = 0;
    setDistanceKm(0); setElapsed(0);
    await activateKeepAwakeAsync();
    setTracking(true);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(e => e + 1);
    }, 1000);
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5 },
      (loc) => {
        const pt = { lat: loc.coords.latitude, lng: loc.coords.longitude, timestamp: loc.timestamp };
        trackPoints.current.push(pt);
        if (trackPoints.current.length > 1) {
          const prev = trackPoints.current[trackPoints.current.length - 2];
          const delta = haversine(prev.lat, prev.lng, pt.lat, pt.lng);
          distanceRef.current += delta;
          setDistanceKm(d => d + delta);
        }
      }
    );
  };

  const stopTracking = async () => {
    locationSub.current?.remove();
    if (timerRef.current) clearInterval(timerRef.current);
    deactivateKeepAwake(); setTracking(false);

    const pts = trackPoints.current;
    const totalDist = parseFloat(distanceRef.current.toFixed(2));
    const totalSec = elapsedRef.current;
    const totalMin = Math.max(1, Math.round(totalSec / 60));

    if (pts.length < 2 || totalDist < 0.05) {
      Alert.alert('Remada muy corta', 'Se necesitan al menos 50 metros para guardar la sesión.');
      return;
    }
    if (totalSec < 60) {
      Alert.alert('Remada muy corta', 'Se necesita al menos 1 minuto de seguimiento.');
      return;
    }

    setPendingSession({ dist: totalDist, min: totalMin, pts: pts.slice(0, 500) });
    setSpotName('');
  };

  const savePendingSession = async () => {
    if (!pendingSession) return;
    const { dist, min, pts } = pendingSession;
    const name = spotName.trim() || 'Sin nombre';
    try {
      await api.createSession({ distanceKm: dist, durationMin: min, trackPoints: pts, spot: name, date: new Date().toISOString() });
      await loadSessions();
      setCompletedSession({ id: '', distanceKm: dist, durationMin: min, spot: name, date: new Date().toISOString(), trackPoints: pts });
    } catch {
      Alert.alert('Error', 'No se pudo guardar la sesión.');
    } finally {
      setPendingSession(null);
    }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (!authLoaded) return (
    <View style={[styles.container, styles.centered]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );

  if (!currentUser) return (
    <View style={[styles.container, styles.centered]}>
      <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
      <Text style={styles.authPrompt}>Inicia sesión para registrar tus remadas</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#071828', '#040e1e']} style={styles.header}>
        <Text style={styles.screenTitle}>Mis Remadas</Text>
        <Text style={styles.screenSub}>{sessions.length} sesiones registradas</Text>

        {!tracking && (
          <TouchableOpacity style={styles.gpsBtn} onPress={startTracking}>
            <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} />
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.gpsBtnText}>Iniciar GPS</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {tracking && (
        <LinearGradient colors={['#071828', '#0c2035']} style={styles.tracker}>
          <View style={styles.trackerContent}>
            <View style={styles.trackerTimeBox}>
              <Text style={styles.trackerLabel}>TIEMPO</Text>
              <Text style={styles.trackerTime}>{fmt(elapsed)}</Text>
            </View>
            <View style={styles.trackerDivider} />
            <View style={styles.trackerDistBox}>
              <Text style={styles.trackerLabel}>DISTANCIA</Text>
              <Text style={styles.trackerDist}>{distanceKm.toFixed(2)}</Text>
              <Text style={styles.trackerUnit}>km</Text>
            </View>
          </View>
          <View style={styles.trackerPulse}>
            <View style={styles.pulseDot} />
            <Text style={styles.pulseText}>Registrando ruta...</Text>
          </View>
          <TouchableOpacity style={styles.stopBtn} onPress={stopTracking}>
            <Ionicons name="stop-circle" size={20} color="#fff" />
            <Text style={styles.stopBtnText}>Finalizar remada</Text>
          </TouchableOpacity>
        </LinearGradient>
      )}

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {sessions.length === 0 && !tracking && (
            <View style={styles.emptyState}>
              <Ionicons name="navigate-circle-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Sin remadas aún</Text>
              <Text style={styles.emptySub}>Inicia el GPS para registrar tu primera remada</Text>
            </View>
          )}
          {sessions.map(s => (
            <TouchableOpacity key={s.id} style={styles.card} onPress={() => setSelectedSession(s)}>
              <LinearGradient colors={['#0d2035', '#091828']} style={styles.cardGradient}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconBox}>
                    <Ionicons name="water" size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.cardSpot}>{s.spot}</Text>
                    <Text style={styles.cardDate}>{new Date(s.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  {s.distanceKm != null && <Text style={styles.cardDist}>{s.distanceKm} <Text style={styles.cardDistUnit}>km</Text></Text>}
                  {s.durationMin != null && <Text style={styles.cardDuration}>{s.durationMin} min</Text>}
                  {s.trackPoints && s.trackPoints.length > 0 && (
                    <View style={styles.gpsBadge}>
                      <Ionicons name="navigate" size={9} color={colors.success} />
                      <Text style={styles.gpsBadgeText}>GPS</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
          <View style={{ height: 80 + insets.bottom }} />
        </ScrollView>
      )}

      {selectedSession && (
        <SessionDetail session={selectedSession} onClose={() => setSelectedSession(null)} onDeleted={loadSessions} />
      )}

      {completedSession && (
        <SessionSummaryModal
          session={completedSession}
          onClose={() => setCompletedSession(null)}
        />
      )}

      <Modal visible={!!pendingSession} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <LinearGradient colors={['#0d2035', '#071828']} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>¿Dónde remaste?</Text>
            <Text style={{ color: colors.textMuted, marginBottom: spacing.md, fontSize: 14 }}>Ponle un nombre a esta remada</Text>
            <View style={styles.inputRow}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.sheetInput}
                placeholder="Ej: La Herradura, playa, canal..."
                placeholderTextColor={colors.textMuted}
                value={spotName}
                onChangeText={setSpotName}
                autoFocus
              />
            </View>
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPendingSession(null)}>
                <Text style={styles.cancelBtnText}>Descartar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={savePendingSession}>
                <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]} />
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SessionSummaryModal({ session, onClose }: { session: Session; onClose: () => void }) {
  const track = session.trackPoints ?? [];
  const insets = useSafeAreaInsets();
  const dist = session.distanceKm ?? 0;
  const dur = session.durationMin ?? 0;
  const speed = dist && dur ? ((dist / dur) * 60).toFixed(1) : null;
  const fmtDuration = (min: number) => min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;

  const shareSession = () => Share.share({
    message: `🏄 ¡Remada completada!\n\n📍 ${dist.toFixed(2)} km recorridos\n⏱ ${fmtDuration(dur)}${speed ? `\n💨 ${speed} km/h promedio` : ''}\n\nRegistrado con SUP Status 🌊`,
  });

  return (
    <Modal visible animationType="slide">
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <LinearGradient colors={['#071828', '#040e1e']} style={StyleSheet.absoluteFill} />

        <View style={[styles.summaryHeader, { paddingTop: insets.top + 16 }]}>
          <View style={styles.summaryCheckCircle}>
            <Ionicons name="checkmark" size={32} color="#fff" />
          </View>
          <Text style={styles.summaryTitle}>¡Remada completada!</Text>
          <Text style={styles.summarySub}>Sesión guardada correctamente</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }} showsVerticalScrollIndicator={false}>
          {track.length > 1 && (
            <View style={styles.mapContainer}>
              <WebView source={{ html: buildSvgHtml(track) }} style={styles.mapView} scrollEnabled={false} />
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10b981' }]} /><Text style={styles.legendText}>Inicio</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={styles.legendText}>Fin</Text></View>
                <Text style={styles.legendPoints}>{track.length} pts GPS</Text>
              </View>
            </View>
          )}

          <View style={styles.statsGrid}>
            <LinearGradient colors={['#0c2035', '#071828']} style={styles.statGridCard}>
              <Ionicons name="map-outline" size={24} color={colors.primary} />
              <Text style={styles.statGridValue}>{dist.toFixed(2)}</Text>
              <Text style={styles.statGridUnit}>km</Text>
            </LinearGradient>
            <LinearGradient colors={['#0c2035', '#071828']} style={styles.statGridCard}>
              <Ionicons name="timer-outline" size={24} color={colors.warning} />
              <Text style={styles.statGridValue}>{fmtDuration(dur)}</Text>
              <Text style={styles.statGridUnit}>duración</Text>
            </LinearGradient>
            {speed && (
              <LinearGradient colors={['#0c2035', '#071828']} style={styles.statGridCard}>
                <Ionicons name="speedometer-outline" size={24} color={colors.success} />
                <Text style={styles.statGridValue}>{speed}</Text>
                <Text style={styles.statGridUnit}>km/h media</Text>
              </LinearGradient>
            )}
          </View>

          <TouchableOpacity style={styles.shareSessionBtn} onPress={shareSession} activeOpacity={0.85}>
            <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} />
            <Ionicons name="share-social-outline" size={20} color="#fff" />
            <Text style={styles.shareSessionBtnText}>Compartir en redes sociales</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeSessionBtn} onPress={onClose}>
            <Text style={styles.closeSessionBtnText}>Ver mis remadas</Text>
          </TouchableOpacity>

          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  screenTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  screenSub: { fontSize: 12, color: colors.textMuted, marginTop: 1, marginBottom: spacing.md },
  actionRow: { flexDirection: 'row', gap: 10 },
  gpsBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: radius.lg, overflow: 'hidden' },
  gpsBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  manualBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  manualBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  tracker: { margin: spacing.md, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(14,165,233,0.2)' },
  trackerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  trackerTimeBox: { alignItems: 'center', flex: 1 },
  trackerDistBox: { alignItems: 'center', flex: 1 },
  trackerDivider: { width: 1, height: 60, backgroundColor: colors.border },
  trackerLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  trackerTime: { fontSize: 44, fontWeight: '800', color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  trackerDist: { fontSize: 44, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
  trackerUnit: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  trackerPulse: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: spacing.md },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  pulseText: { fontSize: 12, color: colors.success, fontWeight: '600' },
  stopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.danger, padding: 15, borderRadius: radius.lg },
  stopBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  authPrompt: { color: colors.textMuted, fontSize: 15, textAlign: 'center', maxWidth: 260 },
  emptyState: { alignItems: 'center', padding: 60, gap: 10 },
  emptyTitle: { color: colors.textSecondary, fontSize: 18, fontWeight: '600' },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  card: { marginHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardGradient: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  cardSpot: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  cardDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 2 },
  cardDist: { fontSize: 18, fontWeight: '800', color: colors.primary },
  cardDistUnit: { fontSize: 13, fontWeight: '600' },
  cardDuration: { fontSize: 12, color: colors.textMuted },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.successGlow, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full },
  gpsBadgeText: { fontSize: 10, color: colors.success, fontWeight: '700' },
  // Session detail
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4 },
  detailTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  deleteBtn: { padding: 8, backgroundColor: colors.dangerGlow, borderRadius: radius.md },
  mapContainer: { marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  mapView: { width: width - spacing.md * 2, height: MAP_H, backgroundColor: '#071828' },
  mapLegend: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 10, backgroundColor: colors.surface2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 12 },
  legendPoints: { marginLeft: 'auto' as any, color: colors.textMuted, fontSize: 11 },
  noMapBox: { alignItems: 'center', justifyContent: 'center', gap: 8, height: 120, margin: spacing.md, backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  noMapText: { color: colors.textMuted, fontSize: 14 },
  detailBody: { padding: spacing.md },
  detailSpot: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  detailDate: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md, textTransform: 'capitalize' },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  statGridCard: { flex: 1, borderRadius: radius.md, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border },
  statGridValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  statGridUnit: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  notesCard: { backgroundColor: colors.surface1, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  notesLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { color: colors.textSecondary, lineHeight: 22 },
  // Manual sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, overflow: 'hidden' },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface3, borderRadius: radius.md, paddingHorizontal: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  sheetInput: { flex: 1, color: colors.textPrimary, padding: 12, fontSize: 15 },
  twoCol: { flexDirection: 'row', gap: 10 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: spacing.sm },
  cancelBtn: { flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: radius.md, alignItems: 'center', overflow: 'hidden', position: 'relative' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  dangerGlow: { backgroundColor: 'rgba(239,68,68,0.1)' },

  // Session summary modal
  summaryHeader: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: 8 },
  summaryCheckCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  summarySub: { fontSize: 14, color: colors.textMuted },
  shareSessionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: radius.lg, overflow: 'hidden' },
  shareSessionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  closeSessionBtn: { padding: 16, borderRadius: radius.lg, alignItems: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  closeSessionBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
});

import React, { useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert, Dimensions, ActivityIndicator, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../services/api';
import { Session } from '../types';
import { colors, radius, spacing } from '../theme';

const { width } = Dimensions.get('window');
const MAP_H = 300;
const PAD = 12;
const CARD_W = 390;

interface Props {
  route?: { params: { session: Session } };
  navigation?: any;
}

function buildMapHtml(track: { lat: number; lng: number; timestamp?: number }[]): string {
  const pts = track.map(p => `[${p.lat},${p.lng}]`).join(',');
  const mid = track[Math.floor(track.length / 2)];
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#0f172a;}</style>
</head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${mid.lat},${mid.lng}],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
var pts=[${pts}];
var poly=L.polyline(pts,{color:'#0ea5e9',weight:3}).addTo(map);
L.circleMarker(pts[0],{radius:8,color:'#fff',weight:2,fillColor:'#22c55e',fillOpacity:1}).addTo(map);
L.circleMarker(pts[pts.length-1],{radius:8,color:'#fff',weight:2,fillColor:'#ef4444',fillOpacity:1}).addTo(map);
map.fitBounds(poly.getBounds(),{padding:[24,24]});
</script></body></html>`;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getSpeedColor(ratio: number): string {
  if (ratio < 0.25) return '#38bdf8';
  if (ratio < 0.5)  return '#10b981';
  if (ratio < 0.75) return '#f59e0b';
  return '#ef4444';
}

function computeTrackStats(track: { lat: number; lng: number; timestamp?: number }[]) {
  if (track.length < 2) return { speeds: [], maxSpeed: 0, hasSpeedData: false };
  const speeds: number[] = [];
  let hasData = false;
  for (let i = 1; i < track.length; i++) {
    const p1 = track[i - 1], p2 = track[i];
    const ts1 = (p1 as any).timestamp, ts2 = (p2 as any).timestamp;
    if (ts1 && ts2) {
      const distKm = haversine(p1.lat, p1.lng, p2.lat, p2.lng);
      const timeDiffH = (ts2 - ts1) / 3600000;
      const speed = (timeDiffH > 0 && timeDiffH < 0.083) ? Math.min(distKm / timeDiffH, 25) : 0;
      speeds.push(speed);
      if (speed > 0) hasData = true;
    } else {
      speeds.push(0);
    }
  }
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
  return { speeds, maxSpeed, hasSpeedData: hasData };
}

function TrackMinimap({ track, size, speeds }: {
  track: { lat: number; lng: number }[];
  size: number;
  speeds?: number[];
}) {
  if (track.length < 2) return null;
  const margin = 28;
  const W = size - margin * 2, H = size - margin * 2;
  const lats = track.map(p => p.lat), lngs = track.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 0.001, spanLng = maxLng - minLng || 0.001;
  const toX = (lng: number) => ((lng - minLng) / spanLng) * W + margin;
  const toY = (lat: number) => ((maxLat - lat) / spanLat) * H + margin;
  const step = Math.max(1, Math.floor(track.length / 180));
  const pts = track.filter((_, i) => i % step === 0 || i === track.length - 1);

  // Mapear speeds al índice simplificado
  const maxSpd = speeds && speeds.length > 0 ? Math.max(...speeds, 0.1) : 0;
  const getSegColor = (ptIdx: number) => {
    if (!speeds || maxSpd === 0) return '#0ea5e9';
    const origIdx = Math.min(ptIdx * step, speeds.length - 1);
    return getSpeedColor(speeds[origIdx] / maxSpd);
  };

  const segments: { cx: number; cy: number; len: number; angle: number; color: string }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const x1 = toX(pts[i].lng), y1 = toY(pts[i].lat);
    const x2 = toX(pts[i + 1].lng), y2 = toY(pts[i + 1].lat);
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) continue;
    segments.push({
      cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, len,
      angle: Math.atan2(dy, dx) * 180 / Math.PI,
      color: getSegColor(i),
    });
  }

  const sx = toX(track[0].lng), sy = toY(track[0].lat);
  const ex = toX(track[track.length - 1].lng), ey = toY(track[track.length - 1].lat);

  const gridLines = [];
  for (let i = 1; i < 4; i++) {
    gridLines.push(
      <View key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: (size / 4) * i, height: 1, backgroundColor: 'rgba(255,255,255,0.04)' }} />,
      <View key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: (size / 4) * i, width: 1, backgroundColor: 'rgba(255,255,255,0.04)' }} />,
    );
  }

  return (
    <View style={{ width: size, height: size, backgroundColor: '#060f1e', borderRadius: 16, overflow: 'hidden' }}>
      {gridLines}
      {segments.map((s, i) => (
        <View key={`g${i}`} style={{ position: 'absolute', left: s.cx - (s.len + 6) / 2, top: s.cy - 4, width: s.len + 6, height: 8, backgroundColor: s.color, opacity: 0.18, borderRadius: 4, transform: [{ rotate: `${s.angle}deg` }] }} />
      ))}
      {segments.map((s, i) => (
        <View key={`l${i}`} style={{ position: 'absolute', left: s.cx - s.len / 2, top: s.cy - 2, width: s.len, height: 4, backgroundColor: s.color, borderRadius: 2, transform: [{ rotate: `${s.angle}deg` }] }} />
      ))}
      <View style={{ position: 'absolute', left: sx - 9, top: sy - 9, width: 18, height: 18, borderRadius: 9, backgroundColor: '#22c55e', borderWidth: 3, borderColor: '#fff', shadowColor: '#22c55e', shadowOpacity: 0.8, shadowRadius: 6 }} />
      <View style={{ position: 'absolute', left: ex - 9, top: ey - 9, width: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', borderWidth: 3, borderColor: '#fff', shadowColor: '#ef4444', shadowOpacity: 0.8, shadowRadius: 6 }} />
    </View>
  );
}

function SpeedChart({ speeds, maxSpeed }: { speeds: number[]; maxSpeed: number }) {
  if (speeds.length < 2 || maxSpeed === 0) return null;
  const step = Math.max(1, Math.floor(speeds.length / 60));
  const bars = speeds.filter((_, i) => i % step === 0);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 48, gap: 1.5, paddingHorizontal: 2 }}>
        {bars.map((s, i) => {
          const ratio = maxSpeed > 0 ? s / maxSpeed : 0;
          return (
            <View key={i} style={{
              flex: 1,
              height: Math.max(3, ratio * 48),
              backgroundColor: getSpeedColor(ratio),
              borderRadius: 2,
              opacity: 0.85,
            }} />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 10, color: '#60a5b8' }}>inicio</Text>
        <Text style={{ fontSize: 10, color: '#60a5b8' }}>fin</Text>
      </View>
    </View>
  );
}

function ShareCard({ session, track, cardRef }: { session: Session; track: { lat: number; lng: number }[]; cardRef: any }) {
  const fmtDuration = (min: number) =>
    min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;

  const { speeds, maxSpeed: maxSpd, hasSpeedData } = computeTrackStats(track);

  const fecha = new Date(session.date).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const velocidad = session.distanceKm && session.durationMin && session.durationMin > 0
    ? ((session.distanceKm / session.durationMin) * 60).toFixed(1)
    : null;
  const spotTag = '#' + session.spot.replace(/\s+/g, '').replace(/[áéíóúÁÉÍÓÚ]/g, (c: string) =>
    ({ á:'a',é:'e',í:'i',ó:'o',ú:'u',Á:'A',É:'E',Í:'I',Ó:'O',Ú:'U' } as any)[c] || c);

  return (
    <View ref={cardRef} collapsable={false} style={sc.card}>
      {/* Barra superior */}
      <View style={sc.topBar} />

      {/* Header */}
      <View style={sc.header}>
        <View style={{ flex: 1 }}>
          <Text style={sc.brandLabel}>SUP STATUS · REMADA</Text>
          <Text style={sc.spotName}>{session.spot}</Text>
          <Text style={sc.fechaText} numberOfLines={1}>{fecha}</Text>
        </View>
        <Image source={require('../../assets/icon.png')} style={sc.logo} />
      </View>

      <View style={sc.divider} />

      {/* Mapa */}
      <View style={sc.mapWrap}>
        {track.length > 1 ? (
          <>
            <TrackMinimap track={track} size={CARD_W - 40} speeds={speeds} />
            {/* Leyenda sobre el mapa */}
            <View style={sc.mapLegend}>
              <View style={sc.legendPill}>
                <View style={[sc.legendDot, { backgroundColor: '#22c55e' }]} />
                <Text style={sc.legendTxt}>Inicio</Text>
              </View>
              <View style={sc.legendPill}>
                <View style={[sc.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={sc.legendTxt}>Fin</Text>
              </View>
              {track.length > 0 && (
                <View style={sc.legendPill}>
                  <View style={[sc.legendDot, { backgroundColor: '#0ea5e9' }]} />
                  <Text style={sc.legendTxt}>{track.length} pts GPS</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={sc.noTrack}>
            <Ionicons name="map-outline" size={28} color="#334155" />
            <Text style={{ color: '#334155', fontSize: 12, marginTop: 6 }}>Sin datos GPS</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={sc.statsRow}>
        {session.distanceKm != null && (
          <View style={[sc.statBox, { borderTopColor: '#0ea5e9' }]}>
            <Text style={sc.statEmoji}>📏</Text>
            <Text style={sc.statBig}>{session.distanceKm}</Text>
            <Text style={[sc.statUnit, { color: '#0ea5e9' }]}>KM</Text>
            <Text style={sc.statLbl}>DISTANCIA</Text>
          </View>
        )}
        {session.durationMin != null && (
          <View style={[sc.statBox, { borderTopColor: '#22c55e' }]}>
            <Text style={sc.statEmoji}>⏱️</Text>
            <Text style={sc.statBig}>{fmtDuration(session.durationMin)}</Text>
            <Text style={[sc.statUnit, { color: '#22c55e' }]}>TIEMPO</Text>
            <Text style={sc.statLbl}>DURACIÓN</Text>
          </View>
        )}
        {velocidad && (
          <View style={[sc.statBox, { borderTopColor: '#f59e0b' }]}>
            <Text style={sc.statEmoji}>🚀</Text>
            <Text style={sc.statBig}>{velocidad}</Text>
            <Text style={[sc.statUnit, { color: '#f59e0b' }]}>KM/H</Text>
            <Text style={sc.statLbl}>VEL. MEDIA</Text>
          </View>
        )}
        {hasSpeedData && maxSpd > 0 && (
          <View style={[sc.statBox, { borderTopColor: '#ef4444' }]}>
            <Text style={sc.statEmoji}>⚡</Text>
            <Text style={sc.statBig}>{maxSpd.toFixed(1)}</Text>
            <Text style={[sc.statUnit, { color: '#ef4444' }]}>KM/H</Text>
            <Text style={sc.statLbl}>VEL. MÁX.</Text>
          </View>
        )}
      </View>

      {/* Notas */}
      {session.notes ? (
        <View style={sc.notesBox}>
          <Ionicons name="chatbubble-outline" size={13} color="#0ea5e9" />
          <Text style={sc.notesText}>"{session.notes}"</Text>
        </View>
      ) : null}

      {/* Footer */}
      <View style={sc.footer}>
        <View>
          <Text style={sc.footerHandle}>@__supstatus</Text>
          <Text style={sc.footerTags}>#SUP #SUPChile #StandUpPaddle {spotTag}</Text>
        </View>
        <View style={sc.footerBadge}>
          <Text style={sc.footerBadgeText}>🏄 SUP</Text>
        </View>
      </View>

      {/* Barra inferior */}
      <View style={sc.bottomBar} />
    </View>
  );
}

export default function SessionDetailScreen({ route, navigation }: Props) {
  const { session } = route!.params;
  const insets = useSafeAreaInsets();
  const track = session.trackPoints ?? [];
  const shareCardRef = useRef<View>(null);
  const { speeds, maxSpeed, hasSpeedData } = computeTrackStats(track);

  const fmtDuration = (min: number) =>
    min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;

  const avgSpeed = session.distanceKm && session.durationMin && session.durationMin > 0
    ? ((session.distanceKm / session.durationMin) * 60).toFixed(1)
    : null;

  const fecha = new Date(session.date).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleDelete = () => {
    Alert.alert('Eliminar remada', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await api.deleteSession(session.id);
          navigation?.goBack();
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir remada' });
      }
    } catch {
      Alert.alert('Error', 'No se pudo generar la imagen para compartir.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── HERO: mapa full-width con header flotante ── */}
        <View style={styles.heroContainer}>
          {track.length > 1 ? (
            <WebView
              source={{ html: buildMapHtml(track) }}
              style={styles.heroMap}
              scrollEnabled={false}
              javaScriptEnabled
              originWhitelist={['*']}
              mixedContentMode="always"
              startInLoadingState
              renderLoading={() => (
                <View style={[styles.heroMap, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }]}>
                  <ActivityIndicator color={colors.primary} size="large" />
                </View>
              )}
            />
          ) : (
            <View style={[styles.heroMap, styles.noMapHero]}>
              <Ionicons name="map-outline" size={48} color={colors.textDim} />
              <Text style={styles.noMapText}>Sin datos GPS</Text>
            </View>
          )}

          {/* Gradiente superior — header flotante */}
          <LinearGradient
            colors={['rgba(4,14,30,0.92)', 'rgba(4,14,30,0.3)', 'transparent']}
            style={[styles.heroTopGrad, { paddingTop: insets.top + 8 }]}
          >
            <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
                <Ionicons name="share-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.25)' }]}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Gradiente inferior — spot + fecha */}
          <LinearGradient
            colors={['transparent', 'rgba(4,14,30,0.75)', 'rgba(4,14,30,0.97)']}
            style={styles.heroBottomGrad}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="location" size={13} color={colors.primary} />
              <Text style={styles.heroSpot}>{session.spot}</Text>
            </View>
            <Text style={styles.heroDate}>{fecha}</Text>
          </LinearGradient>
        </View>

        {/* ── STATS PRINCIPALES ── */}
        <View style={styles.statsRow}>
          {session.distanceKm != null && (
            <StatPill icon="📏" value={`${session.distanceKm}`} unit="km" label="Distancia" accent={colors.primary} />
          )}
          {session.durationMin != null && (
            <StatPill icon="⏱️" value={fmtDuration(session.durationMin)} unit="" label="Duración" accent={colors.success} />
          )}
          {avgSpeed && (
            <StatPill icon="🚀" value={avgSpeed} unit="km/h" label="Vel. media" accent={colors.warning} />
          )}
        </View>

        {/* ── FILA SECUNDARIA ── */}
        {(hasSpeedData || track.length > 0) && (
          <View style={styles.secondaryRow}>
            {hasSpeedData && maxSpeed > 0 && (
              <View style={styles.secondaryChip}>
                <Text style={styles.secondaryChipEmoji}>⚡</Text>
                <View>
                  <Text style={styles.secondaryChipValue}>{maxSpeed.toFixed(1)} km/h</Text>
                  <Text style={styles.secondaryChipLabel}>Vel. máxima</Text>
                </View>
              </View>
            )}
            {track.length > 0 && (
              <View style={styles.secondaryChip}>
                <Text style={styles.secondaryChipEmoji}>📍</Text>
                <View>
                  <Text style={styles.secondaryChipValue}>{track.length}</Text>
                  <Text style={styles.secondaryChipLabel}>Puntos GPS</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── VELOCIDAD ── */}
        {hasSpeedData && speeds.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Velocidad</Text>
            <View style={styles.sectionCard}>
              <SpeedChart speeds={speeds} maxSpeed={maxSpeed} />
              <View style={styles.speedLegend}>
                {[
                  { color: '#38bdf8', label: 'Lento' },
                  { color: '#10b981', label: 'Medio' },
                  { color: '#f59e0b', label: 'Rápido' },
                  { color: '#ef4444', label: 'Sprint' },
                ].map(l => (
                  <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: l.color }} />
                    <Text style={styles.speedLegendText}>{l.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── NOTAS ── */}
        {session.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <View style={[styles.sectionCard, { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }]}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={styles.notesText}>{session.notes}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 + insets.bottom }} />
      </ScrollView>

      {/* Tarjeta invisible para compartir */}
      <View style={{ position: 'absolute', left: 0, top: 0, opacity: 0 }} pointerEvents="none">
        <ShareCard session={session} track={track} cardRef={shareCardRef} />
      </View>
    </View>
  );
}

function StatPill({ icon, value, unit, label, accent }: { icon: string; value: string; unit: string; label: string; accent: string }) {
  return (
    <View style={[styles.statPill, { borderTopColor: accent }]}>
      <Text style={styles.statPillEmoji}>{icon}</Text>
      <Text style={styles.statPillValue}>{value}</Text>
      {unit ? <Text style={[styles.statPillUnit, { color: accent }]}>{unit}</Text> : null}
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Hero
  heroContainer: { width, height: MAP_H + 60, position: 'relative' },
  heroMap: { width, height: MAP_H + 60, backgroundColor: colors.bg },
  noMapHero: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  noMapText: { color: colors.textDim, fontSize: 14 },
  heroTopGrad: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 110,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  actionBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroBottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 20, paddingTop: 50 },
  heroSpot: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  heroDate: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize', marginTop: 2 },

  // Stats principales
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16 },
  statPill: { flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, padding: 14, alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: colors.border },
  statPillEmoji: { fontSize: 18, marginBottom: 6 },
  statPillValue: { fontSize: 19, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  statPillUnit: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 1 },
  statPillLabel: { fontSize: 10, color: colors.textDim, marginTop: 4, fontWeight: '600' },

  // Fila secundaria
  secondaryRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 10 },
  secondaryChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface1, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  secondaryChipEmoji: { fontSize: 20 },
  secondaryChipValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  secondaryChipLabel: { fontSize: 11, color: colors.textDim, marginTop: 1 },

  // Secciones
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.textDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  sectionCard: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border },
  notesText: { flex: 1, color: colors.textSecondary, lineHeight: 22, fontSize: 14 },
  speedLegend: { flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' },
  speedLegendText: { fontSize: 10, color: colors.textDim },
});

// Estilos tarjeta Instagram
const sc = StyleSheet.create({
  card: { width: CARD_W, backgroundColor: '#040e1e' },
  topBar: { height: 5, backgroundColor: '#0ea5e9' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
  brandLabel: { fontSize: 10, fontWeight: '800', color: '#0ea5e9', letterSpacing: 2.5, marginBottom: 6 },
  spotName: { fontSize: 30, fontWeight: '900', color: '#f1f5f9', lineHeight: 34, letterSpacing: -0.5 },
  fechaText: { fontSize: 13, color: '#64748b', marginTop: 6, textTransform: 'capitalize' },
  logo: { width: 54, height: 54, borderRadius: 13, marginLeft: 14, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#0f172a', marginHorizontal: 22 },
  mapWrap: { marginHorizontal: 20, marginTop: 16, marginBottom: 4, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1e293b' },
  mapLegend: { position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', gap: 6 },
  legendPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(4,14,30,0.85)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { color: '#94a3b8', fontSize: 10, fontWeight: '700' },
  noTrack: { height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: '#060f1e' },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, gap: 10, marginTop: 16 },
  statBox: { flex: 1, backgroundColor: '#060f1e', borderRadius: 14, padding: 14, alignItems: 'center', borderTopWidth: 3, borderTopColor: '#0ea5e9', borderWidth: 1, borderColor: '#1e293b' },
  statEmoji: { fontSize: 22, marginBottom: 6 },
  statBig: { fontSize: 20, fontWeight: '900', color: '#f1f5f9', letterSpacing: -0.5 },
  statUnit: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
  statLbl: { fontSize: 9, color: '#334155', marginTop: 4, letterSpacing: 0.8, fontWeight: '700' },
  notesBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginTop: 14, backgroundColor: '#060f1e', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#0ea5e9' },
  notesText: { flex: 1, color: '#94a3b8', fontSize: 13, fontStyle: 'italic', lineHeight: 19 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 16, paddingBottom: 14, marginTop: 8, borderTopWidth: 1, borderTopColor: '#0f172a' },
  footerHandle: { color: '#0ea5e9', fontWeight: '900', fontSize: 15, letterSpacing: 0.3 },
  footerTags: { color: '#334155', fontSize: 10, marginTop: 3 },
  footerBadge: { backgroundColor: '#0f172a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#1e293b' },
  footerBadgeText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  bottomBar: { height: 5, backgroundColor: '#0ea5e9', opacity: 0.4 },
});

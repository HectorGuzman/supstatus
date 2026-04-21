import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Dimensions, Image, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Gradient as LinearGradient } from '../components/Gradient';
import { Ionicons } from '@expo/vector-icons';
import SpotSelector from '../components/SpotSelector';
import { subscribeSpots } from '../services/spots';
import { ForecastBlock, ForecastData, Marea, Spot } from '../types';
import { colors, difficultyStyle, radius, spacing } from '../theme';

const { width } = Dimensions.get('window');

function WindArrow({ degrees, size = 56 }: { degrees: number; size?: number }) {
  const cardinals = [
    { label: 'N', angle: 0 },
    { label: 'E', angle: 90 },
    { label: 'S', angle: 180 },
    { label: 'O', angle: 270 },
  ];
  const fontSize = Math.max(7, size * 0.14);
  const labelRadius = size * 0.37;
  const half = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[StyleSheet.absoluteFill, {
        borderRadius: size / 2,
        backgroundColor: colors.surface2,
        borderWidth: 1,
        borderColor: colors.border,
      }]} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
        const rad = (angle - 90) * Math.PI / 180;
        const isMajor = angle % 90 === 0;
        const tickLen = isMajor ? size * 0.09 : size * 0.05;
        const r1 = half - 2;
        const r2 = r1 - tickLen;
        return (
          <View key={angle} style={{
            position: 'absolute',
            width: isMajor ? 2 : 1,
            height: tickLen,
            backgroundColor: isMajor ? colors.border : colors.surface3,
            borderRadius: 1,
            left: half + r2 * Math.cos(rad) - (isMajor ? 1 : 0.5),
            top: half + r2 * Math.sin(rad),
            transform: [{ rotate: `${angle}deg` }],
          }} />
        );
      })}
      {cardinals.map(({ label, angle }) => {
        const rad = (angle - 90) * Math.PI / 180;
        return (
          <Text key={label} style={{
            position: 'absolute',
            left: half + labelRadius * Math.cos(rad) - fontSize * 0.45,
            top: half + labelRadius * Math.sin(rad) - fontSize * 0.6,
            fontSize,
            fontWeight: '800',
            color: label === 'N' ? '#ef4444' : colors.textMuted,
            letterSpacing: -0.5,
          }}>{label}</Text>
        );
      })}
      <View style={{
        position: 'absolute',
        width: size * 0.1,
        height: size * 0.46,
        transform: [{ rotate: `${degrees}deg` }],
        overflow: 'hidden',
        borderRadius: size * 0.05,
      }}>
        <View style={{ flex: 1, backgroundColor: colors.primary, borderTopLeftRadius: size * 0.05, borderTopRightRadius: size * 0.05 }} />
        <View style={{ flex: 1, backgroundColor: colors.surface3, borderBottomLeftRadius: size * 0.05, borderBottomRightRadius: size * 0.05 }} />
      </View>
      <View style={{
        width: size * 0.18,
        height: size * 0.18,
        borderRadius: size * 0.09,
        backgroundColor: colors.bg,
        borderWidth: 2,
        borderColor: colors.primary,
      }} />
    </View>
  );
}

function getHeroBlock(blocks: ForecastBlock[], useCurrentTime: boolean): ForecastBlock {
  if (!blocks.length) return blocks[0];
  if (!useCurrentTime) return blocks[0];
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  return blocks.reduce((closest, block) => {
    const [h, m] = block.hora.split(':').map(Number);
    const blockMin = h * 60 + (m || 0);
    const [ch, cm] = closest.hora.split(':').map(Number);
    const closestMin = ch * 60 + (cm || 0);
    return Math.abs(blockMin - currentMin) < Math.abs(closestMin - currentMin) ? block : closest;
  });
}

function getBestBlock(blocks: ForecastBlock[]): ForecastBlock | null {
  if (!blocks.length) return null;
  const order = ['Principiante', 'Intermedio', 'Avanzado', 'Experto'];
  return [...blocks].sort((a, b) => order.indexOf(a.nivel) - order.indexOf(b.nivel))[0];
}

function RangeChip({ icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.rangeChip, highlight && { borderColor: colors.warning + '60', backgroundColor: colors.warning + '10' }]}>
      <Ionicons name={icon} size={11} color={highlight ? colors.warning : colors.textMuted} />
      <Text style={[styles.rangeChipLabel, highlight && { color: colors.warning }]}>{label}</Text>
      <Text style={[styles.rangeChipValue, highlight && { color: colors.warning }]}>{value}</Text>
    </View>
  );
}

function CardStat({ icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={15} color={colors.textSecondary} />
      <Text style={styles.statValue}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ForecastCard({ block, isHero, allBlocks }: { block: ForecastBlock; isHero?: boolean; allBlocks?: ForecastBlock[] }) {
  const diff = difficultyStyle[block.nivel] ?? difficultyStyle['Principiante'];

  let minTemp: string | null = null, maxTemp: string | null = null;
  let minViento: string | null = null, maxViento: string | null = null;
  let best: ForecastBlock | null = null;

  if (isHero && allBlocks?.length) {
    const temps = allBlocks.map(b => parseFloat(b.temperatura));
    const vientos = allBlocks.map(b => parseFloat(b.viento));
    minTemp = Math.min(...temps).toFixed(1);
    maxTemp = Math.max(...temps).toFixed(1);
    minViento = Math.min(...vientos).toFixed(1);
    maxViento = Math.max(...vientos).toFixed(1);
    best = getBestBlock(allBlocks);
  }

  return (
    <View style={[styles.card, isHero && styles.heroCard]}>
      <LinearGradient
        colors={isHero ? ['#0c2035', '#071828'] : ['#0d2035', '#091828']}
        style={styles.cardGradient}
      >
        {/* Header: time + condition + badge */}
        <View style={styles.cardTop}>
          <View style={{ flex: 1, marginRight: 10 }}>
            {isHero
              ? <Text style={styles.heroLabel}>AHORA · {block.hora}</Text>
              : <Text style={styles.cardHora}>{block.hora}</Text>
            }
            <Text style={styles.cardCondicion}>{block.condiciones}</Text>
          </View>
          <View style={[styles.cardBadge, { backgroundColor: diff.bg, borderColor: diff.color + '50' }]}>
            <Text style={[styles.cardBadgeText, { color: diff.color }]}>{block.nivel}</Text>
          </View>
        </View>

        {/* Stats row — same layout for all cards */}
        <View style={styles.statsRow}>
          <CardStat icon="speedometer-outline" label="Viento" value={block.viento} sub={block.direccionViento} />
          <View style={styles.statDivider} />
          <CardStat icon="water-outline" label="Oleaje" value={block.oleaje} sub={block.direccionOleaje} />
          <View style={styles.statDivider} />
          <CardStat icon="thermometer-outline" label="Agua" value={block.temperatura} />
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <WindArrow degrees={(block.direccionVientoGrados + 180) % 360} size={isHero ? 52 : 44} />
            <Text style={styles.statLabel}>Dirección</Text>
          </View>
        </View>

        {/* Range chips — hero only */}
        {isHero && minTemp && (
          <View style={styles.rangeRow}>
            <RangeChip icon="thermometer-outline" label="Temp. hoy" value={`${minTemp}° – ${maxTemp}°C`} />
            <RangeChip icon="navigate-outline" label="Viento hoy" value={`${minViento} – ${maxViento} km/h`} />
            {best && best.hora !== block.hora && (
              <RangeChip icon="star-outline" label="Mejor hora" value={best.hora} highlight />
            )}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

function MareasSection({ mareas }: { mareas: Marea[] }) {
  if (!mareas || mareas.length === 0) {
    return (
      <View style={styles.mareasEmpty}>
        <Ionicons name="analytics-outline" size={22} color={colors.textMuted} />
        <Text style={styles.mareasEmptyText}>Sin datos de mareas disponibles</Text>
      </View>
    );
  }

  const maxAltura = Math.max(...mareas.map(m => m.altura));

  return (
    <View style={styles.mareasCard}>
      <LinearGradient colors={['#0d2035', '#091828']} style={styles.mareasGradient}>
        <View style={styles.mareasHeader}>
          <Ionicons name="analytics-outline" size={16} color={colors.primary} />
          <Text style={styles.mareasTitle}>Mareas del día</Text>
        </View>
        <View style={styles.mareasBars}>
          {mareas.map((m, i) => {
            const heightPct = m.altura / maxAltura;
            const isAlta = m.tipo === 'alta';
            return (
              <View key={i} style={styles.mareaItem}>
                <Text style={[styles.mareaAltura, { color: isAlta ? colors.primary : colors.textMuted }]}>
                  {m.altura.toFixed(1)}m
                </Text>
                <View style={styles.mareaBarContainer}>
                  <View style={[
                    styles.mareaBar,
                    {
                      height: Math.max(8, heightPct * 60),
                      backgroundColor: isAlta ? colors.primary : colors.surface3,
                      borderColor: isAlta ? colors.primary + '60' : colors.border,
                    }
                  ]} />
                </View>
                <Text style={styles.mareaHora}>{m.hora}</Text>
                <View style={[styles.mareaTipoBadge, { backgroundColor: isAlta ? colors.primary + '20' : colors.surface2 }]}>
                  <Text style={[styles.mareaTipoText, { color: isAlta ? colors.primary : colors.textMuted }]}>
                    {isAlta ? '↑ Alta' : '↓ Baja'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

export default function ForecastScreen() {
  const insets = useSafeAreaInsets();
  const heroRef = useRef<View>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [data, setData] = useState<ForecastData | null>(null);
  const [day, setDay] = useState<'hoy' | 'mañana'>('hoy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => subscribeSpots(s => {
    if (s.length > 0) setSelectedSpot(prev => prev ?? s[0]);
  }), []);

  useEffect(() => {
    if (selectedSpot) {
      setLoading(true); setError(null);
      fetchData(selectedSpot).catch(e => setError(e.message)).finally(() => setLoading(false));
    }
  }, [selectedSpot]);

  const fetchData = async (spot: Spot) => {
    const res = await fetch(`${spot.dataUrl}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setData(await res.json());
  };

  const onRefresh = async () => {
    if (!selectedSpot) return;
    setRefreshing(true);
    await fetchData(selectedSpot).catch(() => {});
    setRefreshing(false);
  };

  const blocks: ForecastBlock[] = data ? (data[day] ?? []) : [];

  const shareConditions = async () => {
    if (!blocks.length) return;
    try {
      if (heroRef.current) {
        const uri = await captureRef(heroRef, { format: 'png', quality: 0.95 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir condiciones' });
          return;
        }
      }
    } catch {}
    const b = getHeroBlock(blocks, day === 'hoy');
    await Share.share({
      message: `🏄 SUP Status — ${selectedSpot?.nombre ?? ''}\n\n📍 ${b.hora}\n💨 ${b.viento} ${b.direccionViento}\n🌊 ${b.oleaje}\n\n${b.condiciones}`,
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#071828', '#040e1e']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.appBrand}>
            <Image source={require('../../assets/icon.png')} style={styles.brandLogo} />
            <View>
              <Text style={styles.appName}>SUP Status</Text>
              <Text style={styles.appSub}>Condiciones del agua</Text>
            </View>
          </View>
          <TouchableOpacity onPress={shareConditions} disabled={!blocks.length} style={{ opacity: blocks.length ? 1 : 0.3 }}>
            <Ionicons name="share-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <SpotSelector selected={selectedSpot} onSelect={setSelectedSpot} />
        <View style={styles.dayPicker}>
          {(['hoy', 'mañana'] as const).map(d => (
            <TouchableOpacity key={d} onPress={() => setDay(d)} style={[styles.dayBtn, day === d && styles.dayBtnActive]}>
              {day === d && <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.full }]} />}
              <Text style={[styles.dayBtnText, day === d && styles.dayBtnTextActive]}>
                {d === 'hoy' ? 'Hoy' : 'Mañana'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {data?.generado && (
          <Text style={styles.generadoText}>Actualizado: {data.generado}</Text>
        )}
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Cargando condiciones...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorText}>Sin conexión</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {blocks.length > 0 && (
            <View ref={heroRef} collapsable={false}>
              <ForecastCard
                block={getHeroBlock(blocks, day === 'hoy')}
                isHero
                allBlocks={blocks}
              />
            </View>
          )}

          {data && (
            <>
              <Text style={styles.sectionTitle}>Mareas del día</Text>
              <MareasSection mareas={data.mareas} />
            </>
          )}

          <Text style={styles.sectionTitle}>Pronóstico por hora</Text>
          {blocks.map((block, i) => <ForecastCard key={i} block={block} />)}

          <View style={{ height: 80 + insets.bottom }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  appBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 44, height: 44, borderRadius: 10 },
  appName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  appSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  dayPicker: { flexDirection: 'row', marginTop: spacing.sm, backgroundColor: colors.surface2, borderRadius: radius.full, padding: 3 },
  dayBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.full, overflow: 'hidden' },
  dayBtnActive: {},
  dayBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  dayBtnTextActive: { color: '#fff' },
  generadoText: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
  scrollContent: { paddingTop: spacing.md },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  errorText: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.full, marginTop: 8 },
  retryText: { color: '#fff', fontWeight: '700' },

  // Cards
  card: { marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  heroCard: { borderColor: 'rgba(14,165,233,0.3)', marginBottom: spacing.md },
  cardGradient: { padding: spacing.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  heroLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  cardHora: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  cardCondicion: { fontSize: 14, color: colors.textPrimary, fontWeight: '500', lineHeight: 20 },
  cardBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  cardBadgeText: { fontSize: 12, fontWeight: '700' },

  // Stats row
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.surface1, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  statItem: { alignItems: 'center', gap: 3, flex: 1 },
  statValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  statSub: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  statLabel: { fontSize: 10, color: colors.textMuted },
  statDivider: { width: 1, backgroundColor: colors.border },

  // Range chips
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rangeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface2, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.border },
  rangeChipLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  rangeChipValue: { fontSize: 10, color: colors.textSecondary, fontWeight: '700' },

  // Mareas
  mareasCard: { marginHorizontal: spacing.md, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  mareasGradient: { padding: spacing.md },
  mareasHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  mareasTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  mareasBars: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  mareaItem: { alignItems: 'center', gap: 4 },
  mareaAltura: { fontSize: 12, fontWeight: '700' },
  mareaBarContainer: { height: 70, justifyContent: 'flex-end' },
  mareaBar: { width: 28, borderRadius: 6, borderWidth: 1 },
  mareaHora: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  mareaTipoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  mareaTipoText: { fontSize: 10, fontWeight: '700' },
  mareasEmpty: { marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface1, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  mareasEmptyText: { fontSize: 13, color: colors.textMuted },
});

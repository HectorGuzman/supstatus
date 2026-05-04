export const RANK_THRESHOLDS = [
  { min: 1000, key: 'leyendaDeLosMaress', icon: '🏆' },
  { min: 550,  key: 'maestroDelRemo',     icon: '🧙' },
  { min: 280,  key: 'tiburonDeBahia',     icon: '🦈' },
  { min: 140,  key: 'loboDeMar',          icon: '🐺' },
  { min: 70,   key: 'buscaolas',          icon: '🌊' },
  { min: 30,   key: 'remadorDeDomingo',   icon: '😎' },
  { min: 10,   key: 'aprendizMojado',     icon: '💦' },
  { min: 0,    key: 'polloDelSup',        icon: '🐔' },
];

export function computeRank(totalKm: number, totalSessions: number) {
  const score = totalKm + totalSessions * 5;
  return RANK_THRESHOLDS.find(r => score >= r.min) ?? RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
}

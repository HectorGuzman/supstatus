export const colors = {
  bg: '#040e1e',
  surface1: '#071828',
  surface2: '#0c2035',
  surface3: '#122844',
  border: '#1a3550',
  borderLight: '#1e4060',

  primary: '#0ea5e9',
  primaryLight: '#38bdf8',
  primaryDark: '#0284c7',
  primaryGlow: 'rgba(14,165,233,0.15)',

  success: '#10b981',
  successGlow: 'rgba(16,185,129,0.15)',
  warning: '#f59e0b',
  warningGlow: 'rgba(245,158,11,0.15)',
  danger: '#ef4444',
  dangerGlow: 'rgba(239,68,68,0.15)',
  purple: '#a855f7',
  purpleGlow: 'rgba(168,85,247,0.15)',

  textPrimary: '#f0f9ff',
  textSecondary: '#7dd3fc',
  textMuted: '#3d6680',
  textDim: '#1e4060',
};

export const gradients = {
  ocean: ['#040e1e', '#071828'] as const,
  card: ['#0c2035', '#071828'] as const,
  primary: ['#0ea5e9', '#0284c7'] as const,
  success: ['#10b981', '#059669'] as const,
  warning: ['#f59e0b', '#d97706'] as const,
  danger: ['#ef4444', '#dc2626'] as const,
  hero: ['#071828', '#0c2035', '#071828'] as const,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  primary: {
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const difficultyStyle: Record<string, { color: string; bg: string; gradient: readonly [string, string] }> = {
  Principiante: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', gradient: ['#10b981', '#059669'] },
  Intermedio:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', gradient: ['#f59e0b', '#d97706'] },
  Avanzado:     { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  gradient: ['#ef4444', '#dc2626'] },
};

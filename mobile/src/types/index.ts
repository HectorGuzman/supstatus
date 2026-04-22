export interface ForecastBlock {
  hora: string;
  viento: string;
  direccionViento: string;
  direccionVientoGrados: number;
  oleaje: string;
  direccionOleaje: string;
  temperatura: string;
  condiciones: string;
  nivel: string;
}

export interface Marea {
  hora: string;
  altura: number;
  tipo: 'alta' | 'baja';
}

export interface ForecastData {
  hoy: ForecastBlock[];
  'mañana': ForecastBlock[];
  mareas: Marea[];
  generado: string;
}

export interface Spot {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  dataUrl: string;
}

export interface Session {
  id: string;
  distanceKm: number;
  durationMin: number;
  spot: string;
  date: string;
  notes?: string;
  mediaUrl?: string;
  trackPoints?: { lat: number; lng: number; timestamp: number }[];
}

export interface Story {
  id: string;
  body: string;
  authorUid?: string;
  authorName: string;
  authorAvatar?: string;
  spot?: string;
  mediaUrl?: string;
  likeCount: number;
  likedByMe?: boolean;
  featured: boolean;
  commentCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  authorUid: string;
  authorName?: string;
  authorAvatar?: string;
  text: string;
  createdAt: string | null;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  nivel: string;
  disciplina?: string;
  disciplinas?: string[];
  tabla?: string;
  boardSetup?: string;
  remo?: string;
  bio?: string;
  equipo?: string;
  objetivos?: string;
  focoEntrenamiento?: string;
  isAdmin?: boolean;
  sessionsSummary?: {
    totalKm: number;
    totalDurationMin: number;
    totalSessions: number;
  };
}

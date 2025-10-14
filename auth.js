import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDdk4ZjSGeyzO5pmlasJ672iF1BdhDtaCI',
  authDomain: 'supstatus-c1ab5.firebaseapp.com',
  projectId: 'supstatus-c1ab5',
  storageBucket: 'supstatus-c1ab5.firebasestorage.app',
  messagingSenderId: '858880938649',
  appId: '1:858880938649:web:7340bdd7f957a078ac1e08',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://sup-experience-backend-mhhf2ac76q-ue.a.run.app';

const authButton = document.getElementById('auth-button');
const profileModal = document.getElementById('profile-modal');
const profileEmail = document.getElementById('profile-email');
const profileLinkButton = document.getElementById('profile-link');
const displayNameInput = document.getElementById('profile-displayName');
const bioInput = document.getElementById('profile-bio');
const goalsInput = document.getElementById('profile-goals');
const experienceLevelSelect = document.getElementById('profile-experienceLevel');
const favoriteDisciplineSelect = document.getElementById('profile-favoriteDiscipline');
const boardSetupInput = document.getElementById('profile-boardSetup');
const practiceFocusInput = document.getElementById('profile-practiceFocus');
const saveButton = document.getElementById('profile-save');
const statusLabel = document.getElementById('profile-status');
const greetingLabel = document.getElementById('auth-greeting');
const adminSection = document.getElementById('admin-section');
const adminProfileList = document.getElementById('admin-profile-list');
const adminMetrics = document.getElementById('admin-metrics');
const storyBodyInput = document.getElementById('story-body');
const storyMediaFileInput = document.getElementById('story-media-input');
const storyMediaRemoveButton = document.getElementById('story-media-remove');
const storyMediaStatus = document.getElementById('story-media-status');
const storyMediaPreviewWrapper = document.getElementById('story-media-preview-wrapper');
const storyMediaPreview = document.getElementById('story-media-preview');
const storySaveButton = document.getElementById('story-save');
const storyResetButton = document.getElementById('story-reset');
const storyStatusLabel = document.getElementById('story-status');
const storyMetaLabel = document.getElementById('story-meta');
const storyLocationButton = document.getElementById('story-location-button');
const storyLocationClearButton = document.getElementById('story-location-clear');
const storyLocationStatus = document.getElementById('story-location-status');
const storyLocationSuggestionsContainer = document.getElementById('story-location-suggestions');
const userStoryList = document.getElementById('user-story-list');
const userStoryCountLabel = document.getElementById('user-story-count');
const sessionOpenButton = document.getElementById('session-open-modal');
const sessionGlobalOpenButton = document.getElementById('session-global-open');
const sessionSection = document.getElementById('session-section');
const sessionMetricsLabel = document.getElementById('session-metrics');
const sessionRankLabel = document.getElementById('session-rank');
const sessionListElement = document.getElementById('session-list');
const sessionStatusLabel = document.getElementById('session-status');
const sessionModal = document.getElementById('session-modal');
const sessionModalCloseButton = document.getElementById('session-modal-close');
const sessionSaveButton = document.getElementById('session-save');
const sessionResetButton = document.getElementById('session-reset');
const sessionModalStatus = document.getElementById('session-modal-status');
const sessionTabButtons = Array.from(document.querySelectorAll('[data-session-tab]'));
const sessionTabPanels = Array.from(document.querySelectorAll('[data-session-panel]'));
const sessionStartInput = document.getElementById('session-start');
const sessionSpotInput = document.getElementById('session-spot');
const sessionDistanceInput = document.getElementById('session-distance');
const sessionDurationInput = document.getElementById('session-duration');
const sessionNotesInput = document.getElementById('session-notes');
const sessionTrackingStatus = document.getElementById('session-tracking-status');
const sessionTrackingDistanceLabel = document.getElementById('session-tracking-distance');
const sessionTrackingDurationLabel = document.getElementById('session-tracking-duration');
const sessionTrackingPointsLabel = document.getElementById('session-tracking-points');
const sessionTrackingStartButton = document.getElementById('session-tracking-start');
const sessionTrackingStopButton = document.getElementById('session-tracking-stop');
const sessionTrackingResetButton = document.getElementById('session-tracking-reset');
const sessionDetailModal = document.getElementById('session-detail-modal');
const sessionDetailCloseButton = document.getElementById('session-detail-close');
const sessionDetailTitle = document.getElementById('session-detail-title');
const sessionDetailSummary = document.getElementById('session-detail-summary');
const sessionDetailNotes = document.getElementById('session-detail-notes');
const sessionDetailStatus = document.getElementById('session-detail-status');
const sessionDetailShareButton = document.getElementById('session-detail-share');
const sessionDetailCanvas = document.getElementById('session-detail-canvas');
const sessionDetailMapHint = document.getElementById('session-detail-map-hint');
const avatarInput = document.getElementById('profile-avatar-input');
const avatarPreview = document.getElementById('profile-avatar-preview');
const avatarStatus = document.getElementById('profile-avatar-status');
const headerAvatarImg = document.getElementById('auth-header-avatar');

const authModal = document.getElementById('auth-modal');
const googleLoginBtn = document.getElementById('google-login-btn');
const emailLoginBtn = document.getElementById('email-login-btn');
const resetPasswordBtn = document.getElementById('reset-password-btn');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const authError = document.getElementById('auth-error');
const authSubscribers = new Set();

const defaultGreeting = '🌊 Conecta tu perfil SUP y guarda tus remadas favoritas';
const DEFAULT_AVATAR_SRC = 'logosupstatus.png';
const AVATAR_MAX_SIZE = 3 * 1024 * 1024; // 3 MB
const STORY_MEDIA_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const DEFAULT_SPOT_SUGGESTIONS = [
  'Sesión libre de SUP',
  'Explorando un nuevo spot',
  'Entrenamiento en lago o río',
  'Downwind con amigos',
  'Yoga SUP o equilibrio',
  'Competencia o race day',
];
const STORY_MEDIA_MAX_DIMENSION = 1600; // px
const STORY_MEDIA_DEFAULT_QUALITY = 0.85;
const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const LOCATION_PERMISSION_HELP = isAppleDevice
  ? 'Abre Ajustes > Privacidad > Localización y permite el acceso a Safari para obtener sugerencias automáticas.'
  : 'Revisa los permisos de ubicación del navegador (icono de candado) y vuelve a intentarlo permitiendo el acceso.';
if (greetingLabel) greetingLabel.textContent = defaultGreeting;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function formatCoordinate(value, type) {
  const abs = Math.abs(value).toFixed(2);
  const suffix = type === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'O';
  return `${abs}°${suffix}`;
}

function describeHemisphere(lat) {
  if (Math.abs(lat) < 5) return 'cerca del ecuador';
  if (lat >= 0) {
    if (lat > 45) return 'hemisferio norte · latitudes frías';
    if (lat > 23.5) return 'hemisferio norte · zona templada';
    return 'hemisferio norte · zona tropical';
  }
  if (lat < -45) return 'hemisferio sur · latitudes frías';
  if (lat < -23.5) return 'hemisferio sur · zona templada';
  return 'hemisferio sur · zona tropical';
}

function buildLocationSuggestions(lat, lon) {
  const latLabel = formatCoordinate(lat, 'lat');
  const lonLabel = formatCoordinate(lon, 'lon');
  return [
    {
      name: `Coordenadas detectadas (${latLabel}, ${lonLabel})`,
      note: 'Edita el spot si prefieres un nombre propio.',
    },
    {
      name: 'Sesión en progreso',
      note: describeHemisphere(lat),
    },
    {
      name: 'Compartir spot favorito',
      note: 'Describe el lugar en tu historia para inspirar a otros.',
    },
  ];
}

function buildStoryHistoryExcerpt(text = '', maxLength = 120) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
}

function buildStoryHistoryTitle(story) {
  if (!story) return 'Historia SUP';
  if (typeof story.title === 'string' && story.title.trim().length) return story.title.trim();
  if (typeof story.spot === 'string' && story.spot.trim().length) return `Historia en ${story.spot.trim()}`;
  return 'Historia SUP';
}

function storyStatusBadge(status) {
  switch (status) {
    case 'pending':
      return '⏳ En revisión';
    case 'archived':
      return '🗃 Archivada';
    default:
      return null;
  }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDurationMinutes(minutes) {
  if (!Number.isFinite(minutes)) return '0 min';
  const totalMinutes = Math.max(0, minutes);
  if (totalMinutes < 60) return `${Math.round(totalMinutes)} min`;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = Math.round(totalMinutes % 60);
  return `${hours} h ${remainingMinutes} min`;
}

function formatDurationClock(ms) {
  const totalMs = Math.max(0, ms);
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

let currentUser = null;
let currentToken = null;
let currentProfileData = {};
let currentIsAdmin = false;
let isSaving = false;
let avatarPreviewObjectUrl = null;
let isUploadingAvatar = false;
let currentUserStories = [];
let currentUserSessions = [];
let isSavingStory = false;
let storyStatusTimeout = null;
let currentStoryMediaUrl = '';
let storyMediaUploading = false;
let storyMediaPreviewUrl = null;
let storySelectedSpot = '';
let storyLocationSuggestions = [];
let storyLocationLoading = false;
let storyLocationCoords = null;
const deletingStoryIds = new Set();
let isSavingSession = false;
let sessionStatusTimeout = null;
let sessionActiveTab = 'manual';
let isTrackingSession = false;
let trackingWatchId = null;
let trackingIntervalId = null;
let trackingStartTime = null;
let trackingDistanceKm = 0;
let trackingPoints = [];
let activeSessionDetail = null;

function resetAvatarPreviewUrl() {
  if (avatarPreviewObjectUrl) {
    URL.revokeObjectURL(avatarPreviewObjectUrl);
    avatarPreviewObjectUrl = null;
  }
}

function setAvatarPreview(src) {
  if (!avatarPreview) return;
  avatarPreview.src = src || DEFAULT_AVATAR_SRC;
}

function setHeaderAvatar(src) {
  if (!headerAvatarImg) return;
  headerAvatarImg.src = src || DEFAULT_AVATAR_SRC;
  headerAvatarImg.classList.toggle('has-custom', Boolean(src));
}

function syncAvatarFromProfile(profile) {
  resetAvatarPreviewUrl();
  const src = profile?.avatarUrl || DEFAULT_AVATAR_SRC;
  setAvatarPreview(src);
  setHeaderAvatar(profile?.avatarUrl || '');
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

async function loadImageFromFile(file) {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return { image: bitmap, width: bitmap.width, height: bitmap.height, isBitmap: true };
    } catch (error) {
      console.warn('[stories] createImageBitmap falló, usando Image()', error);
    }
  }
  const dataUrl = await readFileAsDataURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, width: image.naturalWidth, height: image.naturalHeight, isBitmap: false });
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function prepareImageForUpload(file) {
  try {
    let workingFile = file;
    const heicConverter = globalThis.heic2any;
    const isHeic = /\.hei[cf]$/i.test(file.name || '') || file.type === 'image/heic' || file.type === 'image/heif';
    let convertedFromHeic = false;
    if (heicConverter && isHeic) {
      if (storyMediaStatus) storyMediaStatus.textContent = 'Convirtiendo HEIC…';
      const convertedBlob = await heicConverter({ blob: file, toType: 'image/jpeg', quality: STORY_MEDIA_DEFAULT_QUALITY });
      workingFile = new File([convertedBlob], `${(file.name?.split?.('.')?.[0] || 'story')}.jpg`, { type: 'image/jpeg' });
      convertedFromHeic = true;
    } else if (isHeic) {
      console.warn('[stories] Navegador sin soporte para heic2any.');
      if (storyMediaStatus) storyMediaStatus.textContent = 'Tu navegador no puede convertir HEIC. Usa formato JPG o ajusta la cámara.';
      return file;
    }

    const { image, width, height, isBitmap } = await loadImageFromFile(workingFile);
    const scale = Math.min(STORY_MEDIA_MAX_DIMENSION / width, STORY_MEDIA_MAX_DIMENSION / height, 1);
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);
    const shouldResize = scale < 1;
    const shouldCompress = workingFile.size > STORY_MEDIA_MAX_SIZE;
    const needsProcessing = convertedFromHeic || shouldResize || shouldCompress;
    if (!needsProcessing) {
      if (isBitmap && typeof image.close === 'function') {
        image.close();
      }
      return workingFile;
    }
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return workingFile;
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    if (isBitmap && typeof image.close === 'function') {
      image.close();
    }
    const needsResize = shouldResize || shouldCompress;
    const qualities = needsResize ? [STORY_MEDIA_DEFAULT_QUALITY, 0.75, 0.65, 0.55] : [STORY_MEDIA_DEFAULT_QUALITY];
    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      if (!blob) continue;
      if (blob.size <= STORY_MEDIA_MAX_SIZE || quality === qualities[qualities.length - 1]) {
        const optimizedName = `${(workingFile.name?.split?.('.')?.[0] || 'story')}-optimized.jpg`;
        return new File([blob], optimizedName, { type: 'image/jpeg' });
      }
    }
    return workingFile;
  } catch (error) {
    console.warn('[stories] No se pudo optimizar la imagen, usando original.', error);
    return file;
  }
}

function buildReadableUploadError(error, fallback = 'No se pudo subir la foto.') {
  if (!error || typeof error !== 'object') return fallback;
  const code = typeof error.code === 'string' ? error.code : '';
  if (code.includes('unauthorized')) {
    return 'Tu cuenta no tiene permisos para subir archivos. Revisa que tu sesión siga activa.';
  }
  if (code.includes('quota-exceeded')) {
    return 'Se alcanzó el límite de almacenamiento. Intenta nuevamente más tarde.';
  }
  if (code.includes('cancelled')) {
    return 'La subida fue cancelada antes de finalizar.';
  }
  if (code.includes('retry-limit-exceeded')) {
    return 'La conexión falló varias veces. Comprueba tu señal y vuelve a intentarlo.';
  }
  return fallback;
}

function renderStoryLocationState(statusOverride) {
  if (storyLocationButton) {
    storyLocationButton.disabled = storyLocationLoading;
    storyLocationButton.textContent = storyLocationLoading ? '📍 Obteniendo ubicación…' : '📍 Obtener sugerencias cercanas';
  }
  if (storyLocationClearButton) {
    const shouldShow = Boolean(storySelectedSpot || storyLocationSuggestions.length);
    storyLocationClearButton.style.display = shouldShow ? 'inline-flex' : 'none';
    storyLocationClearButton.disabled = storyLocationLoading;
  }
  if (storyLocationStatus) {
    if (statusOverride) {
      storyLocationStatus.textContent = statusOverride;
    } else if (storyLocationLoading) {
      storyLocationStatus.textContent = 'Solicitando tu ubicación…';
    } else if (storyLocationSuggestions.length) {
      storyLocationStatus.textContent = storySelectedSpot
        ? `Usaremos: ${storySelectedSpot}. Puedes elegir otro si prefieres.`
        : 'Selecciona el spot que mejor describe tu historia.';
    } else if (storySelectedSpot) {
      storyLocationStatus.textContent = `Usaremos: ${storySelectedSpot}`;
    } else {
      storyLocationStatus.textContent = 'Puedes agregar un spot para tu historia o elegir una de las opciones sugeridas.';
    }
  }
  if (storyLocationSuggestionsContainer) {
    if (!storyLocationSuggestions.length) {
      storyLocationSuggestionsContainer.innerHTML = DEFAULT_SPOT_SUGGESTIONS
        .map((name) => {
          const safeName = escapeHtml(name);
          const encodedName = encodeURIComponent(name);
          const selected = storySelectedSpot === name ? 'selected' : '';
          return `<button type="button" data-spot="${escapeHtml(encodedName)}" class="${selected}">${safeName}</button>`;
        })
        .join('');
    } else {
      storyLocationSuggestionsContainer.innerHTML = storyLocationSuggestions
        .map((suggestion) => {
          const selected = suggestion.name === storySelectedSpot ? 'selected' : '';
          const safeName = escapeHtml(suggestion.name);
          const encodedName = encodeURIComponent(suggestion.name);
          const note = suggestion.note && suggestion.note.trim().length
            ? ` · ${escapeHtml(suggestion.note)}`
            : '';
          return `<button type="button" data-spot="${escapeHtml(encodedName)}" class="${selected}">${safeName}${note}</button>`;
        })
        .join('');
    }
  }
}

function selectStorySpot(spotName) {
  if (!spotName) {
    storySelectedSpot = '';
  } else if (storySelectedSpot === spotName) {
    storySelectedSpot = '';
  } else {
    storySelectedSpot = spotName;
  }
  renderStoryLocationState();
}

function handleStoryLocationSuccess(position) {
  const { latitude, longitude } = position.coords;
  storyLocationCoords = { latitude, longitude };
  const geoSuggestions = buildLocationSuggestions(latitude, longitude);
  const fallback = DEFAULT_SPOT_SUGGESTIONS.filter(
    (name) => !geoSuggestions.some((spot) => spot.name === name),
  ).slice(0, Math.max(0, 3 - geoSuggestions.length))
    .map((name) => ({ name, note: '' }));
  storyLocationSuggestions = [...geoSuggestions, ...fallback];
  if (!storySelectedSpot && storyLocationSuggestions.length) {
    storySelectedSpot = storyLocationSuggestions[0].name;
  }
  storyLocationLoading = false;
  renderStoryLocationState();
}

function handleStoryLocationError(error) {
  console.error('[stories] geolocation error', error);
  storyLocationCoords = null;
  storyLocationSuggestions = [];
  storyLocationLoading = false;
  let message = 'No pudimos obtener tu ubicación.';
  switch (error.code) {
    case error.PERMISSION_DENIED:
      message = `No pudimos obtener tu ubicación (permiso denegado). ${LOCATION_PERMISSION_HELP}`;
      break;
    case error.POSITION_UNAVAILABLE:
      message = 'La información de ubicación no está disponible.';
      break;
    case error.TIMEOUT:
      message = 'La solicitud de ubicación tardó demasiado.';
      break;
  }
  renderStoryLocationState(`${message} Selecciona un spot sugerido de la lista.`);
}

async function ensureLocationPermissionAvailable() {
  if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') {
    return true;
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    if (status.state === 'denied') {
      renderStoryLocationState(`No pudimos acceder a tu ubicación porque el permiso está bloqueado. ${LOCATION_PERMISSION_HELP}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[stories] geolocation permissions query failed', error);
    return true;
  }
}

async function requestStoryLocation() {
  if (!navigator.geolocation) {
    renderStoryLocationState('Tu navegador no soporta geolocalización.');
    return;
  }
  if (!window.isSecureContext) {
    renderStoryLocationState('Activa HTTPS o usa localhost para compartir tu ubicación.');
    return;
  }
  const canRequest = await ensureLocationPermissionAvailable();
  if (!canRequest) return;
  storyLocationLoading = true;
  renderStoryLocationState();
  navigator.geolocation.getCurrentPosition(handleStoryLocationSuccess, handleStoryLocationError, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 300000,
  });
}

renderStoryLocationState();
renderUserStoriesList();

function revokeStoryMediaPreview() {
  if (storyMediaPreviewUrl) {
    URL.revokeObjectURL(storyMediaPreviewUrl);
    storyMediaPreviewUrl = null;
  }
}

function setStoryMediaPreview(url) {
  if (!storyMediaPreviewWrapper || !storyMediaPreview) return;
  if (url) {
    storyMediaPreview.src = url;
    storyMediaPreviewWrapper.style.display = 'block';
  } else {
    storyMediaPreview.src = '';
    storyMediaPreviewWrapper.style.display = 'none';
  }
}

function updateStoryMediaUI(url) {
  currentStoryMediaUrl = url || '';
  revokeStoryMediaPreview();
  setStoryMediaPreview(currentStoryMediaUrl);
  if (storyMediaStatus) storyMediaStatus.textContent = '';
  if (storyMediaRemoveButton) {
    if (currentStoryMediaUrl) {
      storyMediaRemoveButton.disabled = false;
    } else {
      storyMediaRemoveButton.disabled = true;
    }
  }
}

function setStoryMediaFromStory(story) {
  const url = story?.mediaUrl || '';
  updateStoryMediaUI(url);
  if (storyMediaStatus) {
    storyMediaStatus.textContent = url ? 'Foto guardada.' : '';
  }
}

function clearStoryMediaSelection() {
  updateStoryMediaUI('');
  if (storyMediaFileInput) storyMediaFileInput.value = '';
}

function clearStoryStatusMessage() {
  if (storyStatusTimeout) {
    window.clearTimeout(storyStatusTimeout);
    storyStatusTimeout = null;
  }
  if (storyStatusLabel) {
    storyStatusLabel.textContent = '';
  }
}

function clearSessionStatusMessage() {
  if (sessionStatusTimeout) {
    window.clearTimeout(sessionStatusTimeout);
    sessionStatusTimeout = null;
  }
  if (sessionStatusLabel) {
    sessionStatusLabel.textContent = '';
  }
  if (sessionModalStatus) {
    sessionModalStatus.textContent = '';
  }
}

function fillStoryForm(story = null) {
  storySelectedSpot = story?.spot || '';
  storyLocationSuggestions = [];
  storyLocationCoords = null;
  storyLocationLoading = false;
  renderStoryLocationState();
  if (storyBodyInput) storyBodyInput.value = story?.body || '';
  setStoryMediaFromStory(story);
  clearStoryStatusMessage();
}

function resetStoryForm() {
  fillStoryForm(null);
}

function storyStatusCopy(status) {
  switch (status) {
    case 'published':
      return 'Publicada ✅. Tu historia ya es visible para toda la comunidad.';
    case 'archived':
      return 'Archivada 💤. Edita tu comentario y vuelve a enviarlo cuando quieras.';
    case 'pending':
    default:
      return 'En revisión ✍️. El equipo revisará tu comentario antes de publicarlo.';
  }
}

function updateStoryMetaSummary() {
  if (!storyMetaLabel) return;
  const total = currentUserStories.length;
  if (!total) {
    storyMetaLabel.textContent = 'Estado: sin historia aún. Comparte un comentario para inspirar a otros remadores.';
    return;
  }
  const latest = currentUserStories[0];
  const statusMessage = latest ? storyStatusCopy(latest.status) : '';
  const updatedLabel = latest ? formatDateTime(latest.updatedAt || latest.createdAt) : '';
  const countCopy = total === 1 ? 'Has compartido 1 historia.' : `Has compartido ${total} historias.`;
  if (updatedLabel && statusMessage) {
    storyMetaLabel.textContent = `${countCopy} ${statusMessage} · Última actualización ${updatedLabel}`;
  } else if (statusMessage) {
    storyMetaLabel.textContent = `${countCopy} ${statusMessage}`;
  } else {
    storyMetaLabel.textContent = countCopy;
  }
}

function renderUserStoriesList() {
  if (!userStoryList) return;
  userStoryList.innerHTML = '';
  const total = currentUserStories.length;
  if (userStoryCountLabel) userStoryCountLabel.textContent = String(total);
  if (!total) {
    userStoryList.innerHTML = '<p class="story-history-empty">Aún no has compartido historias.</p>';
    return;
  }

  currentUserStories.forEach((story) => {
    if (!story?.id) return;
    const item = document.createElement('article');
    item.className = 'story-history-item';
    const title = buildStoryHistoryTitle(story);
    const dateLabel = formatDateTime(story.updatedAt || story.publishedAt || story.createdAt);
    const excerpt = buildStoryHistoryExcerpt(story.body || '');
    const metaChips = [];
    if (story.spot) {
      metaChips.push(`📍 ${story.spot}`);
    }
    if (story.status) {
      const statusLabel = storyStatusBadge(story.status);
      if (statusLabel) {
        metaChips.push(statusLabel);
      }
    }
    const metaHtml = metaChips.length
      ? `<div class="story-history-meta">${metaChips
        .map((chip) => `<span class="story-history-chip">${escapeHtml(chip)}</span>`).join('')}</div>`
      : '';
    const excerptHtml = excerpt ? `<p>${escapeHtml(excerpt)}</p>` : '';
    const dateHtml = dateLabel ? `<span class="story-history-date">${escapeHtml(dateLabel)}</span>` : '';

    item.innerHTML = `
      <div class="story-history-top">
        <strong>${escapeHtml(title)}</strong>
        ${dateHtml}
      </div>
      ${metaHtml}
      ${excerptHtml}
      <div class="story-history-actions">
        <button type="button" class="story-history-delete" data-story-delete="${escapeHtml(story.id)}">🗑 Eliminar</button>
      </div>
    `;
    userStoryList.appendChild(item);
  });
}

async function handleStoryDelete(storyId) {
  if (!currentUser || !currentToken) {
    if (storyStatusLabel) storyStatusLabel.textContent = 'Inicia sesión para gestionar tus historias.';
    storyStatusTimeout = window.setTimeout(() => clearStoryStatusMessage(), 4000);
    return;
  }
  if (!storyId || deletingStoryIds.has(storyId)) return;
  const confirmation = window.confirm('¿Quieres eliminar esta historia? Esta acción no se puede deshacer.');
  if (!confirmation) return;
  deletingStoryIds.add(storyId);
  clearStoryStatusMessage();
  if (storyStatusLabel) storyStatusLabel.textContent = 'Eliminando historia…';
  try {
    await deleteStoryRequest(currentToken, storyId);
    currentUserStories = currentUserStories.filter((story) => story.id !== storyId);
    renderUserStoriesList();
    updateStoryMetaSummary();
    window.dispatchEvent(new CustomEvent('story-deleted', { detail: { storyId } }));
    if (typeof loadStories === 'function') {
      try {
        loadStories(true);
      } catch (error) {
        console.warn('[stories] error refreshing stories after delete', error);
      }
    }
    if (storyStatusLabel) storyStatusLabel.textContent = 'Historia eliminada correctamente.';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar la historia.';
    if (storyStatusLabel) storyStatusLabel.textContent = message;
  } finally {
    deletingStoryIds.delete(storyId);
    storyStatusTimeout = window.setTimeout(() => clearStoryStatusMessage(), 4000);
  }
}

function computeSessionRank(totalKm) {
  if (totalKm >= 200) return '🌟 Leyenda SUP (200+ km)';
  if (totalKm >= 100) return '✨ Explorador avanzado (100+ km)';
  if (totalKm >= 50) return '⭐ Explorador SUP (50+ km)';
  if (totalKm >= 20) return '🔥 Remador constante (20+ km)';
  if (totalKm > 0) return '🚀 Primeras remadas (1+ km)';
  return 'Sin remadas registradas.';
}

function renderSessionMetrics() {
  if (!sessionMetricsLabel) return;
  const totalSessions = currentUserSessions.length;
  const totalDistance = currentUserSessions.reduce((acc, session) => acc + (Number(session.distanceKm) || 0), 0);
  const totalDuration = currentUserSessions.reduce((acc, session) => acc + (Number(session.durationMin) || 0), 0);
  const distanceLabel = `${totalDistance.toFixed(2)} km`;
  const durationLabel = formatDurationMinutes(totalDuration);
  sessionMetricsLabel.textContent = `${distanceLabel} · ${totalSessions} sesiones · ${durationLabel}`;
  if (sessionRankLabel) {
    sessionRankLabel.textContent = computeSessionRank(totalDistance);
  }
}

function renderSessionList() {
  if (!sessionListElement) return;
  sessionListElement.innerHTML = '';
  renderSessionMetrics();
  if (!currentUserSessions.length) {
    sessionListElement.innerHTML = '<p class="session-status">Aún no registras remadas.</p>';
    return;
  }
  currentUserSessions
    .map((session) => {
      const startedAt = session.startedAt || session.createdAt;
      const startedDate = startedAt ? new Date(startedAt) : null;
      const sortKey = startedDate && !Number.isNaN(startedDate.getTime()) ? startedDate.getTime() : 0;
      return { session, sortKey };
    })
    .sort((a, b) => b.sortKey - a.sortKey)
    .forEach(({ session }) => {
      const item = document.createElement('article');
      item.className = 'session-item';
      const startedDate = session.startedAt ? formatDateTime(session.startedAt) : session.createdAt ? formatDateTime(session.createdAt) : '';
      const hasStartedLabel = startedDate && startedDate !== 'N/A';
      const distance = Number(session.distanceKm) || 0;
      const duration = Number(session.durationMin) || 0;
      const distanceLabel = `${distance.toFixed(2)} km`;
      const durationLabel = formatDurationMinutes(duration);
      const spot = session.spot ? `📍 ${session.spot}` : '';
      const notes = session.conditionsNote ? `<p>${escapeHtml(session.conditionsNote)}</p>` : '';
    item.innerHTML = `
      <div class="session-item-top">
        <strong>${escapeHtml(session.title || session.spot || 'Remada SUP')}</strong>
        ${hasStartedLabel ? `<span>${escapeHtml(startedDate)}</span>` : ''}
      </div>
      <span>${escapeHtml(distanceLabel)} · ${escapeHtml(durationLabel)}</span>
      ${spot ? `<span>${escapeHtml(spot)}</span>` : ''}
      ${notes}
      <div class="session-item-actions">
        <button type="button" class="session-item-view" data-session-id="${escapeHtml(session.id || '')}">👀 Ver detalle</button>
      </div>
    `;
      sessionListElement.appendChild(item);
    });
}


async function shareSessionAsStory(session) {
  if (!currentUser || !currentToken) {
    window.supAuth?.openAuthModal?.();
    return;
  }
  sessionDetailShareButton?.setAttribute('disabled', 'true');
  const originalShareText = sessionDetailShareButton?.textContent;
  if (sessionDetailShareButton) sessionDetailShareButton.textContent = 'Publicando…';
  if (sessionDetailStatus) sessionDetailStatus.textContent = 'Creando historia a partir de tu remada…';
  try {
    const distance = Number(session.distanceKm) || 0;
    const duration = Number(session.durationMin) || 0;
    const startedAt = session.startedAt || session.createdAt;
    const startedLabel = startedAt ? formatDateTime(startedAt) : '';
    const summaryParts = [];
    if (distance) summaryParts.push(`${distance.toFixed(2)} km`);
    if (duration) summaryParts.push(formatDurationMinutes(duration));
    const bodyLines = [];
    if (summaryParts.length) {
      bodyLines.push(`Remada de ${summaryParts.join(' · ')}`);
    }
    if (session.spot) {
      bodyLines.push(`Spot: ${session.spot}`);
    }
    if (startedLabel && startedLabel !== 'N/A') {
      bodyLines.push(`Fecha: ${startedLabel}`);
    }
    if (session.conditionsNote) {
      bodyLines.push('Notas: ' + session.conditionsNote);
    }
    if (!bodyLines.length) {
      bodyLines.push('Compartiendo mi remada SUP 🏄');
    }
    const mediaUrl = generateSessionImage(session);
    const payload = {
      body: bodyLines.join('\n'),
      spot: session.spot || undefined,
      mediaUrl: mediaUrl || undefined,
      bestConditions: summaryParts.length ? summaryParts.join(' · ') : undefined,
    };
    const story = await saveStoryRequest(currentToken, payload);
    if (story) {
      currentUserStories = [story, ...currentUserStories];
      renderUserStoriesList();
      updateStoryMetaSummary();
      loadStories(true);
      window.dispatchEvent(new CustomEvent('story-saved'));
      if (storyStatusLabel) {
        storyStatusLabel.textContent = 'Historia creada a partir de tu remada.';
        storyStatusTimeout = window.setTimeout(() => clearStoryStatusMessage(), 4000);
      }
      if (sessionDetailStatus) sessionDetailStatus.textContent = 'Historia publicada. ¡Gracias por compartir!';
      closeSessionDetail();
    } else if (sessionDetailStatus) {
      sessionDetailStatus.textContent = 'No se pudo crear la historia.';
    }
  } catch (error) {
    console.error('[sessions] share error', error);
    const message = error instanceof Error ? error.message : 'No se pudo crear la historia.';
    if (sessionDetailStatus) sessionDetailStatus.textContent = message;
  }
  sessionDetailShareButton?.removeAttribute('disabled');
  if (originalShareText && sessionDetailShareButton) sessionDetailShareButton.textContent = originalShareText;
}

function openSessionDetail(sessionId) {
  const session = currentUserSessions.find((item) => item.id === sessionId);
  if (!session || !sessionDetailModal) return;
  activeSessionDetail = session;
  renderSessionDetail(session);
  sessionDetailModal.style.display = 'flex';
}

function closeSessionDetail() {
  if (sessionDetailModal) sessionDetailModal.style.display = 'none';
  activeSessionDetail = null;
  if (sessionDetailStatus) sessionDetailStatus.textContent = '';
}

function renderSessionDetail(session) {
  if (!session) return;
  if (sessionDetailTitle) {
    sessionDetailTitle.textContent = session.title || session.spot || 'Detalle de remada';
  }
  if (sessionDetailSummary) {
    const distance = Number(session.distanceKm) || 0;
    const duration = Number(session.durationMin) || 0;
    const summaryParts = [];
    if (session.spot) summaryParts.push(`📍 ${session.spot}`);
    if (distance) summaryParts.push(`🚶‍♂️ ${distance.toFixed(2)} km`);
    if (duration) summaryParts.push(`⏱ ${formatDurationMinutes(duration)}`);
    const startedAt = session.startedAt || session.createdAt;
    if (startedAt) {
      const label = formatDateTime(startedAt);
      if (label && label !== 'N/A') summaryParts.push(`🗓 ${label}`);
    }
    sessionDetailSummary.innerHTML = summaryParts.map((part) => `<span>${escapeHtml(part)}</span>`).join('');
  }
  if (sessionDetailNotes) {
    sessionDetailNotes.textContent = session.conditionsNote || 'Sin notas adicionales.';
  }
  drawSessionCanvasPreview(session);
  if (sessionDetailStatus) sessionDetailStatus.textContent = '';
}

function drawSessionCanvasPreview(session) {
  if (!sessionDetailCanvas) return;
  const ctx = sessionDetailCanvas.getContext('2d');
  if (!ctx) return;
  renderSessionArtwork(ctx, sessionDetailCanvas.width, sessionDetailCanvas.height, session);
  if (sessionDetailMapHint) {
    if (Array.isArray(session.trackPoints) && session.trackPoints.length > 1) {
      sessionDetailMapHint.textContent = 'Ruta estimada según tu seguimiento en vivo.';
    } else {
      sessionDetailMapHint.textContent = 'Registro manual (imagen generada automáticamente).';
    }
  }
}

function renderSessionArtwork(ctx, width, height, session) {
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#081d36');
  gradient.addColorStop(1, '#150b31');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const track = Array.isArray(session.trackPoints) ? session.trackPoints : [];
  if (track.length > 1) {
    const lats = track.map((p) => p.lat);
    const lons = track.map((p) => p.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const padding = 24;
    const spanLat = Math.max(maxLat - minLat, 0.0001);
    const spanLon = Math.max(maxLon - minLon, 0.0001);
    ctx.strokeStyle = 'rgba(38, 198, 218, 0.92)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    track.forEach((point, index) => {
      const x = padding + ((point.lon - minLon) / spanLon) * (width - padding * 2);
      const y = height - padding - ((point.lat - minLat) / spanLat) * (height - padding * 2);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    const drawMarker = (point, color) => {
      const x = padding + ((point.lon - minLon) / spanLon) * (width - padding * 2);
      const y = height - padding - ((point.lat - minLat) / spanLat) * (height - padding * 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    };
    drawMarker(track[0], 'rgba(255, 197, 66, 0.95)');
    drawMarker(track[track.length - 1], 'rgba(255, 115, 161, 0.95)');
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(width / 2 - 40, height / 2 - 40, 80, 80);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
    ctx.font = '26px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏄', width / 2, height / 2 + 12);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.font = 'bold 20px Poppins, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText((session.spot || 'Remada SUP').slice(0, 24), 16, 36);
  const distance = Number(session.distanceKm) || 0;
  const duration = Number(session.durationMin) || 0;
  ctx.font = '14px Poppins, sans-serif';
  ctx.fillText(`${distance.toFixed(2)} km · ${formatDurationMinutes(duration)}`, 16, 58);
}

function generateSessionImage(session) {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  renderSessionArtwork(ctx, canvas.width, canvas.height, session);
  try {
    return canvas.toDataURL('image/png', 0.92);
  } catch (error) {
    console.warn('[sessions] unable to export canvas', error);
    return null;
  }
}

function showSessionTab(tab) {
  sessionActiveTab = tab;
  sessionTabButtons.forEach((button) => {
    const isActive = button.getAttribute('data-session-tab') === tab;
    button.classList.toggle('active', isActive);
  });
  sessionTabPanels.forEach((panel) => {
    const isActive = panel.getAttribute('data-session-panel') === tab;
    panel.style.display = isActive ? 'grid' : 'none';
  });
}

function openSessionModal(tab = 'manual') {
  resetSessionForm();
  showSessionTab(tab);
  if (sessionModal) sessionModal.style.display = 'flex';
}

function closeSessionModal() {
  if (sessionModal) sessionModal.style.display = 'none';
  resetSessionTracking();
  clearSessionStatusMessage();
}

function resetSessionForm() {
  if (sessionStartInput) {
    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    sessionStartInput.value = localISO;
  }
  if (sessionSpotInput) sessionSpotInput.value = storySelectedSpot || '';
  if (sessionDistanceInput) sessionDistanceInput.value = '';
  if (sessionDurationInput) sessionDurationInput.value = '';
  if (sessionNotesInput) sessionNotesInput.value = '';
  resetSessionTracking();
  clearSessionStatusMessage();
  showSessionTab('manual');
}

function updateSessionModalStatus(message) {
  if (sessionModalStatus) sessionModalStatus.textContent = message;
}

async function saveSessionFromModal() {
  if (!currentUser || !currentToken || isSavingSession) {
    window.supAuth?.openAuthModal?.();
    return;
  }
  clearSessionStatusMessage();
  updateSessionModalStatus('Guardando remada…');
  isSavingSession = true;
  sessionSaveButton?.setAttribute('disabled', 'true');
  sessionResetButton?.setAttribute('disabled', 'true');
  try {
    const payload = buildSessionPayload();
    const session = await saveSessionRequest(currentToken, payload);
    if (session) {
      currentUserSessions = [session, ...currentUserSessions];
      renderSessionList();
    } else {
      await loadUserSessions(currentToken);
    }
    updateSessionModalStatus('Remada guardada ✓');
    sessionStatusTimeout = window.setTimeout(() => clearSessionStatusMessage(), 3000);
    closeSessionModal();
    if (session?.id) {
      window.setTimeout(() => {
        openSessionDetail(session.id);
        if (sessionDetailStatus) sessionDetailStatus.textContent = 'Tu remada está lista. Puedes compartirla como historia.';
      }, 200);
    }
    if (sessionStatusLabel) {
      sessionStatusLabel.textContent = 'Remada guardada ✓';
      sessionStatusTimeout = window.setTimeout(() => clearSessionStatusMessage(), 4000);
    }
  } catch (error) {
    console.error('[sessions] save error', error);
    const message = error instanceof Error ? error.message : 'No se pudo guardar la remada.';
    updateSessionModalStatus(message);
    sessionStatusTimeout = window.setTimeout(() => clearSessionStatusMessage(), 5000);
  } finally {
    isSavingSession = false;
    sessionSaveButton?.removeAttribute('disabled');
    sessionResetButton?.removeAttribute('disabled');
  }
}

function buildSessionPayload() {
  const payload = {};
  if (sessionActiveTab === 'tracking') {
    if (isTrackingSession) {
      stopSessionTracking();
    }
    if (!trackingPoints.length || trackingDistanceKm <= 0) {
      throw new Error('Aún no has registrado suficientes datos de seguimiento.');
    }
    const durationMs = trackingStartTime ? Date.now() - trackingStartTime : 0;
    const durationMin = durationMs / 60000;
    payload.distanceKm = Number(trackingDistanceKm.toFixed(3));
    payload.durationMin = Number(durationMin.toFixed(2));
    payload.trackPoints = trackingPoints.slice(0, 500);
    payload.startedAt = trackingStartTime ? new Date(trackingStartTime).toISOString() : new Date().toISOString();
    if (sessionSpotInput && sessionSpotInput.value.trim()) {
      payload.spot = sessionSpotInput.value.trim();
    }
    if (sessionNotesInput && sessionNotesInput.value.trim()) {
      payload.conditionsNote = sessionNotesInput.value.trim();
    }
  } else {
    const spot = sessionSpotInput?.value.trim();
    const distance = Number(sessionDistanceInput?.value || 0);
    const duration = Number(sessionDurationInput?.value || 0);
    const notes = sessionNotesInput?.value.trim();
    const startValue = sessionStartInput?.value;
    if (!distance && !duration) {
      throw new Error('Ingresa al menos distancia o duración.');
    }
    if (spot) payload.spot = spot;
    if (distance > 0) payload.distanceKm = Number(distance.toFixed(3));
    if (duration > 0) payload.durationMin = Number(duration.toFixed(2));
    if (notes) payload.conditionsNote = notes;
    if (startValue) {
      const startDate = new Date(startValue);
      if (!Number.isNaN(startDate.getTime())) {
        payload.startedAt = startDate.toISOString();
      }
    }
  }
  return payload;
}

function resetSessionTracking() {
  if (trackingWatchId) {
    navigator.geolocation.clearWatch(trackingWatchId);
    trackingWatchId = null;
  }
  if (trackingIntervalId) {
    window.clearInterval(trackingIntervalId);
    trackingIntervalId = null;
  }
  isTrackingSession = false;
  trackingStartTime = null;
  trackingDistanceKm = 0;
  trackingPoints = [];
  updateTrackingUI();
  sessionTrackingStopButton?.setAttribute('disabled', 'true');
  sessionTrackingResetButton?.setAttribute('disabled', 'true');
  if (sessionTrackingStartButton) {
    sessionTrackingStartButton.disabled = false;
    sessionTrackingStartButton.textContent = '▶️ Iniciar seguimiento';
  }
  if (sessionTrackingStatus) sessionTrackingStatus.textContent = 'Listo para iniciar seguimiento.';
}

function updateTrackingUI() {
  if (sessionTrackingDistanceLabel) {
    sessionTrackingDistanceLabel.textContent = `${trackingDistanceKm.toFixed(2)} km`;
  }
  if (sessionTrackingDurationLabel) {
    const durationMs = trackingStartTime ? Date.now() - trackingStartTime : 0;
    sessionTrackingDurationLabel.textContent = formatDurationClock(durationMs);
  }
  if (sessionTrackingPointsLabel) {
    sessionTrackingPointsLabel.textContent = String(trackingPoints.length);
  }
}

async function startSessionTracking() {
  if (isTrackingSession) return;
  if (!('geolocation' in navigator)) {
    updateSessionModalStatus('Tu navegador no soporta geolocalización.');
    return;
  }
  const canStart = await ensureLocationPermissionAvailable();
  if (!canStart) {
    updateSessionModalStatus('No pudimos acceder a la ubicación. Revisa permisos y vuelve a intentarlo.');
    return;
  }
  resetSessionTracking();
  trackingStartTime = Date.now();
  isTrackingSession = true;
  if (sessionTrackingStatus) sessionTrackingStatus.textContent = 'Seguimiento en curso…';
  if (sessionTrackingStartButton) {
    sessionTrackingStartButton.disabled = true;
    sessionTrackingStartButton.textContent = 'Grabando…';
  }
  sessionTrackingStopButton?.removeAttribute('disabled');
  sessionTrackingResetButton?.removeAttribute('disabled');
  trackingPoints = [];
  trackingDistanceKm = 0;
  updateTrackingUI();

  trackingIntervalId = window.setInterval(updateTrackingUI, 1000);

  trackingWatchId = navigator.geolocation.watchPosition((position) => {
    const { latitude, longitude } = position.coords;
    const timestamp = position.timestamp || Date.now();
    const lastPoint = trackingPoints[trackingPoints.length - 1];
    if (lastPoint) {
      const delta = haversineDistance(lastPoint.lat, lastPoint.lon, latitude, longitude);
      if (Number.isFinite(delta) && delta < 2) {
        trackingDistanceKm += delta;
      }
    }
    trackingPoints.push({ lat: latitude, lon: longitude, timestamp });
    updateTrackingUI();
  }, (error) => {
    console.warn('[sessions] tracking error', error);
    updateSessionModalStatus('Error obteniendo ubicación. Revisa permisos GPS.');
    stopSessionTracking();
  }, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 12000,
  });
}

function stopSessionTracking() {
  if (!isTrackingSession) return;
  if (trackingWatchId) {
    navigator.geolocation.clearWatch(trackingWatchId);
    trackingWatchId = null;
  }
  if (trackingIntervalId) {
    window.clearInterval(trackingIntervalId);
    trackingIntervalId = null;
  }
  isTrackingSession = false;
  if (sessionTrackingStatus) sessionTrackingStatus.textContent = 'Seguimiento detenido. Puedes ajustar los datos antes de guardar.';
  if (sessionTrackingStartButton) {
    sessionTrackingStartButton.disabled = false;
    sessionTrackingStartButton.textContent = '▶️ Iniciar seguimiento';
  }
  sessionTrackingStopButton?.setAttribute('disabled', 'true');
  updateTrackingUI();
  const totalMinutes = trackingStartTime ? (Date.now() - trackingStartTime) / 60000 : 0;
  if (sessionDistanceInput && trackingDistanceKm > 0) {
    sessionDistanceInput.value = trackingDistanceKm.toFixed(2);
  }
  if (sessionDurationInput && totalMinutes > 0) {
    sessionDurationInput.value = Math.round(totalMinutes).toString();
  }
}

function getStoryPayload() {
  const body = storyBodyInput?.value?.trim() || '';
  const payload = { body };
  if (currentStoryMediaUrl) {
    payload.mediaUrl = currentStoryMediaUrl;
  }
  if (storySelectedSpot) {
    payload.spot = storySelectedSpot.trim();
  }
  return payload;
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  try {
    return date.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  } catch (_error) {
    return date.toISOString();
  }
}

function openAuthModal() {
  if (authModal) authModal.style.display = 'flex';
  authError.textContent = '';
}

function closeAuthModal() {
  if (authModal) authModal.style.display = 'none';
}

window.closeAuthModal = closeAuthModal;
function closeProfileModal() {
  if (profileModal) profileModal.style.display = 'none';
}

window.closeProfileModal = closeProfileModal;

const supAuthGlobal = window.supAuth || {};
supAuthGlobal.getState = () => ({ token: currentToken, user: currentUser, isAdmin: currentIsAdmin });
supAuthGlobal.openAuthModal = openAuthModal;
supAuthGlobal.subscribe = (callback) => {
  if (typeof callback !== 'function') return () => {};
  authSubscribers.add(callback);
  return () => authSubscribers.delete(callback);
};
window.supAuth = supAuthGlobal;

function notifyAuthChange() {
  const detail = { token: currentToken, user: currentUser, isAdmin: currentIsAdmin };
  authSubscribers.forEach((callback) => {
    try {
      callback(detail);
    } catch (error) {
      console.error('[auth] auth subscriber error', error);
    }
  });
  window.dispatchEvent(new CustomEvent('sup-auth-changed', { detail }));
  if (sessionGlobalOpenButton) sessionGlobalOpenButton.style.display = currentUser && currentIsAdmin ? 'inline-flex' : 'none';
  if (sessionSection) sessionSection.style.display = currentUser && currentIsAdmin ? 'grid' : 'none';
}

notifyAuthChange();


if (authModal) {
  authModal.addEventListener('click', (event) => {
    if (event.target === authModal) {
      closeAuthModal();
    }
  });
}

if (profileModal) {
  profileModal.addEventListener('click', (event) => {
    if (event.target === profileModal) {
      closeProfileModal();
    }
  });
}

async function fetchProfile(token) {
  const response = await fetch(`${API_BASE_URL}/v1/profile/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.ok) {
    const data = await response.json();
    return {
      profile: data.profile || {},
      isAdmin: Boolean(data.isAdmin),
    };
  }
  if (response.status === 404) return { profile: {}, isAdmin: false };
  throw new Error('No se pudo obtener el perfil');
}

async function saveProfile(token, payload) {
  const response = await fetch(`${API_BASE_URL}/v1/profile/me`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('No se pudo guardar el perfil');
  }
  const data = await response.json();
  return {
    profile: data.profile || {},
    isAdmin: Boolean(data.isAdmin),
  };
}

async function fetchUserStories(token) {
  const response = await fetch(`${API_BASE_URL}/v1/stories/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    let detail = '';
    try {
      const errorBody = await response.json();
      detail = typeof errorBody?.error === 'string' ? ` Detalle: ${errorBody.error}` : '';
    } catch (_error) {
      // ignore parse error
    }
    const message = `No se pudieron obtener tus historias. Código ${response.status}.${detail}`;
    throw new Error(message.trim());
  }
  const data = await response.json();
  return Array.isArray(data.stories) ? data.stories : [];
}

async function saveStoryRequest(token, payload) {
  const response = await fetch(`${API_BASE_URL}/v1/stories/me`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = error?.error || 'No se pudo guardar la historia';
    throw new Error(message);
  }
  const data = await response.json();
  return data.story || null;
}

async function deleteStoryRequest(token, storyId) {
  const response = await fetch(`${API_BASE_URL}/v1/stories/me/${encodeURIComponent(storyId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = error?.error || 'No se pudo eliminar la historia';
    throw new Error(message);
  }
  return true;
}

async function fetchUserSessions(token) {
  const response = await fetch(`${API_BASE_URL}/v1/sessions/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message = detail?.error || 'No se pudieron obtener tus remadas.';
    throw new Error(message);
  }
  const data = await response.json();
  return Array.isArray(data.sessions) ? data.sessions : [];
}

async function saveSessionRequest(token, payload) {
  const response = await fetch(`${API_BASE_URL}/v1/sessions/me`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message = detail?.error || 'No se pudo guardar la remada.';
    throw new Error(message);
  }
  const data = await response.json();
  return data.session || null;
}

async function loadUserStories(token) {
  try {
    currentUserStories = await fetchUserStories(token);
    fillStoryForm(null);
    updateStoryMetaSummary();
    renderUserStoriesList();
  } catch (error) {
    console.error('[stories] error fetching user story', error);
    currentUserStories = [];
    resetStoryForm();
    updateStoryMetaSummary();
    if (storyStatusLabel) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar tus historias.';
      storyStatusLabel.textContent = message;
    }
    storyStatusTimeout = window.setTimeout(() => clearStoryStatusMessage(), 4000);
    renderUserStoriesList();
  }
}

async function loadUserSessions(token) {
  try {
    currentUserSessions = await fetchUserSessions(token);
    renderSessionList();
    clearSessionStatusMessage();
  } catch (error) {
    console.error('[sessions] error fetching sessions', error);
    currentUserSessions = [];
    renderSessionList();
    const message = error instanceof Error ? error.message : 'No se pudieron cargar tus remadas.';
    if (sessionStatusLabel) sessionStatusLabel.textContent = message;
    sessionStatusTimeout = window.setTimeout(() => clearSessionStatusMessage(), 4000);
  }
}

function setAuthButtonLoggedOut() {
  authButton.textContent = '🔐 Iniciar sesión';
  authButton.onclick = openAuthModal;
  if (greetingLabel) greetingLabel.textContent = defaultGreeting;
  if (profileLinkButton) profileLinkButton.style.display = 'none';
  if (sessionGlobalOpenButton) sessionGlobalOpenButton.style.display = 'none';
  if (sessionSection) sessionSection.style.display = 'none';
  syncAvatarFromProfile(null);
  if (avatarStatus) avatarStatus.textContent = '';
  closeProfileModal();
  currentProfileData = {};
  currentUserStories = [];
  currentUserSessions = [];
  currentIsAdmin = false;
  updateAdminVisibility();
  fillProfileForm(null);
  resetStoryForm();
  updateStoryMetaSummary();
  renderUserStoriesList();
  renderSessionList();
  notifyAuthChange();
}

function setAuthButtonLoggedIn(displayName) {
  authButton.textContent = '🚪 Cerrar sesión';
  authButton.onclick = () => signOut(auth);
  const friendlyName = displayName || 'remador/a';
  if (greetingLabel) greetingLabel.textContent = `🌊 ¡Hola, ${friendlyName}! ¿Listo para remar?`;
  if (profileLinkButton) profileLinkButton.style.display = 'flex';
  if (sessionGlobalOpenButton) sessionGlobalOpenButton.style.display = currentIsAdmin ? 'inline-flex' : 'none';
  if (sessionSection) sessionSection.style.display = currentIsAdmin ? 'grid' : 'none';
  if (currentProfileData) {
    setHeaderAvatar(currentProfileData.avatarUrl || '');
  }
}

function fillProfileForm(user, profile = {}) {
  if (!user) {
    profileEmail.textContent = '';
    displayNameInput.value = '';
    bioInput.value = '';
    if (goalsInput) goalsInput.value = '';
    if (experienceLevelSelect) experienceLevelSelect.value = '';
    if (favoriteDisciplineSelect) favoriteDisciplineSelect.value = '';
    if (boardSetupInput) boardSetupInput.value = '';
    if (practiceFocusInput) practiceFocusInput.value = '';
    statusLabel.textContent = '';
    syncAvatarFromProfile(null);
    return;
  }

  profileEmail.textContent = user.email || 'Usuario sin email';
  displayNameInput.value = profile.displayName || user.displayName || '';
  bioInput.value = profile.bio || '';
  if (goalsInput) goalsInput.value = profile.goals || '';
  if (experienceLevelSelect) experienceLevelSelect.value = profile.experienceLevel || '';
  if (favoriteDisciplineSelect) favoriteDisciplineSelect.value = profile.favoriteDiscipline || '';
  if (boardSetupInput) boardSetupInput.value = profile.boardSetup || '';
  if (practiceFocusInput) practiceFocusInput.value = profile.practiceFocus || '';
  syncAvatarFromProfile(profile);
  if (avatarStatus) avatarStatus.textContent = '';
}

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateAdminVisibility() {
  if (!adminSection) return;
  if (currentIsAdmin) {
    adminSection.style.display = 'grid';
    loadAdminProfiles();
  } else {
    adminSection.style.display = 'none';
    if (adminProfileList) adminProfileList.innerHTML = '';
    if (adminMetrics) adminMetrics.innerHTML = '';
  }
}

async function loadAdminProfiles() {
  if (!currentIsAdmin || !currentToken || !adminProfileList) return;
  try {
    const response = await fetch(`${API_BASE_URL}/v1/profile/all`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!response.ok) {
      throw new Error('No se pudo obtener la lista de perfiles.');
    }
    const data = await response.json();
    renderAdminProfiles(Array.isArray(data.profiles) ? data.profiles : []);
  } catch (error) {
    console.error('[admin] error cargando perfiles', error);
  }
}

function renderAdminProfiles(profiles) {
  if (!adminProfileList) return;
  const total = profiles.length;
  const withAvatar = profiles.filter((profile) => Boolean(profile.avatarUrl)).length;
  const withBio = profiles.filter((profile) => Boolean(profile.bio)).length;
  const withGoals = profiles.filter((profile) => Boolean(profile.goals)).length;
  let latestUpdated = null;
  profiles.forEach((profile) => {
    const updatedIso = profile?._meta?.updatedAt;
    if (!updatedIso) return;
    const updatedDate = new Date(updatedIso);
    if (Number.isNaN(updatedDate.getTime())) return;
    if (!latestUpdated || updatedDate > latestUpdated) {
      latestUpdated = updatedDate;
    }
  });
  if (adminMetrics) {
    const latestUpdatedLabel = latestUpdated ? formatDateTime(latestUpdated.toISOString()) : 'N/A';
    adminMetrics.innerHTML = `
      <div class="admin-metric-chip">
        <span class="admin-metric-label">Usuarios</span>
        <strong>${total}</strong>
      </div>
      <div class="admin-metric-chip">
        <span class="admin-metric-label">Con avatar</span>
        <strong>${withAvatar}</strong>
      </div>
      <div class="admin-metric-chip">
        <span class="admin-metric-label">Con bio</span>
        <strong>${withBio}</strong>
      </div>
      <div class="admin-metric-chip">
        <span class="admin-metric-label">Con objetivos</span>
        <strong>${withGoals}</strong>
      </div>
      <div class="admin-metric-chip">
        <span class="admin-metric-label">Último cambio</span>
        <strong>${escapeHtml(latestUpdatedLabel)}</strong>
      </div>
    `;
  }
  if (!profiles.length) {
    adminProfileList.innerHTML = '<p class="admin-hint">Sin perfiles registrados.</p>';
    return;
  }
  const items = profiles
    .sort((a, b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || ''))
    .map((profile) => {
      const email = escapeHtml(profile.email || '');
      const displayName = escapeHtml(profile.displayName || 'Sin nombre');
      const bio = profile.bio ? `<span>${escapeHtml(profile.bio)}</span>` : '';
      const goals = profile.goals ? `<span class=\"admin-goals\">🎯 ${escapeHtml(profile.goals)}</span>` : '';
      const badges = [];
      if (profile.avatarUrl) badges.push('📸 Avatar listo');
      if (profile.bio) badges.push('📝 Bio');
      if (profile.goals) badges.push('🎯 Objetivos');
      if (profile.experienceLevel) badges.push(`🏄 ${profile.experienceLevel}`);
      if (profile.favoriteDiscipline) badges.push(`🌊 ${profile.favoriteDiscipline}`);
      if (profile.boardSetup) badges.push(`🛶 ${profile.boardSetup}`);
      const badgesHtml = badges.length
        ? `<div class="admin-profile-flags">${badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join('')}</div>`
        : '';
      const createdLabel = formatDateTime(profile?._meta?.createdAt);
      const updatedLabel = formatDateTime(profile?._meta?.updatedAt);
      const metaHtml = `<div class="admin-profile-meta"><span>Creado: ${escapeHtml(createdLabel)}</span><span>Actualizado: ${escapeHtml(updatedLabel)}</span></div>`;
      return `<div class="admin-profile-card"><strong>${displayName}</strong><span>${email}</span>${bio}${goals}${badgesHtml}${metaHtml}</div>`;
    })
    .join('');
  adminProfileList.innerHTML = items;
}

saveButton?.addEventListener('click', async () => {
  if (!currentUser || !currentToken || isSaving) return;
  isSaving = true;
  statusLabel.textContent = 'Guardando…';
  saveButton.disabled = true;
  try {
    const payload = {
      displayName: displayNameInput.value.trim(),
      bio: bioInput.value.trim(),
      goals: goalsInput ? goalsInput.value.trim() : '',
      experienceLevel: experienceLevelSelect ? experienceLevelSelect.value : '',
      favoriteDiscipline: favoriteDisciplineSelect ? favoriteDisciplineSelect.value : '',
      boardSetup: boardSetupInput ? boardSetupInput.value.trim() : '',
      practiceFocus: practiceFocusInput ? practiceFocusInput.value.trim() : '',
    };
    const { profile, isAdmin } = await saveProfile(currentToken, payload);
    statusLabel.textContent = 'Perfil actualizado ✓';
    currentProfileData = profile;
    currentIsAdmin = Boolean(isAdmin);
    updateAdminVisibility();
    if (currentIsAdmin) loadAdminProfiles();
    fillProfileForm(currentUser, profile);
  } catch (error) {
    console.error(error);
    statusLabel.textContent = 'No se pudo guardar el perfil.';
  } finally {
    isSaving = false;
    saveButton.disabled = false;
  }
});

storyResetButton?.addEventListener('click', (event) => {
  event.preventDefault();
  fillStoryForm(null);
  clearStoryStatusMessage();
});

storyLocationButton?.addEventListener('click', async (event) => {
  event.preventDefault();
  if (storyLocationLoading) return;
  await requestStoryLocation();
});

storyLocationClearButton?.addEventListener('click', (event) => {
  event.preventDefault();
  if (storyLocationLoading) return;
  storySelectedSpot = '';
  storyLocationSuggestions = [];
  storyLocationCoords = null;
  renderStoryLocationState();
});

storyLocationSuggestionsContainer?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-spot]');
  if (!button) return;
  event.preventDefault();
  let decoded = button.dataset.spot || '';
  try {
    decoded = decodeURIComponent(decoded);
  } catch (_error) {
    // ignore decode errors
  }
  selectStorySpot(decoded.trim());
});

userStoryList?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-story-delete]');
  if (!button) return;
  event.preventDefault();
  const storyId = button.getAttribute('data-story-delete');
  if (storyId) {
    handleStoryDelete(storyId);
  }
});

sessionListElement?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-session-id]');
  if (!button) return;
  event.preventDefault();
  const sessionId = button.getAttribute('data-session-id');
  if (sessionId) openSessionDetail(sessionId);
});

sessionOpenButton?.addEventListener('click', () => {
  if (!currentUser || !currentToken) {
    window.supAuth?.openAuthModal?.();
    return;
  }
  openSessionModal('manual');
});

sessionGlobalOpenButton?.addEventListener('click', () => {
  if (!currentUser || !currentToken) {
    window.supAuth?.openAuthModal?.();
    return;
  }
  openSessionModal('manual');
});

sessionTabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const tab = button.getAttribute('data-session-tab');
    if (tab) showSessionTab(tab);
  });
});

sessionModalCloseButton?.addEventListener('click', closeSessionModal);
sessionModal?.addEventListener('click', (event) => {
  if (event.target === sessionModal) {
    closeSessionModal();
  }
});

sessionResetButton?.addEventListener('click', (event) => {
  event.preventDefault();
  resetSessionForm();
  closeSessionModal();
});

sessionSaveButton?.addEventListener('click', async (event) => {
  event.preventDefault();
  await saveSessionFromModal();
});

sessionTrackingStartButton?.addEventListener('click', async () => {
  await startSessionTracking();
});

sessionTrackingStopButton?.addEventListener('click', () => {
  stopSessionTracking();
});

sessionTrackingResetButton?.addEventListener('click', () => {
  resetSessionTracking();
});

sessionDetailCloseButton?.addEventListener('click', closeSessionDetail);
sessionDetailModal?.addEventListener('click', (event) => {
  if (event.target === sessionDetailModal) {
    closeSessionDetail();
  }
});

sessionDetailShareButton?.addEventListener('click', async () => {
  if (!activeSessionDetail) return;
  await shareSessionAsStory(activeSessionDetail);
});

storySaveButton?.addEventListener('click', async () => {
  if (!currentUser || !currentToken || isSavingStory || storyMediaUploading || storyLocationLoading) {
    if (storyMediaUploading && storyStatusLabel) {
      storyStatusLabel.textContent = 'Espera a que la foto termine de subir.';
    } else if (storyLocationLoading && storyStatusLabel) {
      storyStatusLabel.textContent = 'Espera a que se carguen las sugerencias de ubicación.';
    }
    return;
  }
  const payload = getStoryPayload();
  if (!payload.body || payload.body.length < 10) {
    if (storyStatusLabel) storyStatusLabel.textContent = 'Comparte al menos 10 caracteres sobre tu experiencia.';
    storyBodyInput?.focus();
    return;
  }
  clearStoryStatusMessage();
  isSavingStory = true;
  if (storyStatusLabel) storyStatusLabel.textContent = 'Guardando historia…';
  storySaveButton.disabled = true;
  storyResetButton?.setAttribute('disabled', 'true');
  storyMediaFileInput?.setAttribute('disabled', 'true');
  try {
    const story = await saveStoryRequest(currentToken, payload);
    if (story) {
      currentUserStories = [story, ...currentUserStories];
      renderUserStoriesList();
    }
    fillStoryForm(null);
    updateStoryMetaSummary();
    if (storyStatusLabel) storyStatusLabel.textContent = 'Tu historia está publicada. ¡Gracias por compartirla!';
    storyStatusTimeout = window.setTimeout(() => clearStoryStatusMessage(), 5000);
    loadStories(true);
    window.dispatchEvent(new CustomEvent('story-saved'));
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'No se pudo guardar la historia.';
    if (storyStatusLabel) storyStatusLabel.textContent = message;
  } finally {
    isSavingStory = false;
    storySaveButton.disabled = false;
    storyResetButton?.removeAttribute('disabled');
    storyMediaFileInput?.removeAttribute('disabled');
  }
});

storyMediaFileInput?.addEventListener('change', async (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;
  if (!currentUser || !currentToken) {
    if (storyMediaStatus) storyMediaStatus.textContent = 'Inicia sesión para subir una foto.';
    storyMediaFileInput.value = '';
    return;
  }
  if (!file.type.startsWith('image/')) {
    if (storyMediaStatus) storyMediaStatus.textContent = 'Selecciona un archivo de imagen válido.';
    storyMediaFileInput.value = '';
    return;
  }
  if (file.size > STORY_MEDIA_MAX_SIZE * 6) {
    if (storyMediaStatus) storyMediaStatus.textContent = 'La imagen es muy pesada. Prueba con una versión más liviana.';
    storyMediaFileInput.value = '';
    return;
  }
  if (storyMediaUploading) {
    storyMediaFileInput.value = '';
    return;
  }

  const previousUrl = currentStoryMediaUrl || '';
  storyMediaUploading = true;
  if (storyMediaStatus) storyMediaStatus.textContent = 'Preparando foto…';
  storyMediaFileInput.disabled = true;
  storyMediaRemoveButton?.setAttribute('disabled', 'true');
  revokeStoryMediaPreview();

  let processedFile = file;
  try {
    processedFile = await prepareImageForUpload(file);
  } catch (error) {
    console.warn('[stories] Error optimizando imagen', error);
  }

  storyMediaPreviewUrl = URL.createObjectURL(processedFile);
  setStoryMediaPreview(storyMediaPreviewUrl);

  const nameFromFile = (processedFile.name || file.name || '').split('.').pop();
  const baseExtension = typeof nameFromFile === 'string' && nameFromFile.length ? nameFromFile.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const inferredExtension = baseExtension || (processedFile.type === 'image/png' ? 'png' : 'jpg');
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `stories/${currentUser.uid}/media/${uniqueSuffix}.${inferredExtension}`;
  const fileRef = storageRef(storage, storagePath);
  try {
    if (storyMediaStatus) storyMediaStatus.textContent = 'Subiendo foto…';
    await uploadBytes(fileRef, processedFile, {
      contentType: processedFile.type || file.type || 'image/jpeg',
      cacheControl: 'public,max-age=3600',
    });
    const downloadUrl = await getDownloadURL(fileRef);
    updateStoryMediaUI(downloadUrl);
    if (storyMediaStatus) storyMediaStatus.textContent = processedFile === file ? 'Foto lista ✓' : 'Foto optimizada ✓';
  } catch (error) {
    console.error(error);
    updateStoryMediaUI(previousUrl);
    if (storyMediaStatus) storyMediaStatus.textContent = buildReadableUploadError(error);
  } finally {
    storyMediaUploading = false;
    storyMediaFileInput.disabled = false;
    storyMediaFileInput.value = '';
    if (currentStoryMediaUrl) {
      storyMediaRemoveButton?.removeAttribute('disabled');
    } else {
      storyMediaRemoveButton?.setAttribute('disabled', 'true');
    }
  }
});

storyMediaRemoveButton?.addEventListener('click', (event) => {
  event.preventDefault();
  if (storyMediaUploading) return;
  clearStoryMediaSelection();
  if (storyMediaStatus) storyMediaStatus.textContent = 'Foto quitada.';
});

googleLoginBtn?.addEventListener('click', async () => {
  authError.textContent = '';
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    closeAuthModal();
  } catch (error) {
    console.error(error);
    authError.textContent = 'No se pudo iniciar sesión con Google.';
  }
});


resetPasswordBtn?.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  if (!email) {
    authError.textContent = 'Ingresa tu correo para recuperar la contraseña.';
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    authError.textContent = 'Te enviamos un correo para restablecer tu contraseña.';
  } catch (error) {
    console.error(error);
    authError.textContent = 'No pudimos enviar el correo de recuperación.';
  }
});

emailLoginBtn?.addEventListener('click', async () => {
  authError.textContent = '';
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    authError.textContent = "Ingresa email y contraseña.";
    return;
  }

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    if (!user.emailVerified) {
      authError.textContent = "Confirma tu correo desde el enlace que te enviamos.";
      try {
        await sendEmailVerification(user);
      } catch (verifyError) {
        console.error(verifyError);
      }
    }
    closeAuthModal();
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await sendEmailVerification(user);
          authError.textContent = "Revisa tu correo y confirma tu cuenta.";
        } catch (verifyErr) {
          console.error(verifyErr);
          authError.textContent = "Cuenta creada. No pudimos enviar la verificación, vuelve a intentarlo más tarde.";
        }
        closeAuthModal();
      } catch (createError) {
        console.error(createError);
        authError.textContent = 'No se pudo crear la cuenta.';
      }
    } else if (error.code === 'auth/email-not-verified') {
      authError.textContent = 'Confirma tu correo desde el enlace que te enviamos.';
    } else {
      console.error(error);
      authError.textContent = 'Credenciales inválidas.';
    }
  }
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    setAuthButtonLoggedOut();
    currentToken = null;
    return;
  }

  try {
    setAuthButtonLoggedIn('');
    currentToken = await user.getIdToken();
    notifyAuthChange();
    const { profile, isAdmin } = await fetchProfile(currentToken);
    currentProfileData = profile;
    currentIsAdmin = Boolean(isAdmin);
    updateAdminVisibility();
    if (currentIsAdmin) loadAdminProfiles();
    const nameToShow = profile.displayName || user.displayName || '';
    setAuthButtonLoggedIn(nameToShow);
    fillProfileForm(user, profile);
    notifyAuthChange();
    await loadUserStories(currentToken);
    await loadUserSessions(currentToken);
  } catch (error) {
    console.error(error);
    statusLabel.textContent = 'No se pudo cargar tu perfil.';
  }
});

renderStoryLocationState();
updateStoryMetaSummary();
renderSessionList();

profileLinkButton?.addEventListener('click', () => {
  if (!currentUser) return;
  fillProfileForm(currentUser, currentProfileData || {});
  fillStoryForm(null);
  updateAdminVisibility();
  if (currentIsAdmin) loadAdminProfiles();
  if (profileModal) profileModal.style.display = 'flex';
});

avatarInput?.addEventListener('change', async (event) => {
  if (!avatarInput) return;
  const file = event.target?.files?.[0];
  if (!file) return;
  if (!currentUser || !currentToken) {
    if (avatarStatus) avatarStatus.textContent = 'Inicia sesión para subir una foto.';
    avatarInput.value = '';
    return;
  }
  if (!file.type.startsWith('image/')) {
    if (avatarStatus) avatarStatus.textContent = 'Selecciona un archivo de imagen válido.';
    avatarInput.value = '';
    return;
  }
  if (file.size > AVATAR_MAX_SIZE) {
    if (avatarStatus) avatarStatus.textContent = 'La imagen debe pesar menos de 3 MB.';
    avatarInput.value = '';
    return;
  }
  if (isUploadingAvatar) {
    avatarInput.value = '';
    return;
  }

  try {
    isUploadingAvatar = true;
    if (avatarStatus) avatarStatus.textContent = 'Subiendo foto…';
    resetAvatarPreviewUrl();
    avatarPreviewObjectUrl = URL.createObjectURL(file);
    setAvatarPreview(avatarPreviewObjectUrl);

    const storagePath = `users/${currentUser.uid}/avatar`;
    const fileRef = storageRef(storage, storagePath);
    await uploadBytes(fileRef, file, { contentType: file.type, cacheControl: 'public,max-age=3600' });
    const downloadUrl = await getDownloadURL(fileRef);

    const { profile, isAdmin } = await saveProfile(currentToken, { avatarUrl: downloadUrl });
    currentProfileData = profile;
    currentIsAdmin = Boolean(isAdmin);
    updateAdminVisibility();
    syncAvatarFromProfile(profile);
    if (avatarStatus) avatarStatus.textContent = 'Foto actualizada ✓';
  } catch (error) {
    console.error(error);
    syncAvatarFromProfile(currentProfileData);
    if (avatarStatus) avatarStatus.textContent = 'No se pudo subir la imagen.';
  } finally {
    isUploadingAvatar = false;
    avatarInput.value = '';
  }
});

window.addEventListener('story-deleted', (event) => {
  const storyId = event?.detail?.storyId;
  if (!storyId) return;
  const before = currentUserStories.length;
  currentUserStories = currentUserStories.filter((story) => story.id !== storyId);
  if (currentUserStories.length !== before) {
    updateStoryMetaSummary();
    renderUserStoriesList();
  }
});

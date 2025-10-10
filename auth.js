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
  storageBucket: 'supstatus-c1ab5.appspot.com',
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
const LOCAL_SPOT_SUGGESTIONS = [
  { name: 'La Herradura - Club de Yates', lat: -29.983059, lon: -71.365225 },
  { name: 'La Herradura - Playa Chica', lat: -29.991385, lon: -71.356782 },
  { name: 'La Herradura - Playa Grande', lat: -29.989642, lon: -71.351008 },
  { name: 'Peñuelas', lat: -29.955497, lon: -71.338849 },
  { name: 'Coquimbo Centro', lat: -29.953052, lon: -71.343914 },
  { name: 'Playa Blanca', lat: -29.930418, lon: -71.301394 },
];

const DEFAULT_SPOT_SUGGESTIONS = [
  'La Herradura - Club de Yates',
  'La Herradura - Playa Chica',
  'Peñuelas',
  'Bahía Cisnes',
  'Playa Las Tacas',
  'Playa Blanca',
  'Coquimbo Centro',
  'Tongoy',
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

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getNearestSpots(lat, lon, limit = 3) {
  return LOCAL_SPOT_SUGGESTIONS.map((spot) => ({
    ...spot,
    distanceKm: haversineDistance(lat, lon, spot.lat, spot.lon),
  }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

let currentUser = null;
let currentToken = null;
let currentProfileData = {};
let currentIsAdmin = false;
let isSaving = false;
let avatarPreviewObjectUrl = null;
let isUploadingAvatar = false;
let currentUserStories = [];
let isSavingStory = false;
let storyStatusTimeout = null;
let currentStoryMediaUrl = '';
let storyMediaUploading = false;
let storyMediaPreviewUrl = null;
let storySelectedSpot = '';
let storyLocationSuggestions = [];
let storyLocationLoading = false;
let storyLocationCoords = null;

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
    if (heicConverter && isHeic) {
      if (storyMediaStatus) storyMediaStatus.textContent = 'Convirtiendo HEIC…';
      const convertedBlob = await heicConverter({ blob: file, toType: 'image/jpeg', quality: STORY_MEDIA_DEFAULT_QUALITY });
      workingFile = new File([convertedBlob], `${(file.name?.split?.('.')?.[0] || 'story')}.jpg`, { type: 'image/jpeg' });
    } else if (isHeic) {
      console.warn('[stories] Navegador sin soporte para heic2any.');
      if (storyMediaStatus) storyMediaStatus.textContent = 'Tu navegador no puede convertir HEIC. Usa formato JPG o ajusta la cámara.';
      return file;
    }

    const { image, width, height, isBitmap } = await loadImageFromFile(workingFile);
    const scale = Math.min(STORY_MEDIA_MAX_DIMENSION / width, STORY_MEDIA_MAX_DIMENSION / height, 1);
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);
    const needsResize = scale < 1 || workingFile.size > STORY_MEDIA_MAX_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return workingFile;
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    if (isBitmap && typeof image.close === 'function') {
      image.close();
    }
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
      storyLocationStatus.textContent = 'Puedes agregar un spot cercano a tu historia o elegir uno sugerido.';
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
          const distanceCopy = suggestion.distanceKm < 1
            ? `${Math.round(suggestion.distanceKm * 1000)} m`
            : `${suggestion.distanceKm.toFixed(1)} km`;
          const selected = suggestion.name === storySelectedSpot ? 'selected' : '';
          const safeName = escapeHtml(suggestion.name);
          const encodedName = encodeURIComponent(suggestion.name);
          return `<button type="button" data-spot="${escapeHtml(encodedName)}" class="${selected}">${safeName} · ${escapeHtml(distanceCopy)}</button>`;
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
  const nearest = getNearestSpots(latitude, longitude, 3);
  const fallback = DEFAULT_SPOT_SUGGESTIONS.filter((name) => !nearest.some((spot) => spot.name === name))
    .slice(0, 3 - nearest.length)
    .map((name) => ({ name, lat: null, lon: null, distanceKm: Number.POSITIVE_INFINITY }));
  storyLocationSuggestions = [...nearest, ...fallback];
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
supAuthGlobal.getState = () => ({ token: currentToken, user: currentUser });
supAuthGlobal.openAuthModal = openAuthModal;
supAuthGlobal.subscribe = (callback) => {
  if (typeof callback !== 'function') return () => {};
  authSubscribers.add(callback);
  return () => authSubscribers.delete(callback);
};
window.supAuth = supAuthGlobal;

function notifyAuthChange() {
  const detail = { token: currentToken, user: currentUser };
  authSubscribers.forEach((callback) => {
    try {
      callback(detail);
    } catch (error) {
      console.error('[auth] auth subscriber error', error);
    }
  });
  window.dispatchEvent(new CustomEvent('sup-auth-changed', { detail }));
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
    throw new Error('No se pudieron obtener tus historias');
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

async function loadUserStories(token) {
  try {
    currentUserStories = await fetchUserStories(token);
    fillStoryForm(null);
    updateStoryMetaSummary();
  } catch (error) {
    console.error('[stories] error fetching user story', error);
    currentUserStories = [];
    resetStoryForm();
    updateStoryMetaSummary();
    if (storyStatusLabel) storyStatusLabel.textContent = 'No se pudieron cargar tus historias.';
    storyStatusTimeout = window.setTimeout(() => clearStoryStatusMessage(), 4000);
  }
}

function setAuthButtonLoggedOut() {
  authButton.textContent = '🔐 Iniciar sesión';
  authButton.onclick = openAuthModal;
  if (greetingLabel) greetingLabel.textContent = defaultGreeting;
  if (profileLinkButton) profileLinkButton.style.display = 'none';
  syncAvatarFromProfile(null);
  if (avatarStatus) avatarStatus.textContent = '';
  closeProfileModal();
  currentProfileData = {};
  currentUserStories = [];
  currentIsAdmin = false;
  updateAdminVisibility();
  fillProfileForm(null);
  resetStoryForm();
  updateStoryMetaSummary();
  notifyAuthChange();
}

function setAuthButtonLoggedIn(displayName) {
  authButton.textContent = '🚪 Cerrar sesión';
  authButton.onclick = () => signOut(auth);
  const friendlyName = displayName || 'remador/a';
  if (greetingLabel) greetingLabel.textContent = `🌊 ¡Hola, ${friendlyName}! ¿Listo para remar?`;
  if (profileLinkButton) profileLinkButton.style.display = 'flex';
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
    statusLabel.textContent = '';
    syncAvatarFromProfile(null);
    return;
  }

  profileEmail.textContent = user.email || 'Usuario sin email';
  displayNameInput.value = profile.displayName || user.displayName || '';
  bioInput.value = profile.bio || '';
  if (goalsInput) goalsInput.value = profile.goals || '';
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
      goals: goalsInput ? goalsInput.value.trim() : undefined,
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
  if (storyMediaStatus) storyMediaStatus.textContent = 'Optimizando foto…';
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
  } catch (error) {
    console.error(error);
    statusLabel.textContent = 'No se pudo cargar tu perfil.';
  }
});

renderStoryLocationState();
updateStoryMetaSummary();

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

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
const saveButton = document.getElementById('profile-save');
const statusLabel = document.getElementById('profile-status');
const greetingLabel = document.getElementById('auth-greeting');
const adminSection = document.getElementById('admin-section');
const adminProfileList = document.getElementById('admin-profile-list');
const adminMetrics = document.getElementById('admin-metrics');
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

const defaultGreeting = '🌊 Conecta tu perfil SUP y guarda tus remadas favoritas';
const DEFAULT_AVATAR_SRC = 'logosupstatus.png';
const AVATAR_MAX_SIZE = 3 * 1024 * 1024; // 3 MB
if (greetingLabel) greetingLabel.textContent = defaultGreeting;

let currentUser = null;
let currentToken = null;
let currentProfileData = {};
let currentIsAdmin = false;
let isSaving = false;
let avatarPreviewObjectUrl = null;
let isUploadingAvatar = false;

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
}

function syncAvatarFromProfile(profile) {
  resetAvatarPreviewUrl();
  const src = profile?.avatarUrl || DEFAULT_AVATAR_SRC;
  setAvatarPreview(src);
  setHeaderAvatar(src);
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

function setAuthButtonLoggedOut() {
  authButton.textContent = '🔐 Iniciar sesión';
  authButton.onclick = openAuthModal;
  if (greetingLabel) greetingLabel.textContent = defaultGreeting;
  if (profileLinkButton) profileLinkButton.style.display = 'none';
  syncAvatarFromProfile(null);
  if (avatarStatus) avatarStatus.textContent = '';
  closeProfileModal();
  currentProfileData = {};
  currentIsAdmin = false;
  updateAdminVisibility();
  fillProfileForm(null);
}

function setAuthButtonLoggedIn(displayName) {
  authButton.textContent = '🚪 Cerrar sesión';
  authButton.onclick = () => signOut(auth);
  const friendlyName = displayName || 'remador/a';
  if (greetingLabel) greetingLabel.textContent = `🌊 ¡Hola, ${friendlyName}! ¿Listo para remar?`;
  if (profileLinkButton) profileLinkButton.style.display = 'inline-flex';
  if (currentProfileData) {
    setHeaderAvatar(currentProfileData.avatarUrl || DEFAULT_AVATAR_SRC);
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
    const { profile, isAdmin } = await fetchProfile(currentToken);
    currentProfileData = profile;
    currentIsAdmin = Boolean(isAdmin);
    updateAdminVisibility();
    if (currentIsAdmin) loadAdminProfiles();
    const nameToShow = profile.displayName || user.displayName || '';
    setAuthButtonLoggedIn(nameToShow);
    fillProfileForm(user, profile);
  } catch (error) {
    console.error(error);
    statusLabel.textContent = 'No se pudo cargar tu perfil.';
  }
});

profileLinkButton?.addEventListener('click', () => {
  if (!currentUser) return;
  fillProfileForm(currentUser, currentProfileData || {});
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

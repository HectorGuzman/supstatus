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

const authModal = document.getElementById('auth-modal');
const googleLoginBtn = document.getElementById('google-login-btn');
const emailLoginBtn = document.getElementById('email-login-btn');
const resetPasswordBtn = document.getElementById('reset-password-btn');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const authError = document.getElementById('auth-error');

const defaultGreeting = '🌊 Conecta tu perfil SUP y guarda tus remadas favoritas';
if (greetingLabel) greetingLabel.textContent = defaultGreeting;

let currentUser = null;
let currentToken = null;
let currentProfileData = {};
let isSaving = false;

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
    return data.profile || {};
  }
  if (response.status === 404) return {};
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
  return data.profile || {};
}

function setAuthButtonLoggedOut() {
  authButton.textContent = '🔐 Iniciar sesión';
  authButton.onclick = openAuthModal;
  if (greetingLabel) greetingLabel.textContent = defaultGreeting;
  if (profileLinkButton) profileLinkButton.style.display = 'none';
  closeProfileModal();
  currentProfileData = {};
  fillProfileForm(null);
}

function setAuthButtonLoggedIn(displayName) {
  authButton.textContent = '🚪 Cerrar sesión';
  authButton.onclick = () => signOut(auth);
  const friendlyName = displayName || 'remador/a';
  if (greetingLabel) greetingLabel.textContent = `🌊 ¡Hola, ${friendlyName}! ¿Listo para remar?`;
  if (profileLinkButton) profileLinkButton.style.display = 'inline-flex';
}

function fillProfileForm(user, profile = {}) {
  if (!user) {
    profileEmail.textContent = '';
    displayNameInput.value = '';
    bioInput.value = '';
    if (goalsInput) goalsInput.value = '';
    statusLabel.textContent = '';
    return;
  }

  profileEmail.textContent = user.email || 'Usuario sin email';
  displayNameInput.value = profile.displayName || user.displayName || '';
  bioInput.value = profile.bio || '';
  if (goalsInput) goalsInput.value = profile.goals || '';
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
    const profile = await saveProfile(currentToken, payload);
    statusLabel.textContent = 'Perfil actualizado ✓';
    currentProfileData = profile;
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
    fillProfileForm(null);
    currentToken = null;
    return;
  }

  try {
    setAuthButtonLoggedIn();
    currentToken = await user.getIdToken();
    const profile = await fetchProfile(currentToken);
    currentProfileData = profile;
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
  if (profileModal) profileModal.style.display = 'flex';
});



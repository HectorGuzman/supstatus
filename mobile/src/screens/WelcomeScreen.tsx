import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gradient as LinearGradient } from '../components/Gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { useGoogleSignIn } from '../services/googleAuth';
import { colors, radius, spacing } from '../theme';

type Mode = 'welcome' | 'login' | 'register';

const ERROR_MSGS: Record<string, string> = {
  'auth/invalid-credential':    'Email o contraseña incorrectos.',
  'auth/user-not-found':        'No existe una cuenta con ese email.',
  'auth/wrong-password':        'Contraseña incorrecta.',
  'auth/email-already-in-use':  'Ya existe una cuenta con ese email.',
  'auth/weak-password':         'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email':         'El email no es válido.',
  'auth/network-request-failed':'Sin conexión a internet.',
  'auth/too-many-requests':     'Demasiados intentos. Espera un momento.',
};

const FEATURES = [
  { icon: 'navigate-outline' as const, label: 'Rastrea tus\nremadas GPS' },
  { icon: 'partly-sunny-outline' as const, label: 'Condiciones\nen tiempo real' },
  { icon: 'people-outline' as const, label: 'Comunidad\nde remeros' },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { signIn: googleSignIn, loading: googleLoading } = useGoogleSignIn();

  const [mode, setMode] = useState<Mode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Completa los campos', 'Ingresa tu email y contraseña.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      Alert.alert('Falta tu nombre', 'Ingresa cómo quieres que te llamen.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth as any, email.trim(), password);
        if (cred.user) {
          const { updateProfile, sendEmailVerification } = await import('firebase/auth');
          await updateProfile(cred.user, { displayName: name.trim() });
          await sendEmailVerification(cred.user);
          Alert.alert('¡Cuenta creada!', 'Te enviamos un correo de verificación. Revisa tu bandeja de entrada.');
        }
      } else {
        await signInWithEmailAndPassword(auth as any, email.trim(), password);
      }
    } catch (e: any) {
      Alert.alert('Error', ERROR_MSGS[e.code] ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Ingresa tu email primero', 'Escribe tu email y luego toca esta opción.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth as any, email.trim());
      Alert.alert('Revisa tu correo', `Si existe una cuenta con ${email.trim()}, recibirás un enlace de restablecimiento.\n\n⚠️ Revisa también la carpeta de spam.`, [{ text: 'Entendido' }]);
    } catch (e: any) {
      Alert.alert('Error', ERROR_MSGS[(e as any).code] ?? (e as any).message);
    }
  };

  const isAuthMode = mode === 'login' || mode === 'register';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#040e1e', '#071828', '#091f35']} style={StyleSheet.absoluteFill} />

      {/* Decorative circles */}
      <View style={styles.decor1} />
      <View style={styles.decor2} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── HERO ── */}
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <View style={styles.logoGlow} />
              <Image source={require('../../assets/icon.png')} style={styles.logo} />
            </View>
            <Text style={styles.appName}>SUP Status</Text>
            <Text style={styles.tagline}>Paddle. Comparte. Conecta.</Text>
          </View>

          {/* ── FEATURES (only on welcome) ── */}
          {!isAuthMode && (
            <View style={styles.featuresRow}>
              {FEATURES.map(f => (
                <View key={f.label} style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={f.icon} size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── GOOGLE BUTTON ── */}
          <TouchableOpacity
            style={[styles.googleBtn, (googleLoading) && { opacity: 0.7 }]}
            onPress={googleSignIn}
            disabled={googleLoading}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="logo-google" size={20} color="#fff" />
            )}
            <Text style={styles.googleBtnText}>
              {googleLoading ? 'Iniciando sesión...' : 'Continuar con Google'}
            </Text>
          </TouchableOpacity>

          {/* ── DIVIDER ── */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o con email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── MODE TABS ── */}
          <View style={styles.modeTabs}>
            {(['login', 'register'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.modeTab, mode === m && styles.modeTabActive]}
                onPress={() => setMode(m)}
              >
                {mode === m && (
                  <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.md - 2 }]} />
                )}
                <Text style={[styles.modeTabText, mode === m && { color: '#fff' }]}>
                  {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── FORM ── */}
          {isAuthMode && (
            <View style={styles.form}>
              {mode === 'register' && (
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Tu nombre"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              )}
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  onSubmitEditing={handleAuth}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {mode === 'login' && (
                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                  <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} />
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>{mode === 'register' ? 'Crear cuenta' : 'Ingresar'}</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* ── WELCOME HINTS (only welcome mode) ── */}
          {mode === 'welcome' && (
            <View style={styles.hintRow}>
              <TouchableOpacity style={styles.hintBtn} onPress={() => setMode('login')}>
                <Ionicons name="log-in-outline" size={16} color={colors.primary} />
                <Text style={styles.hintText}>Ya tengo cuenta</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.hintBtn, { borderColor: colors.success + '40' }]} onPress={() => setMode('register')}>
                <Ionicons name="person-add-outline" size={16} color={colors.success} />
                <Text style={styles.hintText}>Crear cuenta nueva</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.footer}>Al continuar aceptas nuestros términos de uso</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040e1e' },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg },

  decor1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#0ea5e9', opacity: 0.04, top: -80, right: -80,
  },
  decor2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#0ea5e9', opacity: 0.03, bottom: 100, left: -60,
  },

  hero: { alignItems: 'center', marginBottom: 32 },
  logoWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoGlow: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#0ea5e9', opacity: 0.12,
  },
  logo: { width: 104, height: 104, borderRadius: 24 },
  appName: { fontSize: 40, fontWeight: '900', color: '#f1f5f9', letterSpacing: -1, marginBottom: 8 },
  tagline: { fontSize: 16, color: '#0ea5e9', fontWeight: '600', letterSpacing: 0.5 },

  featuresRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 8 },
  featureItem: { flex: 1, alignItems: 'center', gap: 10 },
  featureIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(14,165,233,0.1)', borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 16, fontWeight: '600' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#1a3a5c', padding: 16, borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)', marginBottom: 4,
  },
  googleBtnText: { color: '#f1f5f9', fontWeight: '700', fontSize: 15 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  modeTabs: {
    flexDirection: 'row', backgroundColor: colors.surface2,
    borderRadius: radius.md, padding: 3, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  modeTab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: radius.md - 2, overflow: 'hidden' },
  modeTabActive: {},
  modeTabText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },

  form: { gap: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm,
    minHeight: 52,
  },
  inputIcon: { marginRight: 6 },
  input: { flex: 1, color: '#f1f5f9', fontSize: 15, paddingVertical: 14 },
  eyeBtn: { padding: 8 },

  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 4 },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  submitBtn: { padding: 16, borderRadius: radius.lg, alignItems: 'center', overflow: 'hidden', marginTop: 4 },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  hintRow: { gap: 10, marginTop: 4 },
  hintBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface1, borderRadius: radius.lg,
    padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  hintText: { flex: 1, color: '#f1f5f9', fontWeight: '600', fontSize: 15 },

  footer: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.xl },
});

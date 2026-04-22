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

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { signIn: googleSignIn, ready: googleReady } = useGoogleSignIn();

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
      Alert.alert('Ingresa tu email primero', 'Escribe tu email en el campo de arriba y luego toca esta opción.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth as any, email.trim());
      Alert.alert(
        'Revisa tu correo',
        `Si existe una cuenta con ${email.trim()}, recibirás un enlace para restablecer tu contraseña.\n\n⚠️ Revisa también la carpeta de spam.\n\nNota: solo funciona para cuentas creadas con email (no Google).`,
        [{ text: 'Entendido' }]
      );
    } catch (e: any) {
      Alert.alert('Error', ERROR_MSGS[(e as any).code] ?? (e as any).message);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#071828', '#040e1e']} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + brand */}
          <View style={styles.brand}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} />
            <Text style={styles.appTitle}>SUP Status</Text>
            <Text style={styles.appTagline}>La comunidad SUP de Chile</Text>
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeHeadline}>Paddle juntos.{'\n'}Crecer juntos.</Text>
              <Text style={styles.welcomeBody}>
                Comparte tus remadas, revisa las condiciones antes de salir al agua y conecta con remeros de todo el país.
              </Text>
            </View>
          </View>

          {/* Google button — always visible */}
          <TouchableOpacity
            style={[styles.googleBtn, !googleReady && { opacity: 0.4 }]}
            onPress={googleSignIn}
            disabled={!googleReady}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color="#fff" />
            <Text style={styles.googleBtnText}>Continuar con Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o con email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Mode toggle tabs */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
              onPress={() => setMode('login')}
            >
              {mode === 'login' && (
                <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]} />
              )}
              <Text style={[styles.modeTabText, mode === 'login' && { color: '#fff' }]}>Iniciar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'register' && styles.modeTabActive]}
              onPress={() => setMode('register')}
            >
              {mode === 'register' && (
                <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]} />
              )}
              <Text style={[styles.modeTabText, mode === 'register' && { color: '#fff' }]}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>

          {(mode === 'login' || mode === 'register') && (
            <View style={styles.form}>
              {/* Name — only for register */}
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
                    returnKeyType="next"
                  />
                </View>
              )}

              {/* Email */}
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
                  returnKeyType="next"
                />
              </View>

              {/* Password */}
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
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Forgot password — only login mode */}
              {mode === 'login' && (
                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                  <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              )}

              {/* Submit */}
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

          {/* Welcome mode — show both options as hints */}
          {mode === 'welcome' && (
            <View style={styles.welcomeHints}>
              <TouchableOpacity style={styles.hintBtn} onPress={() => setMode('login')}>
                <Ionicons name="log-in-outline" size={18} color={colors.primary} />
                <Text style={styles.hintText}>Ya tengo cuenta</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.hintBtn} onPress={() => setMode('register')}>
                <Ionicons name="person-add-outline" size={18} color={colors.success} />
                <Text style={styles.hintText}>Crear cuenta nueva</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Footer */}
          <Text style={styles.footer}>Al continuar aceptas nuestros términos de uso</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg },

  brand: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { width: 150, height: 150, borderRadius: 34, marginBottom: 18 },
  appTitle: { fontSize: 36, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  appTagline: { fontSize: 14, color: colors.primary, marginTop: 6, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  welcomeCard: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(14,165,233,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.15)',
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  welcomeHeadline: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 10,
  },
  welcomeBody: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#1a3a5c', padding: 16, borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(56,189,248,0.25)',
  },
  googleBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13 },

  modeTabs: {
    flexDirection: 'row', backgroundColor: colors.surface2,
    borderRadius: radius.md, padding: 3, marginBottom: spacing.md,
  },
  modeTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: radius.md, overflow: 'hidden',
  },
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
  input: { flex: 1, color: colors.textPrimary, fontSize: 15, paddingVertical: 14 },
  eyeBtn: { padding: 8 },

  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 4 },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  submitBtn: {
    padding: 16, borderRadius: radius.lg, alignItems: 'center',
    overflow: 'hidden', marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  welcomeHints: { gap: 10 },
  hintBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface1, borderRadius: radius.lg,
    padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  hintText: { flex: 1, color: colors.textPrimary, fontWeight: '600', fontSize: 15 },

  footer: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.xl },
});

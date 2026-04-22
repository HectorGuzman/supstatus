import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Image, Share, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Gradient as LinearGradient } from '../components/Gradient';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../services/firebase';
import { requestMediaLibraryPermission, requestCameraPermission } from '../services/permissions';
import { useGoogleSignIn } from '../services/googleAuth';
import { api } from '../services/api';
import { UserProfile } from '../types';
import { colors, radius, spacing } from '../theme';

const NIVELES = ['Principiante', 'Intermedio', 'Avanzado', 'Experto'];
const DISCIPLINAS = ['Travesía', 'Surf', 'Racing', 'Yoga SUP', 'Pesca', 'Recreativo'];

const RANKS = [
  { min: 0,   label: 'Sin remadas',     color: colors.textMuted,  icon: '🌊' },
  { min: 1,   label: 'Explorador SUP',  color: colors.success,    icon: '🟢' },
  { min: 20,  label: 'Remero Regular',  color: colors.primary,    icon: '🔵' },
  { min: 50,  label: 'Aventurero SUP',  color: colors.purple,     icon: '🟣' },
  { min: 100, label: 'Maestro del Remo',color: colors.warning,    icon: '🟡' },
  { min: 200, label: 'Leyenda SUP',     color: colors.danger,     icon: '🔴' },
];

const NEXT_RANK_KM = [1, 20, 50, 100, 200, Infinity];

function getRank(km: number) {
  return [...RANKS].reverse().find(r => km >= r.min) ?? RANKS[0];
}
function getNextRank(km: number) {
  return RANKS.find(r => r.min > km) ?? null;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const profileCardRef = useRef<View>(null);
  const [user, setUser] = useState(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<UserProfile>>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { signIn: googleSignIn, ready: googleReady } = useGoogleSignIn();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u: any) => {
      setUser(u);
      if (u) loadProfile(); else setLoading(false);
    });
    return unsub;
  }, []);

  const loadProfile = async () => {
    try { const d = await api.getProfile(); setProfile(d); setForm(d); }
    finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Recuperar contraseña', 'Ingresa tu email primero y luego toca "¿Olvidaste tu contraseña?".');
      return;
    }
    try {
      await sendPasswordResetEmail(auth as any, email.trim());
      Alert.alert(
        'Revisa tu correo',
        `Si existe una cuenta con ${email.trim()}, recibirás un enlace para restablecer tu contraseña.\n\n⚠️ Revisa también la carpeta de spam o correo no deseado.\n\nNota: esto solo funciona si tu cuenta fue creada con email y contraseña (no con Google).`,
        [{ text: 'Entendido' }]
      );
    } catch (e: any) {
      console.log('[ForgotPassword] error:', e?.code, e?.message);
      const msgs: Record<string, string> = {
        'auth/user-not-found': 'No existe una cuenta con ese email.',
        'auth/invalid-email': 'El email ingresado no es válido.',
        'auth/network-request-failed': 'Sin conexión a internet.',
        'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
        'auth/missing-email': 'Ingresa un email para continuar.',
      };
      Alert.alert('No se pudo enviar', msgs[e.code] ?? `Error: ${e.code ?? e.message}`);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Ingresa tu email y contraseña.');
      return;
    }
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth as any, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth as any, email.trim(), password);
        if (cred.user) {
          await (await import('firebase/auth')).sendEmailVerification(cred.user);
          Alert.alert('¡Cuenta creada!', 'Te enviamos un correo de verificación. Revisa tu bandeja de entrada.');
        }
      }
    } catch (e: any) {
      const msgs: Record<string, string> = {
        'auth/invalid-credential': 'Email o contraseña incorrectos.',
        'auth/user-not-found': 'No existe una cuenta con ese email.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
        'auth/invalid-email': 'El email no es válido.',
        'auth/network-request-failed': 'Sin conexión a internet.',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
      };
      Alert.alert('Error', msgs[e.code] ?? e.message);
    }
  };

  const pickAvatar = () => {
    Alert.alert('Cambiar foto de perfil', '¿De dónde quieres subir la foto?', [
      {
        text: 'Cámara',
        onPress: async () => {
          try {
            if (!(await requestCameraPermission())) return;
            const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true, aspect: [1, 1] });
            if (result.canceled) return;
            await uploadAvatar(result.assets[0].uri);
          } catch (e: any) {
            Alert.alert('Error al tomar foto', e?.message ?? 'Error desconocido');
          }
        },
      },
      {
        text: 'Galería',
        onPress: async () => {
          try {
            if (!(await requestMediaLibraryPermission())) return;
            const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true, aspect: [1, 1] });
            if (result.canceled) return;
            await uploadAvatar(result.assets[0].uri);
          } catch (e: any) {
            Alert.alert('Error al seleccionar foto', e?.message ?? 'Error desconocido');
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const uploadAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileRef = ref(storage, `avatars/${user!.uid}.jpg`);
      await uploadBytes(fileRef, blob);
      const url = await getDownloadURL(fileRef);
      setForm(f => ({ ...f, avatarUrl: url }));
      // Auto-save avatar immediately
      const updated = await api.updateProfile({ ...form, avatarUrl: url });
      setProfile(updated);
    } catch (e: any) {
      Alert.alert('Error al subir foto', e?.message ?? 'No se pudo subir la imagen. Verifica tu conexión.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try { const d = await api.updateProfile(form); setProfile(d); setEditing(false); }
    catch { Alert.alert('Error', 'No se pudo guardar el perfil.'); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator color={colors.primary} size="large" /></View>;

  if (!user) return <LoginScreen email={email} setEmail={setEmail} password={password} setPassword={setPassword} authMode={authMode} setAuthMode={setAuthMode} onEmailAuth={handleEmailAuth} onForgotPassword={handleForgotPassword} onGoogle={googleSignIn} googleReady={googleReady} />;

  const km = profile?.sessionsSummary?.totalKm ?? 0;
  const rank = getRank(km);
  const nextRank = getNextRank(km);
  const rankProgress = nextRank ? Math.min((km - (getRank(km).min)) / (nextRank.min - getRank(km).min), 1) : 1;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View ref={profileCardRef} collapsable={false}>
        <LinearGradient colors={['#071828', '#040e1e']} style={styles.headerGradient}>
          <View style={styles.headerRow}>
            <Text style={styles.screenTitle}>Perfil</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    if (profileCardRef.current) {
                      const uri = await captureRef(profileCardRef, { format: 'png', quality: 0.95 });
                      if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir perfil' });
                        return;
                      }
                    }
                  } catch {}
                  Share.share({ message: `🏄 ${profile?.displayName ?? user.email?.split('@')[0]} — SUP Status\n${profile?.nivel ? `Nivel: ${profile.nivel}` : ''}${profile?.equipo ? ` · ${profile.equipo}` : ''}${km > 0 ? `\n📍 ${km.toFixed(1)} km remados` : ''}` });
                }}
                style={styles.shareBtn}
              >
                <Ionicons name="share-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => signOut(auth as any)} style={styles.signOutBtn}>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={editing ? pickAvatar : undefined}>
              <View style={styles.avatarRing}>
                <LinearGradient colors={[rank.color, rank.color + '66']} style={styles.avatarRingGradient} />
                {(editing ? form.avatarUrl : null) ?? profile?.avatarUrl ? (
                  <Image source={{ uri: ((editing ? form.avatarUrl : null) ?? profile?.avatarUrl)! }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="person" size={36} color={colors.textMuted} />
                  </View>
                )}
                {editing && !uploadingAvatar && (
                  <View style={styles.avatarEditBadge}>
                    <Ionicons name="camera" size={12} color="#fff" />
                  </View>
                )}
                {uploadingAvatar && (
                  <View style={[styles.avatarEditBadge, { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.displayName}>{profile?.displayName ?? user.email?.split('@')[0]}</Text>
            <View style={[styles.rankBadge, { backgroundColor: rank.color + '20', borderColor: rank.color + '60' }]}>
              <Text style={styles.rankIcon}>{rank.icon}</Text>
              <Text style={[styles.rankLabel, { color: rank.color }]}>{rank.label}</Text>
            </View>
          </View>

          {nextRank && (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${rankProgress * 100}%` as any, backgroundColor: rank.color }]} />
              </View>
              <Text style={styles.progressText}>{km.toFixed(1)} km → {nextRank.min} km para {nextRank.label}</Text>
            </View>
          )}

          {profile?.sessionsSummary && (
            <View style={styles.statsRow}>
              <StatBox value={km.toFixed(1)} label="km totales" color={colors.primary} />
              <StatBox value={String(profile.sessionsSummary.totalSessions)} label="remadas" color={colors.success} />
              <StatBox value={`${Math.floor(profile.sessionsSummary.totalDurationMin / 60)}h`} label="en el agua" color={colors.warning} />
            </View>
          )}
        </LinearGradient>
        </View>{/* end profileCardRef */}

        <View style={styles.content}>
          {editing ? (
            <EditForm form={form} setForm={setForm} onSave={saveProfile} onCancel={() => setEditing(false)} saving={saving} bottomInset={insets.bottom} />
          ) : (
            <InfoSection profile={profile} onEdit={() => setEditing(true)} />
          )}
        </View>
        <TouchableOpacity
          style={styles.igRow}
          onPress={() => Linking.openURL('https://instagram.com/__supstatus')}
          activeOpacity={0.75}
        >
          <Ionicons name="logo-instagram" size={18} color="#e1306c" />
          <Text style={styles.igText}>Síguenos en Instagram <Text style={styles.igHandle}>@__supstatus</Text></Text>
        </TouchableOpacity>
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={[styles.statBox, { borderColor: color + '30' }]}>
      <LinearGradient colors={[color + '15', color + '05']} style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]} />
      <Text style={[styles.statBoxValue, { color }]}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

function InfoSection({ profile, onEdit }: { profile: UserProfile | null; onEdit: () => void }) {
  if (!profile?.nivel && !profile?.disciplina && !profile?.disciplinas?.length && !profile?.bio) {
    return (
      <TouchableOpacity style={styles.emptyProfile} onPress={onEdit}>
        <Ionicons name="create-outline" size={32} color={colors.primary} />
        <Text style={styles.emptyProfileText}>Completa tu perfil</Text>
        <Text style={styles.emptyProfileSub}>Agrega tu nivel, disciplina y bio</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.infoCard}>
      {profile?.nivel && <InfoRow icon="ribbon-outline" label="Nivel" value={profile.nivel} />}
      {(profile?.disciplinas?.length || profile?.disciplina) && (
        <InfoRow
          icon="boat-outline"
          label={(profile.disciplinas?.length ?? 0) > 1 ? 'Disciplinas' : 'Disciplina'}
          value={profile.disciplinas?.join(' · ') ?? profile.disciplina!}
        />
      )}
      {profile?.boardSetup && <InfoRow icon="boat-outline" label="Tabla" value={profile.boardSetup} />}
      {profile?.equipo && <InfoRow icon="people-outline" label="Equipo" value={profile.equipo} />}
      {profile?.bio && <InfoRow icon="person-circle-outline" label="Bio" value={profile.bio} />}
      <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
        <Ionicons name="create-outline" size={16} color={colors.primary} />
        <Text style={styles.editBtnText}>Editar perfil</Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function EditForm({ form, setForm, onSave, onCancel, saving, bottomInset }: any) {
  return (
    <View style={styles.editForm}>
      <Text style={styles.editSectionTitle}>Información básica</Text>
      <View style={styles.inputGroup}>
        <Ionicons name="person-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor={colors.textMuted} value={form.displayName ?? ''} onChangeText={(v: string) => setForm((f: any) => ({ ...f, displayName: v }))} />
      </View>

      <Text style={styles.editSectionTitle}>Nivel</Text>
      <View style={styles.pills}>
        {NIVELES.map(n => (
          <TouchableOpacity key={n} onPress={() => setForm((f: any) => ({ ...f, nivel: n }))} style={[styles.pill, form.nivel === n && styles.pillActive]}>
            {form.nivel === n && <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.full }]} />}
            <Text style={[styles.pillText, form.nivel === n && { color: '#fff' }]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.editSectionTitle}>Disciplinas (puedes elegir varias)</Text>
      <View style={styles.pills}>
        {DISCIPLINAS.map(d => {
          const selected = (form.disciplinas ?? (form.disciplina ? [form.disciplina] : [])).includes(d);
          return (
            <TouchableOpacity key={d} onPress={() => setForm((f: any) => {
              const current: string[] = f.disciplinas ?? (f.disciplina ? [f.disciplina] : []);
              const updated = current.includes(d) ? current.filter((x: string) => x !== d) : [...current, d];
              return { ...f, disciplinas: updated, disciplina: updated[0] ?? '' };
            })} style={[styles.pill, selected && styles.pillActive]}>
              {selected && <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.full }]} />}
              <Text style={[styles.pillText, selected && { color: '#fff' }]}>{d}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.editSectionTitle}>Tabla y equipo</Text>
      <View style={styles.inputGroup}>
        <Ionicons name="boat-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="Ej: 12'6 racing, remo carbono..." placeholderTextColor={colors.textMuted} value={form.boardSetup ?? ''} onChangeText={(v: string) => setForm((f: any) => ({ ...f, boardSetup: v }))} />
      </View>

      <View style={styles.inputGroup}>
        <Ionicons name="people-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="¿A qué equipo perteneces?" placeholderTextColor={colors.textMuted} value={form.equipo ?? ''} onChangeText={(v: string) => setForm((f: any) => ({ ...f, equipo: v }))} />
      </View>

      <Text style={styles.editSectionTitle}>Bio</Text>
      <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Cuéntanos sobre ti..." placeholderTextColor={colors.textMuted} multiline value={form.bio ?? ''} onChangeText={(v: string) => setForm((f: any) => ({ ...f, bio: v }))} />

      <View style={[styles.editActions, { marginBottom: bottomInset ?? 0 }]}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving}>
          <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]} />
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LoginScreen({ email, setEmail, password, setPassword, authMode, setAuthMode, onEmailAuth, onForgotPassword, onGoogle, googleReady }: any) {
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#071828', '#040e1e']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.loginContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.loginHeader}>
          <Image source={require('../../assets/icon.png')} style={styles.loginLogo} />
          <Text style={styles.loginSub}>{authMode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}</Text>
        </View>

        <TouchableOpacity style={[styles.googleBtn, !googleReady && { opacity: 0.4 }]} onPress={onGoogle} disabled={!googleReady}>
          <Ionicons name="logo-google" size={20} color="#fff" />
          <Text style={styles.googleBtnText}>Continuar con Google</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} /><Text style={styles.dividerText}>o</Text><View style={styles.dividerLine} />
        </View>

        <View style={styles.inputGroup}>
          <Ionicons name="mail-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        </View>
        <View style={styles.inputGroup}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Contraseña" placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={onEmailAuth}>
          <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]} />
          <Text style={styles.saveBtnText}>{authMode === 'login' ? 'Iniciar sesión' : 'Registrarse'}</Text>
        </TouchableOpacity>

        {authMode === 'login' && (
          <TouchableOpacity onPress={onForgotPassword} style={{ marginTop: spacing.sm, alignItems: 'center' }}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => setAuthMode((a: string) => a === 'login' ? 'register' : 'login')} style={{ marginTop: spacing.md }}>
          <Text style={styles.switchText}>
            {authMode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{authMode === 'login' ? 'Regístrate' : 'Inicia sesión'}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerGradient: { paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  screenTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  signOutBtn: { padding: 8, backgroundColor: colors.dangerGlow, borderRadius: radius.md },
  shareBtn: { padding: 8, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  avatarSection: { alignItems: 'center', marginBottom: spacing.md },
  avatarRing: { width: 96, height: 96, borderRadius: 48, padding: 3, marginBottom: spacing.sm, position: 'relative' },
  avatarRingGradient: { position: 'absolute', inset: 0, borderRadius: 48 },
  avatar: { width: 90, height: 90, borderRadius: 45, margin: 3 },
  avatarEditBadge: { position: 'absolute', bottom: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  displayName: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 },
  rankIcon: { fontSize: 14 },
  rankLabel: { fontSize: 13, fontWeight: '700' },
  progressSection: { marginBottom: spacing.md },
  progressBar: { height: 4, backgroundColor: colors.surface3, borderRadius: 2, marginBottom: 6 },
  progressFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, borderRadius: radius.md, padding: 12, alignItems: 'center', borderWidth: 1, overflow: 'hidden' },
  statBoxValue: { fontSize: 20, fontWeight: '800' },
  statBoxLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  content: { padding: spacing.md },
  infoCard: { backgroundColor: colors.surface1, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: spacing.md, justifyContent: 'center' },
  editBtnText: { color: colors.primary, fontWeight: '600' },
  emptyProfile: { alignItems: 'center', padding: spacing.xl, backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', gap: 8 },
  emptyProfileText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  emptyProfileSub: { color: colors.textMuted, fontSize: 13 },
  editForm: { gap: 8 },
  editSectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing.sm },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm },
  inputIcon: { marginRight: 4 },
  input: { flex: 1, color: colors.textPrimary, padding: spacing.sm, fontSize: 15 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  pillActive: {},
  pillText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: spacing.sm },
  cancelBtn: { flex: 1, padding: 14, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 12, borderRadius: radius.md, alignItems: 'center', overflow: 'hidden', position: 'relative', justifyContent: 'center' },
  loginBtn: { padding: 14, borderRadius: radius.md, alignItems: 'center', overflow: 'hidden', position: 'relative', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  igRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.md, marginTop: spacing.sm, padding: 14, backgroundColor: colors.surface1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  igText: { fontSize: 14, color: colors.textSecondary },
  igHandle: { color: '#e1306c', fontWeight: '700' },
  loginContainer: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  loginHeader: { alignItems: 'center', marginBottom: spacing.xl },
  loginLogo: { width: 140, height: 140, borderRadius: 30, marginBottom: spacing.md },
  loginSub: { fontSize: 15, color: colors.textMuted, marginTop: 4 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#1a3a5c', padding: 16, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight },
  googleBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13 },
  switchText: { color: colors.textMuted, textAlign: 'center', fontSize: 14 },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
});

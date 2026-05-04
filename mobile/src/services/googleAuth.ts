import { useState } from 'react';
import { Alert } from 'react-native';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';

let _GoogleSignin: any = null;
let _statusCodes: any = { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED', IN_PROGRESS: 'IN_PROGRESS' };

try {
  const m = require('@react-native-google-signin/google-signin');
  _GoogleSignin = m.GoogleSignin;
  _statusCodes = m.statusCodes;
  _GoogleSignin.configure({
    webClientId: '858880938649-utqitsb4jilha33u7146enc6kk57uudh.apps.googleusercontent.com',
    iosClientId: '858880938649-n2f6birup74e0ifbj2ukbfq6f9ufh4rh.apps.googleusercontent.com',
  });
} catch {}

export function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (!_GoogleSignin) {
      Alert.alert('Google Sign-In no disponible en Expo Go', 'Instala el build de la app para usar esta función.');
      return;
    }
    setLoading(true);
    try {
      await _GoogleSignin.hasPlayServices();
      const userInfo = await _GoogleSignin.signIn();
      // v16+: idToken viene directo en userInfo.data, v13 viene en userInfo
      const idToken = userInfo?.data?.idToken ?? userInfo?.idToken;
      if (!idToken) throw new Error('No se obtuvo idToken de Google');
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth as any, credential);
    } catch (e: any) {
      if (e.code === _statusCodes.SIGN_IN_CANCELLED) return;
      if (e.code === _statusCodes.IN_PROGRESS) return;
      console.error('[GoogleSignIn] error:', e?.code, e?.message);
      Alert.alert('Error al iniciar sesión', `${e?.code ?? ''} ${e?.message ?? 'No se pudo completar el inicio de sesión con Google.'}`);
    } finally {
      setLoading(false);
    }
  };

  return { signIn, ready: true, loading };
}

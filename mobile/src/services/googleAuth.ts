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
    offlineAccess: true,
  });
} catch {}

export function useGoogleSignIn() {
  const signIn = async () => {
    if (!_GoogleSignin) {
      Alert.alert('Google Sign-In no disponible en Expo Go', 'Instala el build de la app para usar esta función.');
      return;
    }
    try {
      await _GoogleSignin.hasPlayServices();
      await _GoogleSignin.signIn();
      const tokens = await _GoogleSignin.getTokens();
      const credential = GoogleAuthProvider.credential(tokens.idToken);
      await signInWithCredential(auth as any, credential);
    } catch (e: any) {
      if (e.code === _statusCodes.SIGN_IN_CANCELLED) return;
      if (e.code === _statusCodes.IN_PROGRESS) return;
      throw e;
    }
  };

  return { signIn, ready: true };
}

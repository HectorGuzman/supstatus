import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';

let _AppleAuthentication: any = null;
try {
  _AppleAuthentication = require('expo-apple-authentication');
} catch {}

export function useAppleSignIn() {
  const [loading, setLoading] = useState(false);
  const isAvailable = Platform.OS === 'ios';

  const signIn = async () => {
    setLoading(true);
    try {
      const credential = await _AppleAuthentication.signInAsync({
        requestedScopes: [
          _AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          _AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { identityToken, nonce } = credential;
      if (!identityToken) throw new Error('No se obtuvo identityToken de Apple');
      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({ idToken: identityToken, rawNonce: nonce });
      await signInWithCredential(auth as any, firebaseCredential);
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') return;
      console.error('[AppleSignIn] error:', e?.code, e?.message);
      Alert.alert('Error al iniciar sesión', e?.message ?? 'No se pudo completar el inicio de sesión con Apple.');
    } finally {
      setLoading(false);
    }
  };

  return { signIn, loading, isAvailable };
}

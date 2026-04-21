// Stub for @react-native-google-signin/google-signin in Expo Go
export const GoogleSignin = {
  configure: () => {},
  hasPlayServices: async () => true,
  signIn: async () => { throw { code: 'SIGN_IN_CANCELLED' }; },
  getTokens: async () => ({ idToken: null, accessToken: null }),
  signOut: async () => {},
  isSignedIn: async () => false,
};

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};

export default { GoogleSignin, statusCodes };

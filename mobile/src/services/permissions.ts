import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

function openSettings() {
  Linking.openSettings();
}

function showDeniedAlert(feature: string) {
  Alert.alert(
    'Permiso requerido',
    `Para ${feature}, necesitamos acceso que fue denegado. Puedes habilitarlo en Configuración.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Abrir Configuración', onPress: openSettings },
    ]
  );
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status === 'granted') return true;
  if (!canAskAgain) {
    showDeniedAlert('acceder a tus fotos');
  } else {
    Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para subir fotos.');
  }
  return false;
}

export async function requestCameraPermission(): Promise<boolean> {
  const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
  if (status === 'granted') return true;
  if (!canAskAgain) {
    showDeniedAlert('usar la cámara');
  } else {
    Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar fotos.');
  }
  return false;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status === 'granted') return true;
  if (!canAskAgain) {
    showDeniedAlert('rastrear tu ruta GPS');
  } else {
    Alert.alert('Permiso requerido', 'Necesitamos acceso a tu ubicación para el seguimiento GPS.');
  }
  return false;
}

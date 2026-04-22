import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(): Promise<string | null> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const token = (await Notifications.getDevicePushTokenAsync()).data;
    if (token) await api.updateProfile({ fcmToken: token });
    return token;
  } catch (e) {
    console.warn('[notifications] registerPushToken error:', e);
    return null;
  }
}

export function setupNotificationListeners(
  onNotification?: (n: Notifications.Notification) => void,
  onResponse?: (r: Notifications.NotificationResponse) => void,
) {
  const sub1 = Notifications.addNotificationReceivedListener(n => onNotification?.(n));
  const sub2 = Notifications.addNotificationResponseReceivedListener(r => onResponse?.(r));
  return () => { sub1.remove(); sub2.remove(); };
}

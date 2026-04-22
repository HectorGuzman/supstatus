import { ensureFirebase } from '../config/firebase.js';

const admin = ensureFirebase();

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: { priority: 'high', notification: { sound: 'default' } },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  } catch (e: any) {
    // Token invalid/expired — ignore silently
    if (e?.code !== 'messaging/registration-token-not-registered') {
      console.error('[notifications] FCM error:', e?.code, e?.message);
    }
  }
}

export async function getUserFcmToken(uid: string): Promise<string | null> {
  const doc = await admin.firestore().collection('users').doc(uid).get();
  return doc.data()?.fcmToken ?? null;
}

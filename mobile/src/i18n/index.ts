import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import es from './es.json';
import en from './en.json';

const LANGUAGE_KEY = '@supstatus:language';

export async function getStoredLanguage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

export async function setStoredLanguage(lang: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch {}
}

export async function initI18n() {
  const stored = await getStoredLanguage();
  const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'es';
  const lng = stored ?? (deviceLocale.startsWith('en') ? 'en' : 'es');

  await i18n.use(initReactI18next).init({
    resources: { es: { translation: es }, en: { translation: en } },
    lng,
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  });
}

export async function changeLanguage(lang: string) {
  await i18n.changeLanguage(lang);
  await setStoredLanguage(lang);
}

export { i18n };
export default i18n;

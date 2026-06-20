import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import bm from './locales/bm.json';
import en_v2 from './locales/en_v2.json';
import bm_v2 from './locales/bm_v2.json';

const LANGUAGE_KEY = 'app_language';

const enDict = en.translation ? en.translation : en;
const bmDict = bm.translation ? bm.translation : bm;
const enV2Dict = en_v2.translation ? en_v2.translation : en_v2;
const bmV2Dict = bm_v2.translation ? bm_v2.translation : bm_v2;

const combinedEn = { ...enDict, ...enV2Dict };
const combinedBm = { ...bmDict, ...bmV2Dict };

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      callback(savedLanguage || 'bm');
    } catch (e) {
      callback('bm');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    fallbackLng: 'bm',
    resources: {
      en: { translation: combinedEn },
      bm: { translation: combinedBm },
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    }
  });

export default i18n;
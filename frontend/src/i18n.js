import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/translation.json';
import mr from './locales/mr/translation.json';
import hi from './locales/hi/translation.json';

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources: {
            en: { translation: en },
            mr: { translation: mr },
            hi: { translation: hi },
        },
        lng: 'en',           // default language
        fallbackLng: 'en',   // fallback if a key is missing
        interpolation: {
            escapeValue: false, // React already escapes values
        },
    });

export default i18n;

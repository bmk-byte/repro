import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import formsEn from './locales/forms.en.json';
import formsFr from './locales/forms.fr.json';
import moderationEn from './locales/moderation.en.json';
import moderationFr from './locales/moderation.fr.json';
import rapidResponseEn from './locales/rapidResponse.en.json';
import rapidResponseFr from './locales/rapidResponse.fr.json';
import analyticsEn from './locales/analytics.en.json';
import analyticsFr from './locales/analytics.fr.json';
import miscEn from './locales/misc.en.json';
import miscFr from './locales/misc.fr.json';
import { getLanguagePreference } from '../lib/languagePreference';

// Split into multiple namespaces (rather than one giant translation.json) so
// large feature areas (forms, moderation, rapid response, analytics, misc)
// can be worked on independently without every change touching the same
// two files. `translation` (the default namespace) holds the app chrome
// covered first: nav, auth, settings, landing, dashboard, cases, judgments,
// laws, resources, footer.
i18n.use(initReactI18next).init({
  ns: ['translation', 'forms', 'moderation', 'rapidResponse', 'analytics', 'misc'],
  defaultNS: 'translation',
  resources: {
    en: {
      translation: en,
      forms: formsEn,
      moderation: moderationEn,
      rapidResponse: rapidResponseEn,
      analytics: analyticsEn,
      misc: miscEn,
    },
    fr: {
      translation: fr,
      forms: formsFr,
      moderation: moderationFr,
      rapidResponse: rapidResponseFr,
      analytics: analyticsFr,
      misc: miscFr,
    },
  },
  lng: getLanguagePreference(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes output
  },
});

export default i18n;

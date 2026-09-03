export type AppLanguage = 'en' | 'fr';

const STORAGE_KEY = 'repropulse:language';

/** Device-local UI language preference. Defaults to English. */
export function getLanguagePreference(): AppLanguage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'fr' ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

export function setLanguagePreference(language: AppLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ignore write failures (private browsing, storage disabled, etc.) — the
    // preference just won't persist across sessions.
  }
}

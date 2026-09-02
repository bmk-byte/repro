const STORAGE_KEY = 'repropulse:toasts-enabled';

/** Device-local preference for whether pop-up toast notifications are shown. Defaults to enabled. */
export function getToastsEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

export function setToastsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Ignore write failures (private browsing, storage disabled, etc.) — the
    // preference just won't persist across sessions.
  }
}

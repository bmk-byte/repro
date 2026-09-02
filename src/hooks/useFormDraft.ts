import { useEffect, useCallback } from 'react';

const PREFIX = 'form-draft:';

export function useFormDraft<T>(key: string, initialData: T) {
  const storageKey = `${PREFIX}${key}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        return;
      }
      localStorage.setItem(storageKey, JSON.stringify(initialData));
    } catch {
      // localStorage unavailable — silently skip
    }
  }, [storageKey, initialData]);

  const loadDraft = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === null) return null;
      return JSON.parse(saved) as T;
    } catch {
      return null;
    }
  }, [storageKey]);

  const saveDraft = useCallback((data: T) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // storage full or unavailable — silently skip
    }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // silently skip
    }
  }, [storageKey]);

  return { loadDraft, saveDraft, clearDraft };
}

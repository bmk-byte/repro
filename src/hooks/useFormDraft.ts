import { useCallback } from 'react';

const PREFIX = 'form-draft:';

export function useFormDraft<T>(key: string, initialData: T) {
  const storageKey = `${PREFIX}${key}`;
  // `initialData` is intentionally unused at runtime now — it exists only
  // so callers don't have to write out T explicitly (e.g.
  // `useFormDraft(draftKey, { formData: initialFormData, ... })` rather
  // than `useFormDraft<MyDraftShape>(draftKey)`), keeping every call site
  // unchanged. See the note above loadDraft() for why it's no longer used
  // to seed storage.
  void initialData;

  // Deliberately does NOT seed localStorage with the blank initial form
  // shape on first mount — a prior version did, which meant a form
  // visited once (with nothing ever actually saved) would still find a
  // non-null "draft" on the next visit: the blank seed. Callers restore
  // whenever loadDraft() returns non-null (as a real saved draft always
  // does), so that seed was indistinguishable from a genuine draft and
  // produced a "draft restored" toast whose form fields never actually
  // changed, since there was nothing but blanks to restore. With no
  // seeding, an unsaved form correctly reports no draft (`null`) instead.

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

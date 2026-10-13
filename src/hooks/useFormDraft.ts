import { useCallback } from 'react';

const PREFIX = 'form-draft:';

// Some drafts (e.g. a Rapid Response case) carry a client's name, email,
// and phone number in plain text in the browser's localStorage. There is
// no real encryption story for client-side storage without a key the
// browser could also just read, so the practical mitigation is shrinking
// how long a forgotten draft sits there: a draft older than this is
// treated as if it were never saved.
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface DraftEnvelope<T> {
  savedAt: number;
  data: T;
}

/** Removes every saved form draft — called on sign-out so a draft typed
 * on a shared device doesn't outlive the session that created it. */
export function clearAllFormDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // storage unavailable — nothing to clear
  }
}

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
      const parsed = JSON.parse(saved) as DraftEnvelope<T> | T;
      // Older drafts saved before the envelope was introduced have no
      // `savedAt` — treat them as expired rather than trusting their age.
      if (!parsed || typeof parsed !== 'object' || !('savedAt' in parsed)) {
        localStorage.removeItem(storageKey);
        return null;
      }
      const envelope = parsed as DraftEnvelope<T>;
      if (Date.now() - envelope.savedAt > MAX_DRAFT_AGE_MS) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return envelope.data;
    } catch {
      return null;
    }
  }, [storageKey]);

  const saveDraft = useCallback((data: T) => {
    try {
      const envelope: DraftEnvelope<T> = { savedAt: Date.now(), data };
      localStorage.setItem(storageKey, JSON.stringify(envelope));
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

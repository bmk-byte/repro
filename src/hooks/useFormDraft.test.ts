import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormDraft } from './useFormDraft';

/**
 * Regression guard for a real bug: useFormDraft used to seed localStorage
 * with the blank initial form shape on first mount if nothing was saved
 * yet. That seed was a non-null object, indistinguishable from a genuine
 * saved draft to a caller checking `if (loadDraft()) { ...show "restored"
 * toast... }` — so visiting a form once (with nothing ever actually
 * typed or saved) produced a "draft restored" toast on the next visit,
 * with no actual data to restore. See RapidResponseCaseForm.tsx /
 * SubmitCaseForm.tsx / SubmitJudgmentForm.tsx for the real consumers this
 * affected.
 */

beforeEach(() => {
  localStorage.clear();
});

describe('useFormDraft', () => {
  it('returns null from loadDraft when nothing has ever been saved — does not seed a blank draft', () => {
    const { result } = renderHook(() => useFormDraft('test-form', { name: '' }));
    expect(result.current.loadDraft()).toBeNull();
    // Confirms no seeding side effect happened on mount.
    expect(localStorage.getItem('form-draft:test-form')).toBeNull();
  });

  it('round-trips real saved data through saveDraft/loadDraft', () => {
    const { result } = renderHook(() => useFormDraft('test-form', { name: '' }));

    act(() => {
      result.current.saveDraft({ name: 'Jane Doe' });
    });

    expect(result.current.loadDraft()).toEqual({ name: 'Jane Doe' });
  });

  it('clearDraft removes a saved draft so loadDraft returns null again', () => {
    const { result } = renderHook(() => useFormDraft('test-form', { name: '' }));

    act(() => {
      result.current.saveDraft({ name: 'Jane Doe' });
    });
    expect(result.current.loadDraft()).not.toBeNull();

    act(() => {
      result.current.clearDraft();
    });
    expect(result.current.loadDraft()).toBeNull();
  });

  it('mounting the hook twice for the same key without ever saving still reports no draft', () => {
    // This is the exact shape of the original bug: open the form (mount),
    // navigate away (unmount), come back (mount again) — with no save in
    // between. loadDraft() must stay null throughout.
    const { unmount } = renderHook(() => useFormDraft('test-form', { name: '' }));
    unmount();

    const { result } = renderHook(() => useFormDraft('test-form', { name: '' }));
    expect(result.current.loadDraft()).toBeNull();
  });
});

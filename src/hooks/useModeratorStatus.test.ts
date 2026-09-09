import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

/**
 * Regression guard for the moderator self-escalation vulnerability fixed in
 * supabase/migrations/20260824113626_lock_is_moderator_column.sql: this hook
 * must never attempt to write `is_moderator` (via .update()/.upsert()) from
 * the client — that decision belongs entirely to the server-side trigger.
 * If this test starts failing because the hook calls .update() or
 * .upsert() on `profiles`, that's the vulnerability being reintroduced.
 */

const { updateSpy, upsertSpy, maybeSingleSpy } = vi.hoisted(() => ({
  updateSpy: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  upsertSpy: vi.fn().mockResolvedValue({ error: null }),
  maybeSingleSpy: vi.fn().mockResolvedValue({ data: { is_moderator: false }, error: null }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'someone@example.com' } } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: maybeSingleSpy,
        }),
      }),
      update: updateSpy,
      upsert: upsertSpy,
    }),
  },
}));

import { useModeratorStatus } from './useModeratorStatus';

describe('useModeratorStatus', () => {
  beforeEach(() => {
    updateSpy.mockClear();
    upsertSpy.mockClear();
  });

  it('only reads is_moderator — never writes it from the client', async () => {
    const { result } = renderHook(() => useModeratorStatus());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(updateSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(result.current.isModerator).toBe(false);
  });
});

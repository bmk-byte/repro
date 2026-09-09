import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { reportError } from '../lib/errorReporting';

interface UseModeratorStatusProps {
  isConnected?: boolean;
}

export const useModeratorStatus = (props?: UseModeratorStatusProps) => {
  const { isConnected = true } = props || {};
  // isModerator means "has moderator-or-higher access" (is_moderator OR
  // is_admin) — admin is a strict superset of moderator (see
  // supabase/migrations/20260903080000_add_admin_role.sql), so every
  // existing `if (!isModerator)` gate across the app admits admins too
  // without needing to be individually updated. Use isAdmin for anything
  // that must be admin-exclusive (e.g. the admin management panel).
  const [isModerator, setIsModerator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any | undefined>(undefined);

  useEffect(() => {
    if (!isConnected) {
      setLoading(false);
      return;
    }

    const getInitialUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
      } catch (err) {
        console.error('Failed to get initial user:', err);
        reportError(err, { context: 'useModeratorStatus.getInitialUser', category: 'AUTHENTICATION' });
        setLoading(false);
      }
    };

    getInitialUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConnected]);

  useEffect(() => {
    const checkModeratorStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!isConnected || !user) {
          setIsModerator(false);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // NOTE: moderator/admin status is granted server-side only
        // (Postgres triggers on `profiles`, see
        // supabase/migrations/*_lock_is_moderator_column.sql and
        // *_add_admin_role.sql). This hook is read-only — it never writes
        // these columns itself, since any client-side write is rejected by
        // the database regardless of what this code claims.
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_moderator, is_admin')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          if (profileError.message?.includes('Invalid Refresh Token') ||
              profileError.message?.includes('refresh_token_not_found') ||
              profileError.code === 'refresh_token_not_found') {
            await supabase.auth.signOut();
            setIsModerator(false);
            setIsAdmin(false);
            setError('Session expired. Please sign in again.');
            toast.error('Your session has expired. Please sign in again.');
            return;
          }

          console.error('Error checking moderator status:', profileError);
          reportError(profileError, { context: 'useModeratorStatus.checkModeratorStatus', category: 'SECURITY' });
          setError('Failed to verify your permissions. Please refresh the page.');
          setIsModerator(false);
          setIsAdmin(false);
        } else {
          setIsAdmin(profile?.is_admin || false);
          setIsModerator((profile?.is_moderator || false) || (profile?.is_admin || false));
        }
      } catch (err) {
        if (err && typeof err === 'object' && 'message' in err) {
          const errorMessage = (err as any).message;
          if (errorMessage?.includes('Invalid Refresh Token') ||
              errorMessage?.includes('refresh_token_not_found')) {
            await supabase.auth.signOut();
            setIsModerator(false);
            setIsAdmin(false);
            setError('Session expired. Please sign in again.');
            toast.error('Your session has expired. Please sign in again.');
            return;
          }
        }

        console.error('Error checking moderator status:', err);
        reportError(err, { context: 'useModeratorStatus.checkModeratorStatus.catch', category: 'SECURITY' });
        setError('Failed to verify your permissions. Please refresh the page.');
        setIsModerator(false);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    if (isConnected && user) {
      checkModeratorStatus();
    } else if (user === null) {
      // User has been fetched and there is none
      setIsModerator(false);
      setIsAdmin(false);
      setLoading(false);
    }
    // user === undefined: still fetching initial user — keep loading: true
  }, [user, isConnected]);

  return { isModerator, isAdmin, loading, error };
};

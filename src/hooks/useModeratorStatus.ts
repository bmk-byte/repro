import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface UseModeratorStatusProps {
  isConnected?: boolean;
}

export const useModeratorStatus = (props?: UseModeratorStatusProps) => {
  const { isConnected = true } = props || {};
  const [isModerator, setIsModerator] = useState(false);
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
          setLoading(false);
          return;
        }

        // NOTE: moderator status is granted server-side only (a Postgres
        // trigger on `profiles`, see supabase/migrations/*_lock_is_moderator_column.sql).
        // This hook is read-only — it never writes `is_moderator` itself,
        // since any client-side write to that column is now rejected by the
        // database regardless of what this code claims.
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_moderator')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          if (profileError.message?.includes('Invalid Refresh Token') ||
              profileError.message?.includes('refresh_token_not_found') ||
              profileError.code === 'refresh_token_not_found') {
            await supabase.auth.signOut();
            setIsModerator(false);
            setError('Session expired. Please sign in again.');
            toast.error('Your session has expired. Please sign in again.');
            return;
          }

          console.error('Error checking moderator status:', profileError);
          setError('Failed to verify your permissions. Please refresh the page.');
          setIsModerator(false);
        } else {
          setIsModerator(profile?.is_moderator || false);
        }
      } catch (err) {
        if (err && typeof err === 'object' && 'message' in err) {
          const errorMessage = (err as any).message;
          if (errorMessage?.includes('Invalid Refresh Token') ||
              errorMessage?.includes('refresh_token_not_found')) {
            await supabase.auth.signOut();
            setIsModerator(false);
            setError('Session expired. Please sign in again.');
            toast.error('Your session has expired. Please sign in again.');
            return;
          }
        }

        console.error('Error checking moderator status:', err);
        setError('Failed to verify your permissions. Please refresh the page.');
        setIsModerator(false);
      } finally {
        setLoading(false);
      }
    };

    if (isConnected && user) {
      checkModeratorStatus();
    } else if (user === null) {
      // User has been fetched and there is none
      setIsModerator(false);
      setLoading(false);
    }
    // user === undefined: still fetching initial user — keep loading: true
  }, [user, isConnected]);

  return { isModerator, loading, error };
};

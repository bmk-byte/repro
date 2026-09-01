import React from 'react';
import { ShieldCheck, ShieldOff, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { handleQueryError } from '../lib/errorHandling';
import { sanitizeEmail } from '../lib/sanitize';

interface Moderator {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  created_at: string;
}

/**
 * Moderator status can only change through the `admin_set_moderator` RPC
 * (see supabase/migrations/20260824114500_moderator_admin_rpc.sql), which
 * itself only runs for callers who are already moderators. There is no
 * direct `profiles.is_moderator` write anywhere in this component — that
 * path is rejected by the database regardless.
 */
const ModeratorAdminPanel: React.FC = () => {
  const [moderators, setModerators] = React.useState<Moderator[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newEmail, setNewEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const fetchModerators = React.useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_moderators');
      if (error) throw error;
      setModerators(data || []);
    } catch (error) {
      handleQueryError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchModerators();
  }, [fetchModerators]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = sanitizeEmail(newEmail);
    if (!email) {
      toast.error('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_set_moderator', {
        target_email: email,
        should_grant: true,
      });
      if (error) throw error;
      toast.success(`Granted moderator access to ${email}.`);
      setNewEmail('');
      fetchModerators();
    } catch (error) {
      handleQueryError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (moderator: Moderator) => {
    if (!confirm(`Remove moderator access for ${moderator.email}?`)) return;

    try {
      const { error } = await supabase.rpc('admin_set_moderator', {
        target_email: moderator.email,
        should_grant: false,
      });
      if (error) throw error;
      toast.success(`Removed moderator access for ${moderator.email}.`);
      fetchModerators();
    } catch (error) {
      handleQueryError(error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Moderators</h2>
        <p className="mt-1 text-sm text-stone-600">
          Grant or revoke moderator access. Changes are recorded in the audit log.
        </p>
      </div>

      <form onSubmit={handleGrant} className="bg-white rounded-lg shadow-md p-6 flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <label htmlFor="new-moderator-email" className="block text-sm font-medium text-stone-700 mb-1">
            Grant access by email
          </label>
          <input
            id="new-moderator-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="person@organization.org"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          Grant
        </button>
      </form>

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b">
          <h3 className="text-sm font-medium text-stone-700">
            Current moderators {!loading && `(${moderators.length})`}
          </h3>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-stone-500">Loading…</div>
        ) : moderators.length === 0 ? (
          <div className="p-6 text-sm text-stone-500">No moderators found.</div>
        ) : (
          <ul className="divide-y">
            {moderators.map((mod) => (
              <li key={mod.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-stone-900">{mod.full_name || mod.email}</p>
                    <p className="text-xs text-stone-500">{mod.email}{mod.organization ? ` · ${mod.organization}` : ''}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(mod)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ModeratorAdminPanel;

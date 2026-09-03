import React from 'react';
import { ShieldCheck, ShieldOff, UserPlus, ScrollText } from 'lucide-react';
import { toast } from '../lib/toast';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { handleQueryError } from '../lib/errorHandling';
import { sanitizeEmail } from '../lib/sanitize';
import { sendEmail } from '../lib/email';
import { renderEmail } from '../lib/emailTemplates';
import { Card, Button, Input, ConfirmDialog, Badge, LoadingState, EmptyState } from './ui';

interface Moderator {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  created_at: string;
}

interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  changes: Record<string, unknown> | null;
  performed_by: string | null;
  performed_at: string;
}

const ACTION_TONE: Record<string, 'success' | 'info' | 'danger' | 'neutral'> = {
  insert: 'success',
  update: 'info',
  delete: 'danger',
};

/**
 * Recent moderator/admin activity — grant/revoke, submission moderation,
 * etc. — read-only, sourced from the `audit_logs` table that several
 * server-side functions (e.g. admin_set_moderator) already write to. This
 * table has no declared foreign key to `profiles`, so who performed each
 * action is resolved with a second query and merged client-side.
 */
export const AuditLogPanel: React.FC = () => {
  const [entries, setEntries] = React.useState<AuditLogEntry[]>([]);
  const [performerNames, setPerformerNames] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchAuditLog = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: logs, error: logsError } = await supabase
          .from('audit_logs')
          .select('id, table_name, record_id, action, changes, performed_by, performed_at')
          .order('performed_at', { ascending: false })
          .limit(100);

        if (logsError) throw logsError;
        setEntries(logs || []);

        const performerIds = Array.from(
          new Set((logs || []).map(l => l.performed_by).filter((id): id is string => !!id))
        );
        if (performerIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', performerIds);

          if (profilesError) throw profilesError;
          const names: Record<string, string> = {};
          (profiles || []).forEach(p => { names[p.id] = p.full_name || p.email; });
          setPerformerNames(names);
        }
      } catch (err) {
        console.error('Error fetching audit log:', err);
        setError(handleSupabaseError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLog();
  }, []);

  return (
    <Card padding="none">
      <div className="px-6 py-4 border-b border-stone-100">
        <h3 className="text-sm font-medium text-stone-700">Recent activity</h3>
        <p className="mt-0.5 text-xs text-stone-500">The last 100 moderator/admin actions recorded by the system.</p>
      </div>

      {loading ? (
        <LoadingState label="Loading audit log…" />
      ) : error ? (
        <div className="p-6 text-sm text-danger">{error}</div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-8 w-8" />}
          title="No activity recorded yet"
          description="Moderator and admin actions will appear here as they happen."
        />
      ) : (
        <ul className="divide-y divide-stone-100 max-h-[28rem] overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.id} className="px-6 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge tone={ACTION_TONE[entry.action] ?? 'neutral'}>{entry.action}</Badge>
                  <span className="text-sm text-stone-900 truncate">{entry.table_name}</span>
                </div>
                <span className="text-xs text-stone-500 shrink-0">
                  {new Date(entry.performed_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {entry.performed_by
                  ? performerNames[entry.performed_by] || 'Unknown user'
                  : 'System'}
                {entry.changes && Object.keys(entry.changes).length > 0 && (
                  <span className="ml-1">
                    · {Object.entries(entry.changes).slice(0, 3).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

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
  const [pendingGrantEmail, setPendingGrantEmail] = React.useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = React.useState<Moderator | null>(null);

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

  const handleGrantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = sanitizeEmail(newEmail);
    if (!email) {
      toast.error('Enter a valid email address.');
      return;
    }
    setPendingGrantEmail(email);
  };

  const doGrant = async (email: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_set_moderator', {
        target_email: email,
        should_grant: true,
      });
      if (error) throw error;
      toast.success(`Granted moderator access to ${email}.`);
      sendEmail({
        to: email,
        subject: "You've been granted moderator access on ReproPulse",
        html: renderEmail({
          heading: 'Moderator Access Granted',
          body: "You've been granted moderator access on ReproPulse. You can now review, approve, and reject submissions.",
        }),
      }).catch((err) => console.error('Failed to send moderator-grant notification email:', err));
      setNewEmail('');
      fetchModerators();
    } catch (error) {
      handleQueryError(error);
    } finally {
      setSubmitting(false);
      setPendingGrantEmail(null);
    }
  };

  const doRevoke = async (moderator: Moderator) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_set_moderator', {
        target_email: moderator.email,
        should_grant: false,
      });
      if (error) throw error;
      toast.success(`Removed moderator access for ${moderator.email}.`);
      sendEmail({
        to: moderator.email,
        subject: 'Your moderator access on ReproPulse has been revoked',
        html: renderEmail({
          heading: 'Moderator Access Revoked',
          body: 'Your moderator access on ReproPulse has been revoked. If you believe this is a mistake, please contact an administrator.',
        }),
      }).catch((err) => console.error('Failed to send moderator-revoke notification email:', err));
      fetchModerators();
    } catch (error) {
      handleQueryError(error);
    } finally {
      setSubmitting(false);
      setPendingRevoke(null);
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

      <Card padding="lg">
        <form onSubmit={handleGrantSubmit} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <Input
              label="Grant access by email"
              id="new-moderator-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="person@organization.org"
              required
            />
          </div>
          <Button type="submit" disabled={submitting} icon={<UserPlus className="h-4 w-4" />}>
            Grant
          </Button>
        </form>
      </Card>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-stone-100">
          <h3 className="text-sm font-medium text-stone-700">
            Current moderators {!loading && `(${moderators.length})`}
          </h3>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-stone-500">Loading…</div>
        ) : moderators.length === 0 ? (
          <div className="p-6 text-sm text-stone-500">No moderators found.</div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {moderators.map((mod) => (
              <li key={mod.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-stone-900">{mod.full_name || mod.email}</p>
                    <p className="text-xs text-stone-500">{mod.email}{mod.organization ? ` · ${mod.organization}` : ''}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingRevoke(mod)}
                  icon={<ShieldOff className="h-3.5 w-3.5" />}
                  className="!border-danger/30 !text-danger hover:!bg-danger-light"
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AuditLogPanel />

      <ConfirmDialog
        isOpen={!!pendingGrantEmail}
        onClose={() => setPendingGrantEmail(null)}
        onConfirm={() => pendingGrantEmail && doGrant(pendingGrantEmail)}
        title="Grant moderator access?"
        description={`${pendingGrantEmail} will be able to approve and publish submissions, and manage other moderators. Double-check the email address before continuing.`}
        confirmLabel="Grant access"
        loading={submitting}
      />

      <ConfirmDialog
        isOpen={!!pendingRevoke}
        onClose={() => setPendingRevoke(null)}
        onConfirm={() => pendingRevoke && doRevoke(pendingRevoke)}
        title="Revoke moderator access?"
        description={`${pendingRevoke?.email} will no longer be able to approve, reject, or publish submissions.`}
        confirmLabel="Revoke access"
        confirmVariant="danger"
        loading={submitting}
      />
    </div>
  );
};

export default ModeratorAdminPanel;

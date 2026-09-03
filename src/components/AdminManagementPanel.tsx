import React from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, ShieldOff, UserPlus } from 'lucide-react';
import { toast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { handleQueryError } from '../lib/errorHandling';
import { sanitizeEmail } from '../lib/sanitize';
import { sendEmail } from '../lib/email';
import { renderEmail } from '../lib/emailTemplates';
import { Card, Button, Input, ConfirmDialog } from './ui';
import { AuditLogPanel } from './ModeratorAdminPanel';

interface Admin {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  created_at: string;
}

/**
 * Admin status can only change through the `admin_set_admin` RPC (see
 * supabase/migrations/20260903080000_add_admin_role.sql), which itself only
 * runs for callers who are already admins. There is no direct
 * `profiles.is_admin` write anywhere in this component — that path is
 * rejected by the database regardless. Admin is a strict superset of
 * moderator (see permissions.ts / useModeratorStatus.ts), so granting admin
 * here also grants every moderator capability without a separate step.
 */
const AdminManagementPanel: React.FC = () => {
  const { t } = useTranslation('moderation');
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newEmail, setNewEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [pendingGrantEmail, setPendingGrantEmail] = React.useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = React.useState<Admin | null>(null);

  const fetchAdmins = React.useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_admins');
      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      handleQueryError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleGrantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = sanitizeEmail(newEmail);
    if (!email) {
      toast.error(t('adminManagementPanel.enterValidEmail'));
      return;
    }
    setPendingGrantEmail(email);
  };

  const doGrant = async (email: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_set_admin', {
        target_email: email,
        should_grant: true,
      });
      if (error) throw error;
      toast.success(t('adminManagementPanel.grantedAccessSuccess', { email }));
      sendEmail({
        to: email,
        subject: "You've been granted admin access on ReproPulse",
        html: renderEmail({
          heading: 'Admin Access Granted',
          body: "You've been granted full system admin access on ReproPulse — every moderator capability, plus unrestricted access across all organizations' data for system-level changes.",
        }),
      }).catch((err) => console.error('Failed to send admin-grant notification email:', err));
      setNewEmail('');
      fetchAdmins();
    } catch (error) {
      handleQueryError(error);
    } finally {
      setSubmitting(false);
      setPendingGrantEmail(null);
    }
  };

  const doRevoke = async (admin: Admin) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_set_admin', {
        target_email: admin.email,
        should_grant: false,
      });
      if (error) throw error;
      toast.success(t('adminManagementPanel.revokedAccessSuccess', { email: admin.email }));
      sendEmail({
        to: admin.email,
        subject: 'Your admin access on ReproPulse has been revoked',
        html: renderEmail({
          heading: 'Admin Access Revoked',
          body: 'Your full system admin access on ReproPulse has been revoked. If you believe this is a mistake, please contact another admin.',
        }),
      }).catch((err) => console.error('Failed to send admin-revoke notification email:', err));
      fetchAdmins();
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
        <h2 className="text-2xl font-semibold text-stone-900">{t('adminManagementPanel.heading')}</h2>
        <p className="mt-1 text-sm text-stone-600">
          {t('adminManagementPanel.subheading')}
        </p>
      </div>

      <Card padding="lg">
        <form onSubmit={handleGrantSubmit} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <Input
              label={t('adminManagementPanel.grantAccessByEmail')}
              id="new-admin-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t('adminManagementPanel.emailPlaceholder')}
              required
            />
          </div>
          <Button type="submit" disabled={submitting} icon={<UserPlus className="h-4 w-4" />}>
            {t('adminManagementPanel.grant')}
          </Button>
        </form>
      </Card>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-stone-100">
          <h3 className="text-sm font-medium text-stone-700">
            {t('adminManagementPanel.currentAdminsCount', { count: loading ? 0 : admins.length })}
          </h3>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-stone-500">{t('adminManagementPanel.loading')}</div>
        ) : admins.length === 0 ? (
          <div className="p-6 text-sm text-stone-500">{t('adminManagementPanel.noAdminsFound')}</div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {admins.map((admin) => (
              <li key={admin.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-stone-900">{admin.full_name || admin.email}</p>
                    <p className="text-xs text-stone-500">{admin.email}{admin.organization ? ` · ${admin.organization}` : ''}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingRevoke(admin)}
                  icon={<ShieldOff className="h-3.5 w-3.5" />}
                  className="!border-danger/30 !text-danger hover:!bg-danger-light"
                >
                  {t('adminManagementPanel.revoke')}
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
        title={t('adminManagementPanel.grantConfirmTitle')}
        description={t('adminManagementPanel.grantConfirmDescription', { email: pendingGrantEmail })}
        confirmLabel={t('adminManagementPanel.grantConfirmLabel')}
        loading={submitting}
      />

      <ConfirmDialog
        isOpen={!!pendingRevoke}
        onClose={() => setPendingRevoke(null)}
        onConfirm={() => pendingRevoke && doRevoke(pendingRevoke)}
        title={t('adminManagementPanel.revokeConfirmTitle')}
        description={t('adminManagementPanel.revokeConfirmDescription', { email: pendingRevoke?.email })}
        confirmLabel={t('adminManagementPanel.revokeConfirmLabel')}
        confirmVariant="danger"
        loading={submitting}
      />
    </div>
  );
};

export default AdminManagementPanel;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Award, ShieldOff, UserPlus } from 'lucide-react';
import { toast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { handleQueryError } from '../../lib/errorHandling';
import { sanitizeEmail } from '../../lib/sanitize';
import { Card, Button, Input, ConfirmDialog } from '../../components/ui';

interface ScorecardEditor {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  created_at: string;
}

/**
 * Scorecard-editor status can only change through the
 * `admin_set_scorecard_editor` RPC (see
 * supabase/migrations/20261001075948_create_scorecard_schema.sql), which
 * itself only runs for callers who are already admins. There is no direct
 * `profiles.is_scorecard_editor` write anywhere in this component — that
 * path is rejected by the database regardless.
 */
const ScorecardEditorAdminPanel: React.FC = () => {
  const { t } = useTranslation('scorecard');
  const [editors, setEditors] = React.useState<ScorecardEditor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newEmail, setNewEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [pendingGrantEmail, setPendingGrantEmail] = React.useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = React.useState<ScorecardEditor | null>(null);

  const fetchEditors = React.useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('list_scorecard_editors');
      if (error) throw error;
      setEditors(data || []);
    } catch (error) {
      handleQueryError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchEditors();
  }, [fetchEditors]);

  const handleGrantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = sanitizeEmail(newEmail);
    if (!email) {
      toast.error(t('editorAdminPanel.enterValidEmail'));
      return;
    }
    setPendingGrantEmail(email);
  };

  const doGrant = async (email: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_set_scorecard_editor', {
        target_email: email,
        should_grant: true,
      });
      if (error) throw error;
      toast.success(t('editorAdminPanel.grantedSuccess', { email }));
      setNewEmail('');
      fetchEditors();
    } catch (error) {
      handleQueryError(error);
    } finally {
      setSubmitting(false);
      setPendingGrantEmail(null);
    }
  };

  const doRevoke = async (editor: ScorecardEditor) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_set_scorecard_editor', {
        target_email: editor.email,
        should_grant: false,
      });
      if (error) throw error;
      toast.success(t('editorAdminPanel.revokedSuccess', { email: editor.email }));
      fetchEditors();
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
        <h2 className="text-2xl font-semibold text-stone-900">{t('editorAdminPanel.heading')}</h2>
        <p className="mt-1 text-sm text-stone-600">
          {t('editorAdminPanel.subheading')}
        </p>
      </div>

      <Card padding="lg">
        <form onSubmit={handleGrantSubmit} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <Input
              label={t('editorAdminPanel.grantByEmail')}
              id="new-scorecard-editor-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="name@example.org"
              required
            />
          </div>
          <Button type="submit" disabled={submitting} icon={<UserPlus className="h-4 w-4" />}>
            {t('editorAdminPanel.grant')}
          </Button>
        </form>
      </Card>

      <Card padding="none">
        <div className="px-6 py-4 border-b border-stone-100">
          <h3 className="text-sm font-medium text-stone-700">
            {loading ? t('editorAdminPanel.editorsTitle') : t('editorAdminPanel.editorsTitleCount', { count: editors.length })}
          </h3>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-stone-500">{t('editorAdminPanel.loading')}</div>
        ) : editors.length === 0 ? (
          <div className="p-6 text-sm text-stone-500">{t('editorAdminPanel.noEditorsFound')}</div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {editors.map((editor) => (
              <li key={editor.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-stone-900">{editor.full_name || editor.email}</p>
                    <p className="text-xs text-stone-500">{editor.email}{editor.organization ? ` · ${editor.organization}` : ''}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingRevoke(editor)}
                  icon={<ShieldOff className="h-3.5 w-3.5" />}
                  className="!border-danger/30 !text-danger hover:!bg-danger-light"
                >
                  {t('editorAdminPanel.revoke')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        isOpen={!!pendingGrantEmail}
        onClose={() => setPendingGrantEmail(null)}
        onConfirm={() => pendingGrantEmail && doGrant(pendingGrantEmail)}
        title={t('editorAdminPanel.grantConfirmTitle')}
        description={t('editorAdminPanel.grantConfirmDescription', { email: pendingGrantEmail })}
        confirmLabel={t('editorAdminPanel.grantConfirmLabel')}
        loading={submitting}
      />

      <ConfirmDialog
        isOpen={!!pendingRevoke}
        onClose={() => setPendingRevoke(null)}
        onConfirm={() => pendingRevoke && doRevoke(pendingRevoke)}
        title={t('editorAdminPanel.revokeConfirmTitle')}
        description={t('editorAdminPanel.revokeConfirmDescription', { email: pendingRevoke?.email })}
        confirmLabel={t('editorAdminPanel.revokeConfirmLabel')}
        confirmVariant="danger"
        loading={submitting}
      />
    </div>
  );
};

export default ScorecardEditorAdminPanel;

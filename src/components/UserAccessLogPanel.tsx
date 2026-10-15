import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { handleQueryError } from '../lib/errorHandling';
import { Card, LoadingState, EmptyState } from './ui';

interface UserAccessLog {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  last_sign_in_at: string | null;
  created_at: string;
}

/**
 * Admin-only: when each user last signed in. Last-sign-in time lives on
 * Supabase's own auth.users table, which no client can query directly, so
 * this reads from the list_user_access_logs() RPC (see
 * supabase/migrations/20261015120000_add_user_access_log_rpc.sql), which
 * itself rejects non-admin callers.
 */
const UserAccessLogPanel: React.FC = () => {
  const { t } = useTranslation('moderation');
  const [logs, setLogs] = React.useState<UserAccessLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('list_user_access_logs');
        if (error) throw error;
        setLogs(data || []);
      } catch (error) {
        handleQueryError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((log) =>
      (log.full_name || '').toLowerCase().includes(term) ||
      log.email.toLowerCase().includes(term) ||
      (log.organization || '').toLowerCase().includes(term)
    );
  }, [logs, searchTerm]);

  return (
    <Card padding="none">
      <div className="px-6 py-4 border-b border-stone-100 space-y-3">
        <div>
          <h3 className="text-sm font-medium text-stone-700">{t('userAccessLogPanel.heading')}</h3>
          <p className="mt-0.5 text-xs text-stone-500">{t('userAccessLogPanel.subheading')}</p>
        </div>
        {!loading && logs.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder={t('userAccessLogPanel.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-stone-300 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState label={t('userAccessLogPanel.loading')} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-8 w-8" />}
          title={t('userAccessLogPanel.emptyTitle')}
          description={t('userAccessLogPanel.emptyDescription')}
        />
      ) : filteredLogs.length === 0 ? (
        <div className="p-6 text-sm text-stone-500">{t('userAccessLogPanel.noSearchResults')}</div>
      ) : (
        <ul className="divide-y divide-stone-100 max-h-[28rem] overflow-y-auto">
          {filteredLogs.map((log) => (
            <li key={log.id} className="flex items-center justify-between gap-3 px-6 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{log.full_name || log.email}</p>
                <p className="text-xs text-stone-500 truncate">
                  {log.email}{log.organization ? ` · ${log.organization}` : ''}
                </p>
              </div>
              <span className="text-xs text-stone-500 shrink-0 text-right">
                {log.last_sign_in_at
                  ? new Date(log.last_sign_in_at).toLocaleString()
                  : t('userAccessLogPanel.neverSignedIn')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default UserAccessLogPanel;

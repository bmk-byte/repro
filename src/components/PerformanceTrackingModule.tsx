import React from 'react';
import { Card, Title, Text, Flex } from '@tremor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Briefcase, CheckCircle2, Activity, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { LoadingState, ErrorState, EmptyState, Button } from './ui';
import { CHART_COLORS } from '../lib/chartColors';
import { chartHeight } from '../lib/chartLayout';

/**
 * Case activity by partner organization, using only values people record
 * on a case (partner, timeline status, date submitted). Nothing here is
 * estimated or scored: earlier versions showed a "KPI achievement",
 * "collaboration score" and "processing time" built from invented formulas
 * and a satisfaction field no form ever fills in, so those were removed.
 *
 * Which cases are counted is decided by the database's access rules, the
 * same ones the Cases page uses, so both pages always agree.
 */

type TimelineStatus = 'filed' | 'ongoing' | 'resolved' | 'dismissed';
const STATUSES: TimelineStatus[] = ['filed', 'ongoing', 'resolved', 'dismissed'];
const STATUS_COLORS: Record<TimelineStatus, string> = {
  filed: CHART_COLORS.info,
  ongoing: CHART_COLORS.warning,
  resolved: CHART_COLORS.success,
  dismissed: '#A8A29E', // stone-400: neutral, not a "bad" red
};

interface CaseRow {
  partner: string | null;
  timeline_status: string | null;
  created_at: string | null;
}

type OrgRow = { name: string; total: number } & Record<TimelineStatus, number>;

const PerformanceTrackingModule: React.FC = () => {
  const { t } = useTranslation('analytics');
  const [cases, setCases] = React.useState<CaseRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = React.useState<string>('all');

  const fetchCases = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: casesError } = await supabase
        .from('cases')
        .select('partner, timeline_status, created_at')
        .eq('moderation_status', 'approved')
        .is('deleted_at', null);
      if (casesError) throw casesError;
      setCases(data ?? []);
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError(t('performanceTracking.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const organizations = React.useMemo(
    () => Array.from(new Set(cases.map((c) => c.partner).filter((p): p is string => !!p))).sort(),
    [cases]
  );

  const visibleCases = React.useMemo(
    () => (selectedOrg === 'all' ? cases : cases.filter((c) => c.partner === selectedOrg)),
    [cases, selectedOrg]
  );

  const countBy = (status: TimelineStatus) => visibleCases.filter((c) => c.timeline_status === status).length;
  const resolved = countBy('resolved');
  const active = countBy('filed') + countBy('ongoing');
  const withStatus = visibleCases.filter((c) => STATUSES.includes(c.timeline_status as TimelineStatus)).length;
  const resolutionRate = withStatus > 0 ? Math.round((resolved / withStatus) * 100) : null;

  const orgRows: OrgRow[] = React.useMemo(() => {
    const rows: Record<string, OrgRow> = {};
    visibleCases.forEach((c) => {
      const name = c.partner || t('performanceTracking.unknownOrg');
      rows[name] ??= { name, total: 0, filed: 0, ongoing: 0, resolved: 0, dismissed: 0 };
      rows[name].total += 1;
      if (STATUSES.includes(c.timeline_status as TimelineStatus)) {
        rows[name][c.timeline_status as TimelineStatus] += 1;
      }
    });
    return Object.values(rows).sort((a, b) => b.total - a.total);
  }, [visibleCases, t]);

  // Cases submitted per month over the last 12 months.
  const monthlyRows = React.useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, name: d.toLocaleString(undefined, { month: 'short', year: '2-digit' }), cases: 0 };
    });
    const index = new Map(months.map((m, i) => [m.key, i]));
    visibleCases.forEach((c) => {
      if (!c.created_at) return;
      const d = new Date(c.created_at);
      const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (i !== undefined) months[i].cases += 1;
    });
    return months;
  }, [visibleCases]);

  const statCards = [
    { icon: Briefcase, label: t('performanceTracking.stats.approvedCases.title'), value: visibleCases.length, note: t('performanceTracking.stats.approvedCases.subtitle') },
    {
      icon: CheckCircle2,
      label: t('performanceTracking.stats.resolvedCases.title'),
      value: resolved,
      note: resolutionRate === null
        ? t('performanceTracking.stats.resolvedCases.noStatus')
        : t('performanceTracking.stats.resolvedCases.subtitle', { rate: resolutionRate }),
    },
    { icon: Activity, label: t('performanceTracking.stats.activeCases.title'), value: active, note: t('performanceTracking.stats.activeCases.subtitle') },
    { icon: Building2, label: t('performanceTracking.stats.organizations.title'), value: selectedOrg === 'all' ? organizations.length : 1, note: t('performanceTracking.stats.organizations.subtitle') },
  ];

  return (
    <Card>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <Title>{t('performanceTracking.title')}</Title>
        {organizations.length > 1 && (
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">{t('performanceTracking.allOrganizations')}</option>
            {organizations.map((org) => (
              <option key={org} value={org}>{org}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <LoadingState label={t('performanceTracking.loading')} />
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <ErrorState description={error} action={<Button onClick={fetchCases}>{t('performanceTracking.retry')}</Button>} />
        </div>
      ) : visibleCases.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <EmptyState title={t('performanceTracking.emptyTitle')} description={t('performanceTracking.noData')} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statCards.map(({ icon: Icon, label, value, note }) => (
              <div key={label} className="p-4 bg-stone-50 rounded-lg">
                <Flex justifyContent="start" className="gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <Text className="font-medium">{label}</Text>
                </Flex>
                <Text className="mt-2 text-2xl font-bold text-stone-900">{value}</Text>
                <Text className="text-stone-500 text-sm">{note}</Text>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Title>{t('performanceTracking.byOrganization.title')}</Title>
              <ResponsiveContainer width="100%" height={chartHeight(orgRows.length, 300)}>
                <BarChart layout="vertical" data={orgRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={180} />
                  <Tooltip />
                  <Legend />
                  {STATUSES.map((status) => (
                    <Bar
                      key={status}
                      dataKey={status}
                      stackId="status"
                      name={t(`performanceTracking.statusLabels.${status}`)}
                      fill={STATUS_COLORS[status]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <Title>{t('performanceTracking.monthly.title')}</Title>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="cases"
                    name={t('performanceTracking.monthly.seriesName')}
                    fill={CHART_COLORS.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default PerformanceTrackingModule;

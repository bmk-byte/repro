import React from 'react';
import { Card, Title, Text, Flex } from '@tremor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { LoadingState, ErrorState, EmptyState, Button } from './ui';
import { CHART_COLORS } from '../lib/chartColors';
import { chartHeight } from '../lib/chartLayout';

/**
 * Case outcomes as recorded on each case (its timeline status). Earlier
 * versions labelled cases "won", "lost" or "settled" and computed a
 * "success rate" from a client-satisfaction field that no form ever fills
 * in, so every resolved case showed as "settled" and every rate was 0%.
 * Those were removed; only recorded statuses are shown.
 */

type Status = 'filed' | 'ongoing' | 'resolved' | 'dismissed';
const STATUSES: Status[] = ['filed', 'ongoing', 'resolved', 'dismissed'];
const STATUS_STYLE: Record<Status, { color: string; icon: typeof FileText }> = {
  filed: { color: CHART_COLORS.info, icon: FileText },
  ongoing: { color: CHART_COLORS.warning, icon: Clock },
  resolved: { color: CHART_COLORS.success, icon: CheckCircle },
  dismissed: { color: '#A8A29E', icon: XCircle },
};

interface CaseRow {
  timeline_status: string | null;
  judicial_body: string | null;
}

type CourtRow = { name: string; total: number } & Record<Status, number>;

const OutcomeMetricsDashboard: React.FC = () => {
  const { t } = useTranslation('analytics');
  const [cases, setCases] = React.useState<CaseRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedCourt, setSelectedCourt] = React.useState<string>('all');

  const fetchCases = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: casesError } = await supabase
        .from('cases')
        .select('timeline_status, judicial_body')
        .eq('moderation_status', 'approved')
        .is('deleted_at', null);
      if (casesError) throw casesError;
      setCases(data ?? []);
    } catch (err) {
      console.error('Error fetching outcome data:', err);
      setError(t('outcomeMetrics.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const courts = React.useMemo(
    () => Array.from(new Set(cases.map((c) => c.judicial_body).filter((j): j is string => !!j))).sort(),
    [cases]
  );
  const visible = React.useMemo(
    () => (selectedCourt === 'all' ? cases : cases.filter((c) => c.judicial_body === selectedCourt)),
    [cases, selectedCourt]
  );

  const counts = React.useMemo(() => {
    const result: Record<Status, number> = { filed: 0, ongoing: 0, resolved: 0, dismissed: 0 };
    visible.forEach((c) => {
      if (STATUSES.includes(c.timeline_status as Status)) result[c.timeline_status as Status] += 1;
    });
    return result;
  }, [visible]);
  const withStatus = STATUSES.reduce((sum, s) => sum + counts[s], 0);
  const statusData = STATUSES
    .map((s) => ({ key: s, name: t(`outcomeMetrics.status.${s}`), value: counts[s] }))
    .filter((d) => d.value > 0);

  const courtRows: CourtRow[] = React.useMemo(() => {
    const rows: Record<string, CourtRow> = {};
    visible.forEach((c) => {
      if (!c.judicial_body || !STATUSES.includes(c.timeline_status as Status)) return;
      rows[c.judicial_body] ??= { name: c.judicial_body, total: 0, filed: 0, ongoing: 0, resolved: 0, dismissed: 0 };
      rows[c.judicial_body].total += 1;
      rows[c.judicial_body][c.timeline_status as Status] += 1;
    });
    return Object.values(rows).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [visible]);

  return (
    <Card>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <Title>{t('outcomeMetrics.title')}</Title>
        {courts.length > 1 && (
          <select
            value={selectedCourt}
            onChange={(e) => setSelectedCourt(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">{t('outcomeMetrics.allJurisdictions')}</option>
            {courts.map((court) => (
              <option key={court} value={court}>{court}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <LoadingState label={t('outcomeMetrics.loading')} />
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <ErrorState description={error} action={<Button onClick={fetchCases}>{t('outcomeMetrics.retry')}</Button>} />
        </div>
      ) : withStatus === 0 ? (
        <div className="flex justify-center items-center h-64">
          <EmptyState title={t('outcomeMetrics.emptyTitle')} description={t('outcomeMetrics.noData')} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {STATUSES.map((s) => {
              const Icon = STATUS_STYLE[s].icon;
              return (
                <div key={s} className="p-4 bg-stone-50 rounded-lg">
                  <Flex justifyContent="start" className="gap-2">
                    <Icon className="h-5 w-5" style={{ color: STATUS_STYLE[s].color }} />
                    <Text className="font-medium">{t(`outcomeMetrics.status.${s}`)}</Text>
                  </Flex>
                  <Text className="mt-2 text-2xl font-bold text-stone-900">{counts[s]}</Text>
                  <Text className="text-stone-500 text-sm">
                    {t('outcomeMetrics.percentOfCasesWithStatus', { percent: Math.round((counts[s] / withStatus) * 100) })}
                  </Text>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Title>{t('outcomeMetrics.statusShare.title')}</Title>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((d) => (
                      <Cell key={d.key} fill={STATUS_STYLE[d.key].color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [t('outcomeMetrics.tooltip.cases', { count: value }), t('outcomeMetrics.tooltip.count')]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div>
              <Title>{t('outcomeMetrics.byCourt.title')}</Title>
              {courtRows.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartHeight(courtRows.length, 300)}>
                  <BarChart layout="vertical" data={courtRows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={160} />
                    <Tooltip />
                    <Legend />
                    {STATUSES.map((s) => (
                      <Bar key={s} dataKey={s} stackId="status" name={t(`outcomeMetrics.status.${s}`)} fill={STATUS_STYLE[s].color} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>{t('outcomeMetrics.byCourt.noData')}</Text>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default OutcomeMetricsDashboard;

import React from 'react';
import { Card, Title, Text, Flex, ProgressBar } from '@tremor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { LoadingState, ErrorState, Button } from './ui';
import { CHART_COLORS, CHART_CATEGORICAL_PALETTE } from '../lib/chartColors';
import { chartHeight } from '../lib/chartLayout';

const COLORS = [
  CHART_COLORS.success,
  CHART_COLORS.danger,
  CHART_COLORS.warning,
  CHART_COLORS.info,
  CHART_CATEGORICAL_PALETTE[4],
];

interface OutcomeData {
  name: string;
  value: number;
}

const OutcomeMetricsDashboard: React.FC = () => {
  const { t } = useTranslation('analytics');
  const [outcomeData, setOutcomeData] = React.useState<OutcomeData[]>([]);
  const [jurisdictionData, setJurisdictionData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedJurisdiction, setSelectedJurisdiction] = React.useState<string>('all');
  const [jurisdictions, setJurisdictions] = React.useState<string[]>(['all']);
  const [stats, setStats] = React.useState({
    won: 0,
    lost: 0,
    settled: 0,
    ongoing: 0,
    totalCases: 0,
    successRate: 0
  });

  React.useEffect(() => {
    fetchJurisdictions();
  }, []);

  React.useEffect(() => {
    fetchOutcomeData();
  }, [selectedJurisdiction]);

  const fetchJurisdictions = async () => {
    try {
      // Get unique judicial bodies
      const { data, error } = await supabase
        .from('cases')
        .select('judicial_body')
        .eq('moderation_status', 'approved')
        .not('judicial_body', 'is', null);

      if (error) throw error;

      const uniqueJurisdictions = Array.from(new Set(data.map(item => item.judicial_body))).filter(Boolean);
      setJurisdictions(['all', ...uniqueJurisdictions]);
    } catch (err) {
      console.error('Error fetching jurisdictions:', err);
    }
  };

  const fetchOutcomeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch cases with outcome data
      let query = supabase
        .from('cases')
        .select(`
          id,
          status,
          timeline_status,
          client_satisfaction,
          judicial_body,
          court
        `)
        .eq('moderation_status', 'approved');

      if (selectedJurisdiction !== 'all') {
        query = query.eq('judicial_body', selectedJurisdiction);
      }

      const { data: cases, error: casesError } = await query;

      if (casesError) throw casesError;

      if (!cases || cases.length === 0) {
        setOutcomeData([]);
        setJurisdictionData([]);
        setStats({
          won: 0,
          lost: 0,
          settled: 0,
          ongoing: 0,
          totalCases: 0,
          successRate: 0
        });
        setError(t('outcomeMetrics.noData'));
        return;
      }

      // Process outcome data
      const outcomes: Record<string, number> = {
        won: 0,
        lost: 0,
        settled: 0,
        ongoing: 0,
        dismissed: 0
      };

      cases.forEach(caseItem => {
        // Map timeline_status to outcome categories
        if (caseItem.timeline_status === 'resolved') {
          // Consider it "won" if client_satisfaction is high (4-5)
          if (caseItem.client_satisfaction >= 4) {
            outcomes.won++;
          }
          // Consider it "lost" if client_satisfaction is low (1-2)
          else if (caseItem.client_satisfaction && caseItem.client_satisfaction <= 2) {
            outcomes.lost++;
          }
          // Otherwise consider it "settled"
          else {
            outcomes.settled++;
          }
        } else if (caseItem.timeline_status === 'ongoing' || caseItem.status === 'in_progress') {
          outcomes.ongoing++;
        } else if (caseItem.timeline_status === 'dismissed') {
          outcomes.dismissed++;
        } else if (caseItem.status === 'completed') {
          // For completed cases without timeline_status, use client_satisfaction
          if (caseItem.client_satisfaction >= 4) {
            outcomes.won++;
          } else if (caseItem.client_satisfaction && caseItem.client_satisfaction <= 2) {
            outcomes.lost++;
          } else {
            outcomes.settled++;
          }
        } else {
          // Default to ongoing for other statuses
          outcomes.ongoing++;
        }
      });

      // Convert to array format for charts
      const outcomeArray = (['won', 'lost', 'settled', 'ongoing', 'dismissed'] as const)
        .map((key) => ({ name: t(`outcomeMetrics.outcomes.${key}`), value: outcomes[key] }))
        .filter(item => item.value > 0);

      // Process jurisdiction success rate data
      const jurisdictionSuccess: Record<string, { total: number, success: number }> = {};

      cases.forEach(caseItem => {
        const jurisdiction = caseItem.judicial_body || caseItem.court || t('outcomeMetrics.unknownJurisdiction');

        if (!jurisdictionSuccess[jurisdiction]) {
          jurisdictionSuccess[jurisdiction] = { total: 0, success: 0 };
        }

        jurisdictionSuccess[jurisdiction].total++;

        // Count as success if resolved with high satisfaction or completed with high satisfaction
        if ((caseItem.timeline_status === 'resolved' || caseItem.status === 'completed') &&
            caseItem.client_satisfaction && caseItem.client_satisfaction >= 4) {
          jurisdictionSuccess[jurisdiction].success++;
        }
      });

      // Convert to array and calculate success rates
      const jurisdictionArray = Object.entries(jurisdictionSuccess)
        .map(([name, data]) => ({
          name,
          rate: data.total > 0 ? Math.round((data.success / data.total) * 100) : 0
        }))
        .filter(item => item.name !== t('outcomeMetrics.unknownJurisdiction') && item.rate > 0)
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 4); // Top 4 jurisdictions

      // Calculate overall stats
      const totalCases = cases.length;
      const resolvedCases = cases.filter(c =>
        c.timeline_status === 'resolved' ||
        c.timeline_status === 'dismissed' ||
        (c.status === 'completed' && c.timeline_status !== 'ongoing')
      );

      const successfulCases = cases.filter(c =>
        (c.timeline_status === 'resolved' || c.status === 'completed') &&
        c.client_satisfaction && c.client_satisfaction >= 4
      );

      const successRate = resolvedCases.length > 0
        ? Math.round((successfulCases.length / resolvedCases.length) * 100)
        : 0;

      setOutcomeData(outcomeArray);
      setJurisdictionData(jurisdictionArray);
      setStats({
        won: outcomes.won,
        lost: outcomes.lost,
        settled: outcomes.settled,
        ongoing: outcomes.ongoing,
        totalCases,
        successRate
      });

    } catch (err) {
      console.error('Error fetching outcome data:', err);
      setError(t('outcomeMetrics.loadError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <Title>{t('outcomeMetrics.title')}</Title>
        <select
          value={selectedJurisdiction}
          onChange={(e) => setSelectedJurisdiction(e.target.value)}
          className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {jurisdictions.map(jurisdiction => (
            <option key={jurisdiction} value={jurisdiction}>
              {jurisdiction === 'all' ? t('outcomeMetrics.allJurisdictions') : jurisdiction}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState label={t('outcomeMetrics.loading')} />
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <ErrorState description={error} action={<Button onClick={fetchOutcomeData}>{t('outcomeMetrics.retry')}</Button>} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-success-light p-4 rounded-lg border border-success/20">
              <Flex>
                <CheckCircle className="h-5 w-5 text-success" />
                <Text className="font-medium">{t('outcomeMetrics.outcomes.won')}</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold text-success-dark">
                {stats.won}
              </Text>
              <Text className="text-success text-sm">
                {t('outcomeMetrics.percentOfTotalCases', { percent: stats.totalCases > 0 ? Math.round((stats.won / stats.totalCases) * 100) : 0 })}
              </Text>
            </div>

            <div className="bg-danger-light p-4 rounded-lg border border-danger/20">
              <Flex>
                <XCircle className="h-5 w-5 text-danger" />
                <Text className="font-medium">{t('outcomeMetrics.outcomes.lost')}</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold text-danger-dark">
                {stats.lost}
              </Text>
              <Text className="text-danger text-sm">
                {t('outcomeMetrics.percentOfTotalCases', { percent: stats.totalCases > 0 ? Math.round((stats.lost / stats.totalCases) * 100) : 0 })}
              </Text>
            </div>

            <div className="bg-warning-light p-4 rounded-lg border border-warning/20">
              <Flex>
                <AlertTriangle className="h-5 w-5 text-warning" />
                <Text className="font-medium">{t('outcomeMetrics.outcomes.settled')}</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold text-warning-dark">
                {stats.settled}
              </Text>
              <Text className="text-warning text-sm">
                {t('outcomeMetrics.percentOfTotalCases', { percent: stats.totalCases > 0 ? Math.round((stats.settled / stats.totalCases) * 100) : 0 })}
              </Text>
            </div>

            <div className="bg-info-light p-4 rounded-lg border border-info/20">
              <Flex>
                <Clock className="h-5 w-5 text-info" />
                <Text className="font-medium">{t('outcomeMetrics.outcomes.ongoing')}</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold text-info-dark">
                {stats.ongoing}
              </Text>
              <Text className="text-info text-sm">
                {t('outcomeMetrics.percentOfTotalCases', { percent: stats.totalCases > 0 ? Math.round((stats.ongoing / stats.totalCases) * 100) : 0 })}
              </Text>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Title>{t('outcomeMetrics.caseOutcomes.title')}</Title>
              {outcomeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={outcomeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name={t('outcomeMetrics.seriesNameCases')} fill={CHART_COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>{t('outcomeMetrics.caseOutcomes.noData')}</Text>
                </div>
              )}
            </div>

            <div>
              <Title>{t('outcomeMetrics.outcomeDistribution.title')}</Title>
              {outcomeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {outcomeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [t('outcomeMetrics.tooltip.cases', { count: value }), t('outcomeMetrics.tooltip.count')]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>{t('outcomeMetrics.outcomeDistribution.noData')}</Text>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <Title>{t('outcomeMetrics.successRateByJurisdiction.title')}</Title>
              {jurisdictionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartHeight(jurisdictionData.length, 300)}>
                  <BarChart
                    layout="vertical"
                    data={jurisdictionData}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip formatter={(value) => [t('outcomeMetrics.tooltip.percent', { value }), t('outcomeMetrics.tooltip.successRate')]} />
                    <Bar
                      dataKey="rate"
                      name={t('outcomeMetrics.successRateByJurisdiction.seriesName')}
                      fill={CHART_COLORS.success}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>{t('outcomeMetrics.successRateByJurisdiction.noData')}</Text>
                </div>
              )}
            </Card>

            <Card>
              <Title>{t('outcomeMetrics.resolutionProgress.title')}</Title>
              <div className="mt-4 space-y-4">
                <div className="p-3 bg-stone-50 rounded-lg">
                  <Text className="font-medium">{t('outcomeMetrics.resolutionProgress.overallResolutionRate')}</Text>
                  <Flex className="mt-2">
                    <Text>{t('outcomeMetrics.resolutionProgress.resolvedVsTotal')}</Text>
                    <Text className="font-medium">
                      {t('outcomeMetrics.resolutionProgress.resolvedOfTotal', { resolved: stats.totalCases - stats.ongoing, total: stats.totalCases })}
                    </Text>
                  </Flex>
                  <ProgressBar
                    value={stats.totalCases > 0 ? ((stats.totalCases - stats.ongoing) / stats.totalCases) * 100 : 0}
                    color="amber"
                    className="mt-2"
                  />
                </div>

                <div className="p-3 bg-stone-50 rounded-lg">
                  <Text className="font-medium">{t('outcomeMetrics.resolutionProgress.successRateLabel')}</Text>
                  <Flex className="mt-2">
                    <Text>{t('outcomeMetrics.resolutionProgress.successfulOutcomes')}</Text>
                    <Text className="font-medium">{stats.successRate}%</Text>
                  </Flex>
                  <ProgressBar value={stats.successRate} color="green" className="mt-2" />
                </div>

                <div className="p-3 bg-stone-50 rounded-lg">
                  <Text className="font-medium">{t('outcomeMetrics.resolutionProgress.caseCompletion')}</Text>
                  <Flex className="mt-2">
                    <Text>{t('outcomeMetrics.resolutionProgress.completedCasesLabel')}</Text>
                    <Text className="font-medium">
                      {t('outcomeMetrics.resolutionProgress.casesCount', { count: stats.won + stats.lost + stats.settled })}
                    </Text>
                  </Flex>
                  <ProgressBar
                    value={stats.totalCases > 0 ? ((stats.won + stats.lost + stats.settled) / stats.totalCases) * 100 : 0}
                    color="blue"
                    className="mt-2"
                  />
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-stone-50 rounded-lg">
            <Flex>
              <div>
                <Text className="font-medium">{t('outcomeMetrics.footer.overallSuccessRate')}</Text>
                <Text className="mt-1 text-2xl font-bold text-success-dark">{stats.successRate}%</Text>
                <Text className="text-stone-500 text-sm">{t('outcomeMetrics.footer.basedOnResolvedCases')}</Text>
              </div>
              <div className="text-right">
                <Text className="font-medium">{t('outcomeMetrics.footer.kpiTitle')}</Text>
                <Text className="text-stone-500 text-sm">{t('outcomeMetrics.footer.totalCases', { count: stats.totalCases })}</Text>
                <Text className="text-stone-500 text-sm">
                  {t('outcomeMetrics.footer.resolutionRate', { percent: stats.totalCases > 0 ? Math.round(((stats.totalCases - stats.ongoing) / stats.totalCases) * 100) : 0 })}
                </Text>
              </div>
            </Flex>
          </div>
        </>
      )}
    </Card>
  );
};

export default OutcomeMetricsDashboard;

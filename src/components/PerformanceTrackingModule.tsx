import React from 'react';
import { Card, Title, Text, Flex, ProgressBar } from '@tremor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Clock, TrendingUp, Users, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { LoadingState, ErrorState, Button } from './ui';
import { CHART_COLORS } from '../lib/chartColors';
import { chartHeight } from '../lib/chartLayout';

const RESTRICTED_ORGANIZATIONS = [
  'Women with a Mission',
  'Islamic Women\'s Initiative for Justice Law and Peace',
  'SPRINGS PUBLIC INTEREST HUB',
  'Center for Health, Human Rights and Development',
  'THE AFRICAN INSTITUTE FOR INVESTIGATIVE JOURNALISM',
  'Centre for Women Justice Uganda',
  'FEMME FORTE',
  'Ubuntu Justice center',
  'Dumaic Global Health'
];

interface PerformanceData {
  name: string;
  processing_time: number;
  collaboration_score: number;
  kpi_achievement: number;
}

interface TimelineData {
  name: string;
  avg_time: number;
  target: number;
}

const PerformanceTrackingModule: React.FC = () => {
  const { t } = useTranslation('analytics');
  const [performanceData, setPerformanceData] = React.useState<PerformanceData[]>([]);
  const [timelineData, setTimelineData] = React.useState<TimelineData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = React.useState<string>('all');
  const [organizations, setOrganizations] = React.useState<string[]>(['all']);
  const [stats, setStats] = React.useState({
    avgProcessingTime: 0,
    kpiAchievement: 0,
    collaborationScore: 0,
    strategicCases: 0
  });
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [userOrganization, setUserOrganization] = React.useState<string | null>(null);
  const [isModerator, setIsModerator] = React.useState(false);

  React.useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization, email, is_moderator')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setUserOrganization(profile.organization);
          setIsModerator(profile.is_moderator || false);
        }
      }
      await fetchOrganizations();
    };
    initialize();
  }, []);

  React.useEffect(() => {
    if (currentUserId !== null) {
      fetchPerformanceData();
    }
  }, [selectedOrg, currentUserId]);

  const fetchOrganizations = async () => {
    try {
      // Determine access scope
      const isAfyanahakiModerator = isModerator && userOrganization === 'Afya na Haki';
      const isRestrictedOrganization = RESTRICTED_ORGANIZATIONS.includes(userOrganization || '');

      let query = supabase
        .from('cases')
        .select('partner, user_id')
        .eq('moderation_status', 'approved')
        .not('partner', 'is', null);

      // Apply organization-based filtering
      if (!isAfyanahakiModerator) {
        if (isRestrictedOrganization || !isModerator) {
          if (currentUserId) {
            query = query.eq('user_id', currentUserId);
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const uniqueOrgs = Array.from(new Set(data.map(item => item.partner))).filter(Boolean);
      setOrganizations(['all', ...uniqueOrgs]);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine access scope
      const isAfyanahakiModerator = isModerator && userOrganization === 'Afya na Haki';
      const isRestrictedOrganization = RESTRICTED_ORGANIZATIONS.includes(userOrganization || '');

      // Fetch cases with performance-related data
      let query = supabase
        .from('cases')
        .select(`
          id,
          partner,
          created_at,
          status,
          timeline_status,
          client_satisfaction,
          case_impact,
          user_id
        `)
        .eq('moderation_status', 'approved');

      // Apply organization-based filtering
      if (!isAfyanahakiModerator) {
        if (isRestrictedOrganization || !isModerator) {
          if (currentUserId) {
            query = query.eq('user_id', currentUserId);
          }
        }
      }

      if (selectedOrg !== 'all') {
        query = query.eq('partner', selectedOrg);
      }

      const { data: cases, error: casesError } = await query;

      if (casesError) throw casesError;

      if (!cases || cases.length === 0) {
        setPerformanceData([]);
        setTimelineData([]);
        setStats({
          avgProcessingTime: 0,
          kpiAchievement: 0,
          collaborationScore: 0,
          strategicCases: 0
        });
        setError(t('performanceTracking.noData'));
        return;
      }

      // Process organization performance data
      const orgPerformance: Record<string, {
        cases: any[];
        processing_times: number[];
        satisfaction_scores: number[];
      }> = {};

      cases.forEach(caseItem => {
        const org = caseItem.partner || t('performanceTracking.unknownOrg');

        if (!orgPerformance[org]) {
          orgPerformance[org] = {
            cases: [],
            processing_times: [],
            satisfaction_scores: []
          };
        }

        orgPerformance[org].cases.push(caseItem);

        // Calculate processing time for resolved cases using timeline_status
        if (caseItem.timeline_status === 'resolved' && caseItem.created_at) {
          const createdDate = new Date(caseItem.created_at);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - createdDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          orgPerformance[org].processing_times.push(diffDays);
        }

        // Collect satisfaction scores
        if (caseItem.client_satisfaction) {
          orgPerformance[org].satisfaction_scores.push(caseItem.client_satisfaction);
        }
      });

      // Convert to array format for charts
      const performanceArray = Object.entries(orgPerformance)
        .filter(([name]) => name !== t('performanceTracking.unknownOrg'))
        .map(([name, data]) => {
          const avgProcessingTime = data.processing_times.length > 0
            ? Math.round(data.processing_times.reduce((sum, time) => sum + time, 0) / data.processing_times.length)
            : 0;

          const avgSatisfaction = data.satisfaction_scores.length > 0
            ? data.satisfaction_scores.reduce((sum, score) => sum + score, 0) / data.satisfaction_scores.length
            : 0;

          // Calculate KPI achievement (based on resolution rate and satisfaction)
          const resolvedCases = data.cases.filter(c => c.timeline_status === 'resolved').length;
          const resolutionRate = data.cases.length > 0 ? (resolvedCases / data.cases.length) * 100 : 0;
          const satisfactionRate = (avgSatisfaction / 5) * 100;
          const kpiAchievement = Math.round((resolutionRate * 0.6) + (satisfactionRate * 0.4));

          // Calculate collaboration score based on case volume and satisfaction
          const collaborationScore = Math.min(100, Math.round(60 + (data.cases.length * 2) + (avgSatisfaction * 5)));

          return {
            name,
            processing_time: avgProcessingTime,
            collaboration_score: collaborationScore,
            kpi_achievement: kpiAchievement
          };
        })
        .sort((a, b) => b.kpi_achievement - a.kpi_achievement);

      // Process timeline data (monthly average processing times)
      const monthlyProcessingTimes: Record<string, number[]> = {};

      // Initialize the last 6 months
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyProcessingTimes[monthKey] = [];
      }

      // Group processing times by month
      cases.forEach(caseItem => {
        if (caseItem.timeline_status === 'resolved' && caseItem.created_at) {
          const createdDate = new Date(caseItem.created_at);
          const monthKey = createdDate.toLocaleString('default', { month: 'short', year: '2-digit' });

          const now = new Date();
          const diffTime = Math.abs(now.getTime() - createdDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (monthlyProcessingTimes[monthKey]) {
            monthlyProcessingTimes[monthKey].push(diffDays);
          }
        }
      });

      // Calculate monthly averages
      const timelineArray = Object.entries(monthlyProcessingTimes).map(([name, times]) => {
        const avgTime = times.length > 0
          ? Math.round(times.reduce((sum, time) => sum + time, 0) / times.length)
          : 0;

        return {
          name,
          avg_time: avgTime,
          target: 45 // Target processing time (45 days)
        };
      });

      // Calculate overall stats
      const allProcessingTimes = cases
        .filter(c => c.timeline_status === 'resolved' && c.created_at)
        .map(c => {
          const createdDate = new Date(c.created_at);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - createdDate.getTime());
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        });

      const allSatisfactionScores = cases
        .filter(c => c.client_satisfaction)
        .map(c => c.client_satisfaction);

      const avgProcessingTime = allProcessingTimes.length > 0
        ? Math.round(allProcessingTimes.reduce((sum, time) => sum + time, 0) / allProcessingTimes.length)
        : 0;

      const avgSatisfaction = allSatisfactionScores.length > 0
        ? allSatisfactionScores.reduce((sum, score) => sum + score, 0) / allSatisfactionScores.length
        : 0;

      const resolvedCases = cases.filter(c => c.timeline_status === 'resolved').length;
      const resolutionRate = cases.length > 0 ? (resolvedCases / cases.length) * 100 : 0;
      const satisfactionRate = (avgSatisfaction / 5) * 100;
      const kpiAchievement = Math.round((resolutionRate * 0.6) + (satisfactionRate * 0.4));

      // Count strategic cases (those with high impact or satisfaction)
      const strategicCases = cases.filter(c =>
        (c.client_satisfaction && c.client_satisfaction >= 4) ||
        (c.case_impact && c.case_impact.length > 500)
      ).length;

      setPerformanceData(performanceArray);
      setTimelineData(timelineArray);
      setStats({
        avgProcessingTime,
        kpiAchievement,
        collaborationScore: Math.min(100, Math.round(60 + (cases.length * 0.5) + (avgSatisfaction * 5))),
        strategicCases
      });

    } catch (err) {
      console.error('Error fetching performance data:', err);
      setError(t('performanceTracking.loadError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <Title>{t('performanceTracking.title')}</Title>
        <select
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
          className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {organizations.map(org => (
            <option key={org} value={org}>
              {org === 'all' ? t('performanceTracking.allOrganizations') : org}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState label={t('performanceTracking.loading')} />
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <ErrorState description={error} action={<Button onClick={fetchPerformanceData}>{t('performanceTracking.retry')}</Button>} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-stone-50 rounded-lg">
              <Flex>
                <Clock className="h-5 w-5 text-primary" />
                <Text className="font-medium">{t('performanceTracking.stats.avgProcessingTime.title')}</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold">
                {t('performanceTracking.daysValue', { count: stats.avgProcessingTime })}
              </Text>
              <Text className="text-stone-500 text-sm">{t('performanceTracking.stats.avgProcessingTime.subtitle')}</Text>
            </div>

            <div className="p-4 bg-stone-50 rounded-lg">
              <Flex>
                <TrendingUp className="h-5 w-5 text-green-500" />
                <Text className="font-medium">{t('performanceTracking.stats.kpiAchievement.title')}</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold text-green-600">
                {stats.kpiAchievement}%
              </Text>
              <Text className="text-stone-500 text-sm">{t('performanceTracking.stats.kpiAchievement.subtitle')}</Text>
            </div>

            <div className="p-4 bg-stone-50 rounded-lg">
              <Flex>
                <Users className="h-5 w-5 text-blue-500" />
                <Text className="font-medium">{t('performanceTracking.stats.collaborationScore.title')}</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold text-blue-600">
                {stats.collaborationScore}%
              </Text>
              <Text className="text-stone-500 text-sm">{t('performanceTracking.stats.collaborationScore.subtitle')}</Text>
            </div>

            <div className="p-4 bg-stone-50 rounded-lg">
              <Flex>
                <Briefcase className="h-5 w-5 text-amber-500" />
                <Text className="font-medium">{t('performanceTracking.stats.strategicCases.title')}</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold text-amber-600">
                {stats.strategicCases}
              </Text>
              <Text className="text-stone-500 text-sm">{t('performanceTracking.stats.strategicCases.subtitle')}</Text>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Title>{t('performanceTracking.orgKpiDashboard.title')}</Title>
              {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartHeight(performanceData.length, 300)}>
                  <BarChart
                    layout="vertical"
                    data={performanceData}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={180} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="kpi_achievement"
                      name={t('performanceTracking.orgKpiDashboard.seriesName')}
                      fill={CHART_COLORS.success}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>{t('performanceTracking.orgKpiDashboard.noData')}</Text>
                </div>
              )}
            </div>

            <div>
              <Title>{t('performanceTracking.processingTimeTrends.title')}</Title>
              {timelineData.length > 0 && timelineData.some(item => item.avg_time > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avg_time"
                      name={t('performanceTracking.processingTimeTrends.avgSeriesName')}
                      stroke={CHART_COLORS.primary}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      name={t('performanceTracking.processingTimeTrends.targetSeriesName')}
                      stroke={CHART_COLORS.info}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>{t('performanceTracking.processingTimeTrends.noData')}</Text>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <Title>{t('performanceTracking.orgPerformance.title')}</Title>
              <div className="mt-4 space-y-4">
                {performanceData.map((org, index) => (
                  <div key={index} className="space-y-1">
                    <Flex>
                      <Text>{org.name}</Text>
                      <Text>{org.kpi_achievement}%</Text>
                    </Flex>
                    <ProgressBar
                      value={org.kpi_achievement}
                      color={index === 0 ? "rose" : index === 1 ? "indigo" : index === 2 ? "amber" : index === 3 ? "emerald" : "blue"}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <Title>{t('performanceTracking.processingTimeByOrg.title')}</Title>
              <div className="mt-4 space-y-4">
                {performanceData.map((org, index) => (
                  <div key={index} className="space-y-1">
                    <Flex>
                      <Text>{org.name}</Text>
                      <Text>{t('performanceTracking.daysValue', { count: org.processing_time })}</Text>
                    </Flex>
                    <ProgressBar
                      value={Math.min(100, (org.processing_time / 90) * 100)}
                      color={org.processing_time < 30 ? "green" : org.processing_time < 60 ? "amber" : "rose"}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </Card>
  );
};

export default PerformanceTrackingModule;

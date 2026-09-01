import React, { Suspense, lazy, useState } from 'react';
import { Card, Title, Text, Tab, TabList, TabGroup, TabPanel, TabPanels } from '@tremor/react';
import { Activity, TrendingUp, Users, Files, Map, BarChart2, Gavel } from 'lucide-react';
import DashboardCard from './DashboardCard';
import { supabase } from '../lib/supabase';
import { handleQueryError } from '../lib/errorHandling';
import DataChart from './DataChart';
import RecentLegalUpdates from './RecentLegalUpdates';
import { LoadingState } from './ui';

// Each of these pulls in a large shared chunk (@tremor chart components,
// recharts, d3, date-fns, lodash — ~830KB). Lazy-loading per-tab means that
// weight only downloads once a user actually clicks into that tab, instead
// of on every dashboard visit regardless of which tab (if any) they open.
const PerformanceMetrics = lazy(() => import('./PerformanceMetrics'));
const DistributionCharts = lazy(() => import('./DistributionCharts'));
const PerformanceDashboard = lazy(() => import('./PerformanceDashboard'));
const HealthIndicatorIntegration = lazy(() => import('./HealthIndicatorIntegration'));

interface DashboardLayoutProps {
  stats: {
    totalCases: number;
    totalJudgments: number;
  };
  loading: boolean;
  error: string | null;
  setActiveTab: (tab: string) => void;
  isModerator?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ stats, loading, error, setActiveTab, isModerator = false }) => {
  const [selectedView, setSelectedView] = useState('overview');
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(new Date().setMonth(new Date().getMonth() - 6)),
    new Date()
  ]);
  const [changeStats, setChangeStats] = useState({
    cases: '+0.0%',
    judgments: '+0.0%'
  });

  React.useEffect(() => {
    calculateChangeStats();
  }, [stats]);

  const calculateChangeStats = async () => {
    try {
      // Calculate the previous period (same length as current period)
      const currentPeriodStart = new Date(new Date().setMonth(new Date().getMonth() - 1));
      const previousPeriodStart = new Date(new Date().setMonth(new Date().getMonth() - 2));
      const previousPeriodEnd = new Date(currentPeriodStart);
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);

      // Get previous period stats
      const { count: prevTotalCount } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'approved')
        .lt('created_at', currentPeriodStart.toISOString());

      const { count: prevJudgmentsCount } = await supabase
        .from('judgments')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', currentPeriodStart.toISOString());

      // Calculate percentage changes
      const casesChange = prevTotalCount ? ((stats.totalCases - prevTotalCount) / prevTotalCount) * 100 : 0;
      const judgmentsChange = prevJudgmentsCount ? ((stats.totalJudgments - prevJudgmentsCount) / prevJudgmentsCount) * 100 : 0;

      // Format changes with + or - sign
      setChangeStats({
        cases: `${casesChange >= 0 ? '+' : ''}${casesChange.toFixed(1)}%`,
        judgments: `${judgmentsChange >= 0 ? '+' : ''}${judgmentsChange.toFixed(1)}%`
      });
    } catch (err) {
      handleQueryError(err);
      // Use default values if calculation fails
      setChangeStats({
        cases: '+0.0%',
        judgments: '+0.0%'
      });
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-danger-light border border-danger/30 text-danger-dark px-4 py-3 rounded-md" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <DashboardCard
              title="Cases"
              value={stats.totalCases.toString()}
              change={changeStats.cases}
              type="cases"
              onClick={() => setActiveTab('cases')}
            />
            <DashboardCard
              title="Judgments"
              value={stats.totalJudgments.toString()}
              change={changeStats.judgments}
              type="judgments"
              onClick={() => setActiveTab('judgments')}
            />
          </div>

          <Card>
            <TabGroup>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <Title>Performance Analytics</Title>
                <div className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                  <TabList variant="line" className="flex-nowrap">
                    <Tab value="overview">Overview</Tab>
                    <Tab value="advanced">Advanced</Tab>
                    <Tab value="metrics">Metrics</Tab>
                    <Tab value="distribution">Distribution</Tab>
                    <Tab value="health">Health</Tab>
                  </TabList>
                </div>
              </div>

              <TabPanels>
                <TabPanel value="overview">
                  <div className="space-y-6">
                    <div>
                      <Title>Monthly Case Trends</Title>
                      <div className="h-80">
                        <DataChart />
                      </div>
                    </div>
                    
                    <div>
                      <RecentLegalUpdates />
                    </div>
                  </div>
                </TabPanel>

                <TabPanel value="advanced">
                  <Suspense fallback={<LoadingState label="Loading performance dashboard…" />}>
                    <PerformanceDashboard isModerator={isModerator} />
                  </Suspense>
                </TabPanel>

                <TabPanel value="metrics">
                  <Suspense fallback={<LoadingState label="Loading metrics…" />}>
                    <PerformanceMetrics dateRange={dateRange} />
                  </Suspense>
                </TabPanel>

                <TabPanel value="distribution">
                  <Suspense fallback={<LoadingState label="Loading distribution charts…" />}>
                    <DistributionCharts />
                  </Suspense>
                </TabPanel>

                <TabPanel value="health">
                  <Suspense fallback={<LoadingState label="Loading health indicators…" />}>
                    <HealthIndicatorIntegration />
                  </Suspense>
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </Card>
        </>
      )}
    </div>
  );
};

export default DashboardLayout;
import React, { Suspense, lazy, useState } from 'react';
import { Card, Title, Tab, TabList, TabGroup, TabPanel, TabPanels } from '@tremor/react';
import { RefreshCw } from 'lucide-react';
import { testConnection, handleSupabaseError } from '../lib/supabase';
import { LoadingState } from './ui';
import DataChart from './DataChart';

// Each of these pulls in a large shared chunk (@tremor chart components,
// recharts, d3, date-fns, lodash). Lazy-loading per-tab means that weight
// only downloads once a user actually opens that tab/sub-view, not on every
// visit to Analytics regardless of which view (if any) they look at.
const PerformanceMetrics = lazy(() => import('./PerformanceMetrics'));
const TimelineVisualization = lazy(() => import('./TimelineVisualization'));
const DistributionCharts = lazy(() => import('./DistributionCharts'));
const OutcomeMetricsDashboard = lazy(() => import('./OutcomeMetricsDashboard'));
const GeographicIntelligence = lazy(() => import('./GeographicIntelligence'));
const AfricaMap = lazy(() => import('./AfricaMap'));
const StakeholderAnalytics = lazy(() => import('./StakeholderAnalytics'));
const LegalFrameworkAnalysis = lazy(() => import('./LegalFrameworkAnalysis'));
const HealthIndicatorIntegration = lazy(() => import('./HealthIndicatorIntegration'));
const PerformanceTrackingModule = lazy(() => import('./PerformanceTrackingModule'));
const ReportGenerationSystem = lazy(() => import('./ReportGenerationSystem'));

interface AnalyticsPageProps {
  isModerator?: boolean;
}

type SubView<T extends string> = { value: T; label: string };

/** Small local segmented control for switching between 2-3 related views
 * within one tab — deliberately not a nested TabGroup (that would recreate
 * the 3-level-deep tab nesting this page replaces). */
function SubViewSwitch<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SubView<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  if (options.length < 2) return null;
  return (
    <div className="mb-4 inline-flex rounded-md border border-stone-200 bg-stone-50 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            'rounded px-3 py-1.5 text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-white text-primary shadow-sm'
              : 'text-stone-600 hover:text-stone-900',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ isModerator = false }) => {
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [dateRange] = useState<[Date, Date]>([
    new Date(new Date().setMonth(new Date().getMonth() - 6)),
    new Date()
  ]);

  const [trendsView, setTrendsView] = useState<'overview' | 'metrics' | 'timeline'>('overview');
  const [distributionView, setDistributionView] = useState<'distribution' | 'outcomes'>('distribution');
  const [geographyView, setGeographyView] = useState<'map' | 'globe'>('globe');
  const [healthView, setHealthView] = useState<'health' | 'performance'>('health');

  const retryConnection = async () => {
    setLoading(true);
    setRetryCount(prev => prev + 1);
    try {
      const { success, error } = await testConnection();
      setConnectionError(success ? null : handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  if (connectionError) {
    return (
      <div className="space-y-6">
        <div className="bg-danger-light border border-danger/30 text-danger-dark px-4 py-3 rounded relative" role="alert">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <span className="block sm:inline font-semibold">Connection Error:</span>
              <span className="block sm:inline ml-1">{connectionError}</span>
              {retryCount > 0 && (
                <p className="text-sm mt-1">Retry attempt: {retryCount}</p>
              )}
            </div>
            <button
              onClick={retryConnection}
              disabled={loading}
              className="flex items-center space-x-2 bg-danger text-white px-4 py-2 rounded hover:bg-danger-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Retrying...' : 'Retry Connection'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-semibold text-stone-900">Analytics</h2>
        <p className="mt-1 text-sm text-stone-600">Trends, distribution, geography, and outcomes across all cases.</p>
      </div>

      <Card>
        <TabGroup>
          <div className="w-full overflow-x-auto pb-2">
            <TabList variant="line" className="flex-nowrap">
              <Tab value="trends">Trends</Tab>
              <Tab value="distribution">Distribution</Tab>
              <Tab value="geography">Geography</Tab>
              <Tab value="outcomes">Stakeholders</Tab>
              <Tab value="legal">Legal Framework</Tab>
              <Tab value="health">Health &amp; Performance</Tab>
              {isModerator && <Tab value="reports">Reports</Tab>}
            </TabList>
          </div>

          <TabPanels>
            <TabPanel value="trends">
              <SubViewSwitch
                value={trendsView}
                onChange={setTrendsView}
                options={[
                  { value: 'overview', label: 'Monthly Trend' },
                  { value: 'metrics', label: 'Performance Metrics' },
                  { value: 'timeline', label: 'Timeline' },
                ]}
              />
              {trendsView === 'overview' && (
                <div>
                  <Title>Monthly Case Trends</Title>
                  <div className="h-80">
                    <DataChart />
                  </div>
                </div>
              )}
              {trendsView === 'metrics' && (
                <Suspense fallback={<LoadingState label="Loading performance metrics…" />}>
                  <PerformanceMetrics dateRange={dateRange} />
                </Suspense>
              )}
              {trendsView === 'timeline' && (
                <Suspense fallback={<LoadingState label="Loading timeline…" />}>
                  <TimelineVisualization />
                </Suspense>
              )}
            </TabPanel>

            <TabPanel value="distribution">
              <SubViewSwitch
                value={distributionView}
                onChange={setDistributionView}
                options={[
                  { value: 'distribution', label: 'By Type & Status' },
                  { value: 'outcomes', label: 'By Outcome' },
                ]}
              />
              {distributionView === 'distribution' && (
                <Suspense fallback={<LoadingState label="Loading distribution charts…" />}>
                  <DistributionCharts />
                </Suspense>
              )}
              {distributionView === 'outcomes' && (
                <Suspense fallback={<LoadingState label="Loading outcomes…" />}>
                  <OutcomeMetricsDashboard />
                </Suspense>
              )}
            </TabPanel>

            <TabPanel value="geography">
              <SubViewSwitch
                value={geographyView}
                onChange={setGeographyView}
                options={[
                  { value: 'globe', label: 'Country Intelligence' },
                  { value: 'map', label: 'Africa Map' },
                ]}
              />
              {geographyView === 'globe' && (
                <Suspense fallback={<LoadingState label="Loading map…" />}>
                  <GeographicIntelligence
                    connectionError={connectionError}
                    setConnectionError={setConnectionError}
                  />
                </Suspense>
              )}
              {geographyView === 'map' && (
                <Suspense fallback={<LoadingState label="Loading Africa map…" />}>
                  <AfricaMap />
                </Suspense>
              )}
            </TabPanel>

            <TabPanel value="outcomes">
              <Suspense fallback={<LoadingState label="Loading stakeholder analytics…" />}>
                <StakeholderAnalytics />
              </Suspense>
            </TabPanel>

            <TabPanel value="legal">
              <Suspense fallback={<LoadingState label="Loading legal framework analysis…" />}>
                <LegalFrameworkAnalysis />
              </Suspense>
            </TabPanel>

            <TabPanel value="health">
              <SubViewSwitch
                value={healthView}
                onChange={setHealthView}
                options={[
                  { value: 'health', label: 'Health Indicators' },
                  { value: 'performance', label: 'Performance Tracking' },
                ]}
              />
              {healthView === 'health' && (
                <Suspense fallback={<LoadingState label="Loading health indicators…" />}>
                  <HealthIndicatorIntegration
                    connectionError={connectionError}
                    setConnectionError={setConnectionError}
                  />
                </Suspense>
              )}
              {healthView === 'performance' && (
                <Suspense fallback={<LoadingState label="Loading performance tracking…" />}>
                  <PerformanceTrackingModule />
                </Suspense>
              )}
            </TabPanel>

            {isModerator && (
              <TabPanel value="reports">
                <Suspense fallback={<LoadingState label="Loading report generator…" />}>
                  <ReportGenerationSystem />
                </Suspense>
              </TabPanel>
            )}
          </TabPanels>
        </TabGroup>
      </Card>
    </div>
  );
};

export default AnalyticsPage;

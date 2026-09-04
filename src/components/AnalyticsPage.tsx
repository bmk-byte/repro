import React, { Suspense, lazy, useState } from 'react';
import { Card, Title, Tab, TabList, TabGroup, TabPanel, TabPanels } from '@tremor/react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('analytics');
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
              <span className="block sm:inline font-semibold">{t('analyticsPage.connectionErrorLabel')}</span>
              <span className="block sm:inline ml-1">{connectionError}</span>
              {retryCount > 0 && (
                <p className="text-sm mt-1">{t('analyticsPage.retryAttempt', { count: retryCount })}</p>
              )}
            </div>
            <button
              onClick={retryConnection}
              disabled={loading}
              className="flex items-center space-x-2 bg-danger text-white px-4 py-2 rounded hover:bg-danger-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? t('analyticsPage.retrying') : t('analyticsPage.retryConnection')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-semibold text-stone-900">{t('analyticsPage.title')}</h2>
        <p className="mt-1 text-sm text-stone-600">{t('analyticsPage.subtitle')}</p>
      </div>

      <Card>
        <TabGroup>
          <div className="w-full overflow-x-auto pb-2">
            <TabList variant="line" className="flex-nowrap">
              <Tab value="trends">{t('analyticsPage.tabs.trends')}</Tab>
              <Tab value="distribution">{t('analyticsPage.tabs.distribution')}</Tab>
              <Tab value="geography">{t('analyticsPage.tabs.geography')}</Tab>
              <Tab value="outcomes">{t('analyticsPage.tabs.stakeholders')}</Tab>
              <Tab value="legal">{t('analyticsPage.tabs.legalFramework')}</Tab>
              <Tab value="health">{t('analyticsPage.tabs.healthAndPerformance')}</Tab>
              {isModerator && <Tab value="reports">{t('analyticsPage.tabs.reports')}</Tab>}
            </TabList>
          </div>

          <TabPanels>
            <TabPanel value="trends">
              <SubViewSwitch
                value={trendsView}
                onChange={setTrendsView}
                options={[
                  { value: 'overview', label: t('analyticsPage.subviews.trends.overview') },
                  { value: 'metrics', label: t('analyticsPage.subviews.trends.metrics') },
                  { value: 'timeline', label: t('analyticsPage.subviews.trends.timeline') },
                ]}
              />
              {trendsView === 'overview' && (
                <div>
                  <Title>{t('analyticsPage.monthlyCaseTrends')}</Title>
                  <div className="h-80">
                    <DataChart />
                  </div>
                </div>
              )}
              {trendsView === 'metrics' && (
                <Suspense fallback={<LoadingState label={t('analyticsPage.loadingLabels.performanceMetrics')} />}>
                  <PerformanceMetrics dateRange={dateRange} />
                </Suspense>
              )}
              {trendsView === 'timeline' && (
                <Suspense fallback={<LoadingState label={t('analyticsPage.loadingLabels.timeline')} />}>
                  <TimelineVisualization />
                </Suspense>
              )}
            </TabPanel>

            <TabPanel value="distribution">
              <SubViewSwitch
                value={distributionView}
                onChange={setDistributionView}
                options={[
                  { value: 'distribution', label: t('analyticsPage.subviews.distribution.byTypeAndStatus') },
                  { value: 'outcomes', label: t('analyticsPage.subviews.distribution.byOutcome') },
                ]}
              />
              {distributionView === 'distribution' && (
                <Suspense fallback={<LoadingState label={t('analyticsPage.loadingLabels.distributionCharts')} />}>
                  <DistributionCharts />
                </Suspense>
              )}
              {distributionView === 'outcomes' && (
                <Suspense fallback={<LoadingState label={t('analyticsPage.loadingLabels.outcomes')} />}>
                  <OutcomeMetricsDashboard />
                </Suspense>
              )}
            </TabPanel>

            <TabPanel value="geography">
              <SubViewSwitch
                value={geographyView}
                onChange={setGeographyView}
                options={[
                  { value: 'globe', label: t('analyticsPage.subviews.geography.countryIntelligence') },
                  { value: 'map', label: t('analyticsPage.subviews.geography.africaMap') },
                ]}
              />
              {geographyView === 'globe' && (
                <Suspense fallback={<LoadingState label={t('analyticsPage.loadingLabels.map')} />}>
                  <GeographicIntelligence
                    connectionError={connectionError}
                    setConnectionError={setConnectionError}
                  />
                </Suspense>
              )}
              {geographyView === 'map' && (
                <Suspense fallback={<LoadingState label={t('analyticsPage.loadingLabels.africaMap')} />}>
                  <AfricaMap />
                </Suspense>
              )}
            </TabPanel>

            <TabPanel value="outcomes">
              <Suspense fallback={<LoadingState label={t('analyticsPage.loadingLabels.stakeholderAnalytics')} />}>
                <StakeholderAnalytics />
              </Suspense>
            </TabPanel>

            <TabPanel value="legal">
              <Suspense fallback={<LoadingState label={t('analyticsPage.loadingLabels.legalFrameworkAnalysis')} />}>
                <LegalFrameworkAnalysis />
              </Suspense>
            </TabPanel>

            <TabPanel value="health">
              <SubViewSwitch
                value={healthView}
                onChange={setHealthView}
                options={[
                  { value: 'health', label: t('analyticsPage.subviews.health.healthIndicators') },
                  { value: 'performance', label: t('analyticsPage.subviews.health.performanceTracking') },
                ]}
              />
              {healthView === 'health' && (
                <Suspense fallback={<LoadingState label={t('analyticsPage.loadingLabels.healthIndicators')} />}>
                  <HealthIndicatorIntegration
                    connectionError={connectionError}
                    setConnectionError={setConnectionError}
                  />
                </Suspense>
              )}
              {healthView === 'performance' && (
                <Suspense fallback={<LoadingState label={t('analyticsPage.loadingLabels.performanceTracking')} />}>
                  <PerformanceTrackingModule />
                </Suspense>
              )}
            </TabPanel>

            {isModerator && (
              <TabPanel value="reports">
                <Suspense fallback={<LoadingState label={t('analyticsPage.loadingLabels.reportGenerator')} />}>
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

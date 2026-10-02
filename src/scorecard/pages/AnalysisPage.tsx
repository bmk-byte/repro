import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, FileJson, Copy, Check, AlertCircle, RefreshCw, Flag, CheckCircle2, ListChecks, Layers } from 'lucide-react';
import { Button, Breadcrumbs, KpiCard, Tabs } from '../../components/ui';
import { PublicScorecardChrome } from '../components/PublicScorecardChrome';
import { CrossCountryComparison } from '../components/analysis/CrossCountryComparison';
import { IndicatorAnalysis } from '../components/analysis/IndicatorAnalysis';
import { RegionalAnalysis } from '../components/analysis/RegionalAnalysis';
import { CorrelationInsights } from '../components/analysis/CorrelationInsights';
import {
  fetchAllCountriesAnalysisData,
  fetchRegionalAnalysisData,
  fetchPillars,
  fetchIndicators,
  type CountryAnalysisData,
  type RegionalAnalysisData,
} from '../lib/api';
import type { ScorecardPillar as Pillar, ScorecardIndicator as Indicator } from '../types/database';
import { exportToCSV, exportToJSON, downloadCSV, copyToClipboard } from '../lib/export';
import { AnalysisSkeleton } from '../components/SkeletonLoader';

type TabType = 'comparison' | 'indicator' | 'regional' | 'correlation';

/**
 * Public, no-login scorecard analysis dashboard — mounted at /scorecard/analysis
 * as a top-level route (see App.tsx), outside the authenticated DashboardApp,
 * so a logged-out visitor can view published Maputo Protocol scorecard data.
 * RLS on scorecard_* tables already restricts what an anonymous client can
 * see to submitted/published rows (see
 * supabase/migrations/20261001075948_create_scorecard_schema.sql) — this
 * page does not need its own visibility filtering beyond that.
 */
export default function AnalysisPage() {
  const { t } = useTranslation('scorecard');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('comparison');

  const [countriesData, setCountriesData] = useState<CountryAnalysisData[]>([]);
  const [regionalData, setRegionalData] = useState<RegionalAnalysisData[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);

  const [copied, setCopied] = useState(false);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAnalysisData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [countriesAnalysis, regionalAnalysis, pillarsData, indicatorsData] =
        await Promise.all([
          fetchAllCountriesAnalysisData(),
          fetchRegionalAnalysisData(),
          fetchPillars(),
          fetchIndicators(),
        ]);

      setCountriesData(countriesAnalysis);
      setRegionalData(regionalAnalysis);
      setPillars(pillarsData);
      setIndicators(indicatorsData);
    } catch (err) {
      console.error('Failed to load analysis data:', err);
      if (!silent) setError(t('analysisPage.errorLoadFailed'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAnalysisData();
  }, [loadAnalysisData]);

  // A live realtime subscription here would mean every anonymous visitor to
  // this public, no-login page opens a permanent WAL-tailing connection for
  // data that only a handful of editors change occasionally — that's the
  // single largest source of Supabase Realtime query volume in the whole
  // app (see supabase/migrations/20261001075948_create_scorecard_schema.sql
  // for why this page has no auth gate at all). A periodic silent refetch
  // gets the same "stays reasonably fresh" outcome at a fraction of the
  // connection cost.
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      setLiveUpdate(true);
      loadAnalysisData(true).then(() => {
        setTimeout(() => setLiveUpdate(false), 1500);
      });
    }, 120_000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [loadAnalysisData]);

  const handleExportCSV = () => {
    const csv = exportToCSV(countriesData, pillars, indicators);
    downloadCSV(csv, `maputo-scorecard-analysis-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      countries: countriesData.map((cd) => ({
        country: cd.country,
        submission: cd.submission,
        pillarResults: cd.pillarResults,
        indicatorScores: cd.indicatorScores,
      })),
      regionalAnalysis: regionalData,
      pillars,
      indicators,
    };

    exportToJSON(data, `maputo-scorecard-analysis-${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleCopyData = async () => {
    const csv = exportToCSV(countriesData, pillars, indicators);
    await copyToClipboard(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <PublicScorecardChrome>
        <AnalysisSkeleton />
      </PublicScorecardChrome>
    );
  }

  if (error) {
    return (
      <PublicScorecardChrome>
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <AlertCircle className="w-16 h-16 text-danger/60 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-900 mb-2">{t('analysisPage.unableToLoad')}</h2>
            <p className="text-stone-600 mb-6">{error}</p>
            <Button onClick={() => loadAnalysisData()}>{t('editor.tryAgain')}</Button>
          </div>
        </div>
      </PublicScorecardChrome>
    );
  }

  const tabs: { id: TabType; label: string; description: string }[] = [
    {
      id: 'comparison',
      label: t('analysisPage.tabComparisonLabel'),
      description: t('analysisPage.tabComparisonDescription'),
    },
    {
      id: 'indicator',
      label: t('analysisPage.tabIndicatorLabel'),
      description: t('analysisPage.tabIndicatorDescription'),
    },
    {
      id: 'regional',
      label: t('analysisPage.tabRegionalLabel'),
      description: t('analysisPage.tabRegionalDescription'),
    },
    {
      id: 'correlation',
      label: t('analysisPage.tabCorrelationLabel'),
      description: t('analysisPage.tabCorrelationDescription'),
    },
  ];

  const countriesAssessed = countriesData.filter((d) => d.submission).length;
  const publishedCount = countriesData.filter((d) => d.submission?.status === 'published').length;

  return (
    <PublicScorecardChrome>
      <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Breadcrumbs
            className="mb-4"
            items={[
              { label: t('analysisPage.breadcrumbHome'), onClick: () => navigate('/') },
              { label: t('analysisPage.breadcrumbScorecards') },
            ]}
          />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-stone-900">{t('analysisPage.heading')}</h1>
                {liveUpdate && (
                  <div className="flex items-center gap-1.5 text-xs text-success-dark bg-success-light border border-success/30 px-2.5 py-1 rounded-full">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    {t('analysisPage.updating')}
                  </div>
                )}
              </div>
              <p className="text-sm text-stone-500 mt-1">
                {t('analysisPage.subheading')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleCopyData}
                variant="secondary"
                title={t('analysisPage.copyToClipboard')}
                icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              >
                {copied ? t('analysisPage.copied') : t('analysisPage.copy')}
              </Button>
              <Button
                onClick={handleExportJSON}
                variant="secondary"
                title={t('analysisPage.exportAsJson')}
                icon={<FileJson className="w-4 h-4" />}
              >
                {t('analysisPage.json')}
              </Button>
              <Button
                onClick={handleExportCSV}
                title={t('analysisPage.exportAsCsv')}
                icon={<Download className="w-4 h-4" />}
              >
                {t('analysisPage.csv')}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <KpiCard
              label={t('analysisPage.kpiCountriesAssessed')}
              value={countriesAssessed}
              icon={<Flag className="w-4 h-4" />}
              hint={t('analysisPage.kpiOfTotal', { total: countriesData.length })}
            />
            <KpiCard
              label={t('analysisPage.kpiPublished')}
              value={publishedCount}
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <KpiCard
              label={t('analysisPage.kpiIndicators')}
              value={indicators.length}
              icon={<ListChecks className="w-4 h-4" />}
            />
            <KpiCard
              label={t('analysisPage.kpiPillars')}
              value={pillars.length}
              icon={<Layers className="w-4 h-4" />}
            />
          </div>

          <Tabs
            className="mt-6"
            tabs={tabs}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as TabType)}
          />
        </div>

        <div className="pb-8">
          {activeTab === 'comparison' && (
            <CrossCountryComparison
              data={countriesData}
              pillars={pillars}
              onExport={handleExportCSV}
            />
          )}

          {activeTab === 'indicator' && (
            <IndicatorAnalysis data={countriesData} indicators={indicators} pillars={pillars} />
          )}

          {activeTab === 'regional' && (
            <RegionalAnalysis data={regionalData} pillars={pillars} />
          )}

          {activeTab === 'correlation' && (
            <CorrelationInsights
              data={countriesData}
              indicators={indicators}
              pillars={pillars}
            />
          )}
        </div>
      </div>
    </div>
    </PublicScorecardChrome>
  );
}

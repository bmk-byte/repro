import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileJson, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui';
import { PublicScorecardChrome } from '../components/PublicScorecardChrome';
import { supabase } from '../../lib/supabase';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('comparison');

  const [countriesData, setCountriesData] = useState<CountryAnalysisData[]>([]);
  const [regionalData, setRegionalData] = useState<RegionalAnalysisData[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);

  const [copied, setCopied] = useState(false);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    const handleChange = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        setLiveUpdate(true);
        loadAnalysisData(true).then(() => {
          setTimeout(() => setLiveUpdate(false), 2500);
        });
      }, 800);
    };

    const channel = supabase
      .channel('scorecard-analysis-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scorecard_submissions' }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scorecard_pillar_results' }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scorecard_indicator_scores' }, handleChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('analysisPage.unableToLoad')}</h2>
            <p className="text-gray-600 mb-6">{error}</p>
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

  return (
    <PublicScorecardChrome>
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{t('analysisPage.heading')}</h1>
                {liveUpdate && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    {t('analysisPage.updating')}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
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

          <div className="mt-6 border-b border-gray-200">
            <nav className="flex gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span>{tab.label}</span>
                    <span className="text-xs text-gray-500 mt-0.5">{tab.description}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
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

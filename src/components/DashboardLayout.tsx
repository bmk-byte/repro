import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import DashboardCard from './DashboardCard';
import { supabase } from '../lib/supabase';
import { handleQueryError } from '../lib/errorHandling';
import RecentLegalUpdates from './RecentLegalUpdates';
import { LoadingState, Button, Card } from './ui';

interface DashboardLayoutProps {
  stats: {
    totalCases: number;
    totalJudgments: number;
  };
  loading: boolean;
  error: string | null;
  setActiveTab: (tab: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ stats, loading, error, setActiveTab }) => {
  const { t } = useTranslation();
  // null = nothing real to compare against (no earlier data, or the lookup
  // failed); the card then shows no change line instead of "+0.0%".
  const [changeStats, setChangeStats] = useState<{ cases: number | null; judgments: number | null }>({
    cases: null,
    judgments: null,
  });

  React.useEffect(() => {
    calculateChangeStats();
  }, [stats]);

  const calculateChangeStats = async () => {
    try {
      // Compare today's cumulative totals against the cumulative totals as
      // of one month ago, to show "+N% since last month" on each stat card.
      const currentPeriodStart = new Date(new Date().setMonth(new Date().getMonth() - 1));

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
      setChangeStats({
        cases: prevTotalCount ? ((stats.totalCases - prevTotalCount) / prevTotalCount) * 100 : null,
        judgments: prevJudgmentsCount ? ((stats.totalJudgments - prevJudgmentsCount) / prevJudgmentsCount) * 100 : null,
      });
    } catch (err) {
      handleQueryError(err);
      // Use default values if calculation fails
      setChangeStats({ cases: null, judgments: null });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-stone-900">{t('dashboard.title')}</h2>
        <p className="mt-1 text-sm text-stone-600">{t('dashboard.subtitle')}</p>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/30 text-danger-dark px-4 py-3 rounded-md" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {loading ? (
        <LoadingState label={t('dashboard.loading')} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <DashboardCard
              title={t('dashboard.cases')}
              value={stats.totalCases.toString()}
              changePercent={changeStats.cases}
              changeLabel={t('dashboard.vsLastMonth')}
              type="cases"
              onClick={() => setActiveTab('cases')}
            />
            <DashboardCard
              title={t('dashboard.judgments')}
              value={stats.totalJudgments.toString()}
              changePercent={changeStats.judgments}
              changeLabel={t('dashboard.vsLastMonth')}
              type="judgments"
              onClick={() => setActiveTab('judgments')}
            />
          </div>

          <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">{t('dashboard.analytics')}</h3>
              <p className="mt-1 text-sm text-stone-600">{t('dashboard.analyticsSubtitle')}</p>
            </div>
            <Button onClick={() => setActiveTab('analytics')} icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
              {t('dashboard.viewFullAnalytics')}
            </Button>
          </Card>

          <RecentLegalUpdates />
        </>
      )}
    </div>
  );
};

export default DashboardLayout;
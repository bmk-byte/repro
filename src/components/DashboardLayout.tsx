import React, { useState } from 'react';
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
  const [changeStats, setChangeStats] = useState({
    cases: '+0.0%',
    judgments: '+0.0%'
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
      <div>
        <h2 className="font-serif text-2xl font-semibold text-stone-900">Dashboard</h2>
        <p className="mt-1 text-sm text-stone-600">An overview of cases, judgments, and recent activity.</p>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/30 text-danger-dark px-4 py-3 rounded-md" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading dashboard…" />
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

          <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">Analytics</h3>
              <p className="mt-1 text-sm text-stone-600">Trends, distribution, geography, outcomes, and more.</p>
            </div>
            <Button onClick={() => setActiveTab('analytics')} icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
              View full analytics
            </Button>
          </Card>

          <RecentLegalUpdates />
        </>
      )}
    </div>
  );
};

export default DashboardLayout;
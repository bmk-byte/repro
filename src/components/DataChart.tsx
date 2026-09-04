import React from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { supabase, queryWithRetry, handleSupabaseError } from '../lib/supabase';
import { toast } from '../lib/toast';
import { LoadingState, ErrorState, Button } from './ui';
import { CHART_COLORS, CHART_GRID_COLOR } from '../lib/chartColors';

interface DataPoint {
  name: string;
  total: number;
  completed: number;
  in_progress: number;
  litigation: number;
}

interface DataChartProps {
  type?: 'line' | 'bar' | 'area';
}

const DataChart: React.FC<DataChartProps> = ({ type = 'area' }) => {
  const { t } = useTranslation('analytics');
  const [data, setData] = React.useState<DataPoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    fetchCaseData();
  }, []);

  const fetchCaseData = async () => {
    try {
      setLoading(true);
      setError(null);

      const cases = await queryWithRetry(async () => {
        const { data, error } = await supabase
          .from('cases')
          .select('created_at, case_type, status')
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
      });

      if (!cases || cases.length === 0) {
        setData([]);
        setError(t('dataChart.noApprovedData'));
        return;
      }

      // Process the data to get monthly counts
      const monthlyData = processMonthlyData(cases);
      setData(monthlyData);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      console.error('Error fetching case data:', errorMessage);
      setError(errorMessage);
      toast.error(t('dataChart.loadErrorToast', { error: errorMessage }));
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchCaseData();
  };

  const processMonthlyData = (cases: any[]): DataPoint[] => {
    const monthlyCount: {
      [key: string]: {
        total: number;
        completed: number;
        in_progress: number;
        litigation: number;
      }
    } = {};

    // Initialize the last 12 months (instead of 6) for a more comprehensive view
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyCount[monthKey] = {
        total: 0,
        completed: 0,
        in_progress: 0,
        litigation: 0
      };
    }

    // Count cases by month, type, and status
    cases.forEach(caseItem => {
      const date = new Date(caseItem.created_at);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });

      if (monthlyCount[monthKey]) {
        // Increment total count
        monthlyCount[monthKey].total++;

        // Count by case type
        if (caseItem.case_type === 'litigation') {
          monthlyCount[monthKey].litigation++;
        }

        // Count by status
        if (caseItem.status === 'completed') {
          monthlyCount[monthKey].completed++;
        } else if (caseItem.status === 'in_progress') {
          monthlyCount[monthKey].in_progress++;
        }
      }
    });

    // Convert to array format for Recharts
    return Object.entries(monthlyCount).map(([name, counts]) => ({
      name,
      total: counts.total,
      completed: counts.completed,
      in_progress: counts.in_progress,
      litigation: counts.litigation
    }));
  };

  if (loading) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <LoadingState label={t('dataChart.loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <ErrorState
          description={retryCount > 0 ? t('dataChart.retryAttempt', { error, count: retryCount }) : error}
          action={
            <Button onClick={handleRetry} loading={loading}>
              {t('dataChart.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <div className="text-stone-500">{t('dataChart.noData')}</div>
      </div>
    );
  }

  const commonAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
      <XAxis
        dataKey="name"
        tick={{ fontSize: 12 }}
        tickLine={{ stroke: CHART_GRID_COLOR }}
        axisLine={{ stroke: CHART_GRID_COLOR }}
      />
      <YAxis
        tick={{ fontSize: 12 }}
        tickLine={{ stroke: CHART_GRID_COLOR }}
        axisLine={{ stroke: CHART_GRID_COLOR }}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: `1px solid ${CHART_GRID_COLOR}`
        }}
        formatter={(value: any) => [t('dataChart.tooltipCases', { count: value }), '']}
      />
      <Legend
        verticalAlign="top"
        height={36}
        wrapperStyle={{ paddingTop: '10px' }}
      />
    </>
  );

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            {commonAxes}

            <Line
              type="monotone"
              dataKey="total"
              name={t('dataChart.series.total')}
              stroke={CHART_COLORS.info}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6, strokeWidth: 1 }}
            />

            <Line
              type="monotone"
              dataKey="completed"
              name={t('dataChart.series.completed')}
              stroke={CHART_COLORS.success}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6, strokeWidth: 1 }}
            />

            <Line
              type="monotone"
              dataKey="in_progress"
              name={t('dataChart.series.inProgress')}
              stroke={CHART_COLORS.warning}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6, strokeWidth: 1 }}
            />
          </LineChart>
        ) : type === 'bar' ? (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            {commonAxes}

            <Bar dataKey="total" name={t('dataChart.series.total')} fill={CHART_COLORS.info} />
            <Bar dataKey="completed" name={t('dataChart.series.completed')} fill={CHART_COLORS.success} />
            <Bar dataKey="in_progress" name={t('dataChart.series.inProgress')} fill={CHART_COLORS.warning} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.info} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={CHART_COLORS.info} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorInProgress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.warning} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={CHART_COLORS.warning} stopOpacity={0}/>
              </linearGradient>
            </defs>
            {commonAxes}

            <Area
              type="monotone"
              dataKey="total"
              name={t('dataChart.series.total')}
              stroke={CHART_COLORS.info}
              fillOpacity={1}
              fill="url(#colorTotal)"
              activeDot={{ r: 6, strokeWidth: 1 }}
              strokeWidth={2}
            />

            <Area
              type="monotone"
              dataKey="completed"
              name={t('dataChart.series.completed')}
              stroke={CHART_COLORS.success}
              fillOpacity={1}
              fill="url(#colorCompleted)"
              activeDot={{ r: 6, strokeWidth: 1 }}
              strokeWidth={2}
            />

            <Area
              type="monotone"
              dataKey="in_progress"
              name={t('dataChart.series.inProgress')}
              stroke={CHART_COLORS.warning}
              fillOpacity={1}
              fill="url(#colorInProgress)"
              activeDot={{ r: 6, strokeWidth: 1 }}
              strokeWidth={2}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default DataChart;

import React from 'react';
import { Card, Title } from '@tremor/react';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PerformanceMetricsProps {
  dateRange: [Date, Date];
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ dateRange }) => {
  const [metrics, setMetrics] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch cases within date range
      const { data: cases, error: casesError } = await supabase
        .from('cases')
        .select(`
          created_at,
          status,
          case_type,
          countries (name)
        `)
        .eq('moderation_status', 'approved')
        .gte('created_at', dateRange[0].toISOString())
        .lte('created_at', dateRange[1].toISOString());

      if (casesError) throw casesError;

      if (!cases || cases.length === 0) {
        setMetrics([]);
        setError('No case data available for the selected date range');
        return;
      }
      
      // Process data for charts
      const processedData = processMetricsData(cases);
      setMetrics(processedData);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load performance metrics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const processMetricsData = (cases: any[]) => {
    // Group cases by month
    const monthlyData: { [key: string]: { total: number, completed: number, in_progress: number, pending: number } } = {};
    
    // Initialize months in the date range
    const startDate = new Date(dateRange[0]);
    const endDate = new Date(dateRange[1]);
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const monthKey = currentDate.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyData[monthKey] = { total: 0, completed: 0, in_progress: 0, pending: 0 };
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Count cases by month and status
    cases.forEach(caseItem => {
      const date = new Date(caseItem.created_at);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].total++;
        
        if (caseItem.status === 'completed') {
          monthlyData[monthKey].completed++;
        } else if (caseItem.status === 'in_progress') {
          monthlyData[monthKey].in_progress++;
        } else if (caseItem.status === 'pending') {
          monthlyData[monthKey].pending++;
        }
      }
    });
    
    // Convert to array format for charts
    return Object.entries(monthlyData).map(([name, counts]) => ({
      name,
      ...counts
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={fetchMetrics}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none">
        <Title>Case Resolution Trends</Title>
        {metrics.length > 0 ? (
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={metrics}
                margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorInProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={{ stroke: '#E5E7EB' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis 
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={{ stroke: '#E5E7EB' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  width={40}
                  tickCount={6}
                  domain={[0, 'auto']}
                  label={{ 
                    value: 'Cases', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 }
                  }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
                    border: '1px solid #E5E7EB' 
                  }}
                  formatter={(value: any) => [`${value} cases`, '']}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  wrapperStyle={{ paddingTop: '10px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  name="Completed" 
                  stroke="#10B981" 
                  fillOpacity={1} 
                  fill="url(#colorCompleted)" 
                  activeDot={{ r: 6, strokeWidth: 1 }}
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="in_progress" 
                  name="In Progress" 
                  stroke="#3B82F6" 
                  fillOpacity={1} 
                  fill="url(#colorInProgress)" 
                  activeDot={{ r: 6, strokeWidth: 1 }}
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="pending" 
                  name="Pending" 
                  stroke="#F59E0B" 
                  fillOpacity={1} 
                  fill="url(#colorPending)" 
                  activeDot={{ r: 6, strokeWidth: 1 }}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center">
            <p className="text-stone-500">No case resolution data available</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PerformanceMetrics;
import React from 'react';
import { Card, Title, Text, Flex } from '@tremor/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingState } from './ui';
import { CHART_COLORS } from '../lib/chartColors';

interface TimelineData {
  name: string;
  filed: number;
  ongoing: number;
  resolved: number;
  dismissed: number;
}

const TimelineVisualization: React.FC = () => {
  const [data, setData] = React.useState<TimelineData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = React.useState<string>('all');
  const [countries, setCountries] = React.useState<{id: string, name: string}[]>([]);
  const [averageResolutionTime, setAverageResolutionTime] = React.useState<number>(0);
  const [caseAging, setCaseAging] = React.useState<{
    lessThan30: number;
    between30And90: number;
    moreThan90: number;
  }>({ lessThan30: 0, between30And90: 0, moreThan90: 0 });

  React.useEffect(() => {
    fetchCountries();
  }, []);

  React.useEffect(() => {
    fetchTimelineData();
  }, [selectedCountry]);

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCountries(data || []);
    } catch (err) {
      console.error('Error fetching countries:', err);
    }
  };

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch cases with timeline status
      let query = supabase
        .from('cases')
        .select(`
          id,
          created_at,
          timeline_status,
          status,
          country_id
        `)
        .eq('moderation_status', 'approved');

      if (selectedCountry !== 'all') {
        query = query.eq('country_id', selectedCountry);
      }

      const { data: cases, error: casesError } = await query;

      if (casesError) throw casesError;

      if (!cases || cases.length === 0) {
        setData([]);
        setAverageResolutionTime(0);
        setCaseAging({ lessThan30: 0, between30And90: 0, moreThan90: 0 });
        setError('No timeline data available');
        return;
      }

      // Process timeline data
      const timelineData = processTimelineData(cases);
      setData(timelineData);

      // Calculate average resolution time based on case age
      calculateResolutionTime(cases);

      // Calculate case aging
      calculateCaseAging(cases);

    } catch (err) {
      console.error('Error fetching timeline data:', err);
      setError('Failed to load timeline data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const processTimelineData = (cases: any[]): TimelineData[] => {
    // Group cases by month
    const monthlyData: { [key: string]: { filed: number; ongoing: number; resolved: number; dismissed: number } } = {};
    
    // Initialize the last 6 months
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyData[monthKey] = { filed: 0, ongoing: 0, resolved: 0, dismissed: 0 };
    }
    
    // Count cases by month and status
    cases.forEach(caseItem => {
      const date = new Date(caseItem.created_at);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      if (monthlyData[monthKey]) {
        // Count as "filed" for all cases in their creation month
        monthlyData[monthKey].filed++;
        
        // Also count by current status
        if (caseItem.timeline_status === 'ongoing' || caseItem.status === 'in_progress') {
          monthlyData[monthKey].ongoing++;
        } else if (caseItem.timeline_status === 'resolved' || caseItem.status === 'completed') {
          monthlyData[monthKey].resolved++;
        } else if (caseItem.timeline_status === 'dismissed') {
          monthlyData[monthKey].dismissed++;
        }
      }
    });
    
    // Convert to array format for charts
    return Object.entries(monthlyData).map(([name, counts]) => ({
      name,
      ...counts
    }));
  };

  const calculateResolutionTime = (cases: any[]) => {
    // Filter for resolved cases and calculate average time from creation to now
    const resolvedCases = cases.filter(c => 
      (c.timeline_status === 'resolved' || c.status === 'completed') && 
      c.created_at
    );
    
    if (resolvedCases.length === 0) {
      setAverageResolutionTime(0);
      return;
    }
    
    // Calculate average time from creation to now
    const totalDays = resolvedCases.reduce((sum, c) => {
      const createdDate = new Date(c.created_at);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);
    
    setAverageResolutionTime(Math.round(totalDays / resolvedCases.length));
  };

  const calculateCaseAging = (cases: any[]) => {
    const today = new Date();
    let lessThan30 = 0;
    let between30And90 = 0;
    let moreThan90 = 0;
    
    // Only consider ongoing cases
    const ongoingCases = cases.filter(c => 
      (c.timeline_status === 'ongoing' || c.status === 'in_progress' || (!c.timeline_status && c.status !== 'completed')) && 
      c.created_at
    );
    
    ongoingCases.forEach(c => {
      const createdDate = new Date(c.created_at);
      const diffTime = Math.abs(today.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 30) {
        lessThan30++;
      } else if (diffDays >= 30 && diffDays <= 90) {
        between30And90++;
      } else {
        moreThan90++;
      }
    });
    
    const total = ongoingCases.length;
    setCaseAging({
      lessThan30: total > 0 ? Math.round((lessThan30 / total) * 100) : 0,
      between30And90: total > 0 ? Math.round((between30And90 / total) * 100) : 0,
      moreThan90: total > 0 ? Math.round((moreThan90 / total) * 100) : 0
    });
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <Title>Case Timeline Progression</Title>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Countries</option>
          {countries.map(country => (
            <option key={country.id} value={country.id}>{country.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState label="Loading timeline…" />
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      ) : (
        <>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                
                <Area
                  type="monotone"
                  dataKey="filed"
                  stackId="1"
                  name="Filed"
                  fill={CHART_COLORS.warning}
                  fillOpacity={0.5}
                  stroke={CHART_COLORS.warning}
                />
                <Area
                  type="monotone"
                  dataKey="ongoing"
                  stackId="1"
                  name="Ongoing"
                  fill={CHART_COLORS.info}
                  fillOpacity={0.5}
                  stroke={CHART_COLORS.info}
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stackId="1"
                  name="Resolved"
                  fill={CHART_COLORS.success}
                  fillOpacity={0.5}
                  stroke={CHART_COLORS.success}
                />
                <Area
                  type="monotone"
                  dataKey="dismissed"
                  stackId="1"
                  name="Dismissed"
                  fill={CHART_COLORS.danger}
                  fillOpacity={0.5}
                  stroke={CHART_COLORS.danger}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-64">
              <Text>No timeline data available</Text>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-stone-50 p-4 rounded-lg">
              <Flex>
                <Calendar className="h-5 w-5 text-warning" />
                <Text className="font-medium">Filed Cases</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold">
                {data.reduce((sum, item) => sum + item.filed, 0)}
              </Text>
              <Text className="text-stone-500 text-sm">New cases in period</Text>
            </div>
            
            <div className="bg-stone-50 p-4 rounded-lg">
              <Flex>
                <Clock className="h-5 w-5 text-info" />
                <Text className="font-medium">Ongoing Cases</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold">
                {data.reduce((sum, item) => sum + item.ongoing, 0)}
              </Text>
              <Text className="text-stone-500 text-sm">Currently in progress</Text>
            </div>
            
            <div className="bg-stone-50 p-4 rounded-lg">
              <Flex>
                <CheckCircle className="h-5 w-5 text-success" />
                <Text className="font-medium">Resolved Cases</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold">
                {data.reduce((sum, item) => sum + item.resolved, 0)}
              </Text>
              <Text className="text-stone-500 text-sm">Successfully completed</Text>
            </div>
            
            <div className="bg-stone-50 p-4 rounded-lg">
              <Flex>
                <XCircle className="h-5 w-5 text-danger" />
                <Text className="font-medium">Dismissed Cases</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold">
                {data.reduce((sum, item) => sum + item.dismissed, 0)}
              </Text>
              <Text className="text-stone-500 text-sm">Unsuccessful outcomes</Text>
            </div>
          </div>

          <div className="mt-6 p-4 bg-stone-50 rounded-lg">
            <Flex>
              <div>
                <Text className="font-medium">Average Resolution Time</Text>
                <Text className="mt-1 text-2xl font-bold">{averageResolutionTime} days</Text>
                <Text className="text-stone-500 text-sm">From filing to resolution</Text>
              </div>
              <div className="text-right">
                <Text className="font-medium">Case Aging</Text>
                <div className="flex items-center mt-1 justify-end">
                  <div className="w-2 h-2 rounded-full bg-success mr-1"></div>
                  <Text className="text-sm">{'<'} 30 days: {caseAging.lessThan30}%</Text>
                </div>
                <div className="flex items-center justify-end">
                  <div className="w-2 h-2 rounded-full bg-warning mr-1"></div>
                  <Text className="text-sm">30-90 days: {caseAging.between30And90}%</Text>
                </div>
                <div className="flex items-center justify-end">
                  <div className="w-2 h-2 rounded-full bg-danger mr-1"></div>
                  <Text className="text-sm">{'>'} 90 days: {caseAging.moreThan90}%</Text>
                </div>
              </div>
            </Flex>
          </div>
        </>
      )}
    </Card>
  );
};

export default TimelineVisualization;
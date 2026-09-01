import React from 'react';
import { Card, Title, Text, Flex, ProgressBar } from '@tremor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];

interface OutcomeData {
  name: string;
  value: number;
}

const OutcomeMetricsDashboard: React.FC = () => {
  const [outcomeData, setOutcomeData] = React.useState<OutcomeData[]>([]);
  const [jurisdictionData, setJurisdictionData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedJurisdiction, setSelectedJurisdiction] = React.useState<string>('all');
  const [jurisdictions, setJurisdictions] = React.useState<string[]>(['all']);
  const [stats, setStats] = React.useState({
    won: 0,
    lost: 0,
    settled: 0,
    ongoing: 0,
    totalCases: 0,
    successRate: 0
  });

  React.useEffect(() => {
    fetchJurisdictions();
  }, []);

  React.useEffect(() => {
    fetchOutcomeData();
  }, [selectedJurisdiction]);

  const fetchJurisdictions = async () => {
    try {
      // Get unique judicial bodies
      const { data, error } = await supabase
        .from('cases')
        .select('judicial_body')
        .eq('moderation_status', 'approved')
        .not('judicial_body', 'is', null);

      if (error) throw error;

      const uniqueJurisdictions = Array.from(new Set(data.map(item => item.judicial_body))).filter(Boolean);
      setJurisdictions(['all', ...uniqueJurisdictions]);
    } catch (err) {
      console.error('Error fetching jurisdictions:', err);
    }
  };

  const fetchOutcomeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch cases with outcome data
      let query = supabase
        .from('cases')
        .select(`
          id,
          status,
          timeline_status,
          client_satisfaction,
          judicial_body,
          court
        `)
        .eq('moderation_status', 'approved');

      if (selectedJurisdiction !== 'all') {
        query = query.eq('judicial_body', selectedJurisdiction);
      }

      const { data: cases, error: casesError } = await query;

      if (casesError) throw casesError;

      if (!cases || cases.length === 0) {
        setOutcomeData([]);
        setJurisdictionData([]);
        setStats({
          won: 0,
          lost: 0,
          settled: 0,
          ongoing: 0,
          totalCases: 0,
          successRate: 0
        });
        setError('No outcome data available');
        return;
      }

      // Process outcome data
      const outcomes: Record<string, number> = {
        'Won': 0,
        'Lost': 0,
        'Settled': 0,
        'Ongoing': 0,
        'Dismissed': 0
      };

      cases.forEach(caseItem => {
        // Map timeline_status to outcome categories
        if (caseItem.timeline_status === 'resolved') {
          // Consider it "won" if client_satisfaction is high (4-5)
          if (caseItem.client_satisfaction >= 4) {
            outcomes['Won']++;
          } 
          // Consider it "lost" if client_satisfaction is low (1-2)
          else if (caseItem.client_satisfaction && caseItem.client_satisfaction <= 2) {
            outcomes['Lost']++;
          }
          // Otherwise consider it "settled"
          else {
            outcomes['Settled']++;
          }
        } else if (caseItem.timeline_status === 'ongoing' || caseItem.status === 'in_progress') {
          outcomes['Ongoing']++;
        } else if (caseItem.timeline_status === 'dismissed') {
          outcomes['Dismissed']++;
        } else if (caseItem.status === 'completed') {
          // For completed cases without timeline_status, use client_satisfaction
          if (caseItem.client_satisfaction >= 4) {
            outcomes['Won']++;
          } else if (caseItem.client_satisfaction && caseItem.client_satisfaction <= 2) {
            outcomes['Lost']++;
          } else {
            outcomes['Settled']++;
          }
        } else {
          // Default to ongoing for other statuses
          outcomes['Ongoing']++;
        }
      });

      // Convert to array format for charts
      const outcomeArray = Object.entries(outcomes)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0);

      // Process jurisdiction success rate data
      const jurisdictionSuccess: Record<string, { total: number, success: number }> = {};
      
      cases.forEach(caseItem => {
        const jurisdiction = caseItem.judicial_body || caseItem.court || 'Unknown';
        
        if (!jurisdictionSuccess[jurisdiction]) {
          jurisdictionSuccess[jurisdiction] = { total: 0, success: 0 };
        }
        
        jurisdictionSuccess[jurisdiction].total++;
        
        // Count as success if resolved with high satisfaction or completed with high satisfaction
        if ((caseItem.timeline_status === 'resolved' || caseItem.status === 'completed') && 
            caseItem.client_satisfaction && caseItem.client_satisfaction >= 4) {
          jurisdictionSuccess[jurisdiction].success++;
        }
      });
      
      // Convert to array and calculate success rates
      const jurisdictionArray = Object.entries(jurisdictionSuccess)
        .map(([name, data]) => ({
          name,
          rate: data.total > 0 ? Math.round((data.success / data.total) * 100) : 0
        }))
        .filter(item => item.name !== 'Unknown' && item.rate > 0)
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 4); // Top 4 jurisdictions

      // Calculate overall stats
      const totalCases = cases.length;
      const resolvedCases = cases.filter(c => 
        c.timeline_status === 'resolved' || 
        c.timeline_status === 'dismissed' || 
        (c.status === 'completed' && c.timeline_status !== 'ongoing')
      );
      
      const successfulCases = cases.filter(c => 
        (c.timeline_status === 'resolved' || c.status === 'completed') && 
        c.client_satisfaction && c.client_satisfaction >= 4
      );
      
      const successRate = resolvedCases.length > 0 
        ? Math.round((successfulCases.length / resolvedCases.length) * 100)
        : 0;

      setOutcomeData(outcomeArray);
      setJurisdictionData(jurisdictionArray);
      setStats({
        won: outcomes['Won'],
        lost: outcomes['Lost'],
        settled: outcomes['Settled'],
        ongoing: outcomes['Ongoing'],
        totalCases,
        successRate
      });

    } catch (err) {
      console.error('Error fetching outcome data:', err);
      setError('Failed to load outcome metrics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <Title>Outcome Metrics Dashboard</Title>
        <select
          value={selectedJurisdiction}
          onChange={(e) => setSelectedJurisdiction(e.target.value)}
          className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {jurisdictions.map(jurisdiction => (
            <option key={jurisdiction} value={jurisdiction}>
              {jurisdiction === 'all' ? 'All Jurisdictions' : jurisdiction}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <Flex>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Text className="font-medium">Won</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold text-green-600">
                {stats.won}
              </Text>
              <Text className="text-green-600 text-sm">
                {stats.totalCases > 0 ? Math.round((stats.won / stats.totalCases) * 100) : 0}% of total cases
              </Text>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
              <Flex>
                <XCircle className="h-5 w-5 text-red-500" />
                <Text className="font-medium">Lost</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold text-red-600">
                {stats.lost}
              </Text>
              <Text className="text-red-600 text-sm">
                {stats.totalCases > 0 ? Math.round((stats.lost / stats.totalCases) * 100) : 0}% of total cases
              </Text>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
              <Flex>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <Text className="font-medium">Settled</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold text-amber-600">
                {stats.settled}
              </Text>
              <Text className="text-amber-600 text-sm">
                {stats.totalCases > 0 ? Math.round((stats.settled / stats.totalCases) * 100) : 0}% of total cases
              </Text>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <Flex>
                <Clock className="h-5 w-5 text-blue-500" />
                <Text className="font-medium">Ongoing</Text>
              </Flex>
              <Text className="mt-2 text-2xl font-bold text-blue-600">
                {stats.ongoing}
              </Text>
              <Text className="text-blue-600 text-sm">
                {stats.totalCases > 0 ? Math.round((stats.ongoing / stats.totalCases) * 100) : 0}% of total cases
              </Text>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Title>Case Outcomes</Title>
              {outcomeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={outcomeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Cases" fill="#9C1D20" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>No outcome data available</Text>
                </div>
              )}
            </div>
            
            <div>
              <Title>Outcome Distribution</Title>
              {outcomeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={outcomeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {outcomeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} cases`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>No outcome distribution data available</Text>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <Title>Success Rate by Jurisdiction</Title>
              {jurisdictionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    layout="vertical" 
                    data={jurisdictionData}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Success Rate']} />
                    <Bar 
                      dataKey="rate" 
                      name="Success Rate" 
                      fill="#10B981" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>No jurisdiction success rate data available</Text>
                </div>
              )}
            </Card>
            
            <Card>
              <Title>Case Resolution Progress</Title>
              <div className="mt-4 space-y-4">
                <div className="p-3 bg-stone-50 rounded-lg">
                  <Text className="font-medium">Overall Resolution Rate</Text>
                  <Flex className="mt-2">
                    <Text>Resolved vs. Total Cases</Text>
                    <Text className="font-medium">
                      {stats.totalCases - stats.ongoing} of {stats.totalCases} cases
                    </Text>
                  </Flex>
                  <ProgressBar 
                    value={stats.totalCases > 0 ? ((stats.totalCases - stats.ongoing) / stats.totalCases) * 100 : 0} 
                    color="amber" 
                    className="mt-2" 
                  />
                </div>
                
                <div className="p-3 bg-stone-50 rounded-lg">
                  <Text className="font-medium">Success Rate</Text>
                  <Flex className="mt-2">
                    <Text>Successful outcomes</Text>
                    <Text className="font-medium">{stats.successRate}%</Text>
                  </Flex>
                  <ProgressBar value={stats.successRate} color="green" className="mt-2" />
                </div>
                
                <div className="p-3 bg-stone-50 rounded-lg">
                  <Text className="font-medium">Case Completion</Text>
                  <Flex className="mt-2">
                    <Text>Completed cases</Text>
                    <Text className="font-medium">
                      {stats.won + stats.lost + stats.settled} cases
                    </Text>
                  </Flex>
                  <ProgressBar 
                    value={stats.totalCases > 0 ? ((stats.won + stats.lost + stats.settled) / stats.totalCases) * 100 : 0} 
                    color="blue" 
                    className="mt-2" 
                  />
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-stone-50 rounded-lg">
            <Flex>
              <div>
                <Text className="font-medium">Overall Success Rate</Text>
                <Text className="mt-1 text-2xl font-bold text-green-600">{stats.successRate}%</Text>
                <Text className="text-stone-500 text-sm">Based on resolved cases</Text>
              </div>
              <div className="text-right">
                <Text className="font-medium">Key Performance Indicators</Text>
                <Text className="text-stone-500 text-sm">Total Cases: {stats.totalCases}</Text>
                <Text className="text-stone-500 text-sm">
                  Resolution Rate: {stats.totalCases > 0 ? Math.round(((stats.totalCases - stats.ongoing) / stats.totalCases) * 100) : 0}%
                </Text>
              </div>
            </Flex>
          </div>
        </>
      )}
    </Card>
  );
};

export default OutcomeMetricsDashboard;
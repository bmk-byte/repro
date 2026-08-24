import React from 'react';
import { Card, Title, Text, Flex } from '@tremor/react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Scale, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';

const COLORS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444'];

interface LegalFrameworkData {
  name: string;
  domestic: number;
  international: number;
  both: number;
}

interface ProtocolData {
  name: string;
  value: number;
}

const LegalFrameworkAnalysis: React.FC = () => {
  const [timeData, setTimeData] = React.useState<LegalFrameworkData[]>([]);
  const [protocolData, setProtocolData] = React.useState<ProtocolData[]>([]);
  const [frameworkDistribution, setFrameworkDistribution] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [categories, setCategories] = React.useState<string[]>([]);

  React.useEffect(() => {
    fetchCategories();
  }, []);

  React.useEffect(() => {
    fetchLegalFrameworkData();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('case_categories')
        .eq('moderation_status', 'approved')
        .not('case_categories', 'is', null);

      if (error) throw error;

      // Flatten and get unique categories
      const allCategories = data?.flatMap(item => item.case_categories || []) || [];
      const uniqueCategories = Array.from(new Set(allCategories));
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Fallback to default categories if needed
      setCategories([
        'Access to Safe Abortion',
        'Maternal Health and Mortality',
        'Sexual and Gender-Based Violence (SGBV)',
        'Reproductive Healthcare',
        'Family Planning'
      ]);
    }
  };

  const fetchLegalFrameworkData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch cases with legal framework data
      let query = supabase
        .from('cases')
        .select(`
          legal_framework_type,
          domestic_laws,
          international_laws,
          protocols,
          created_at
        `)
        .eq('moderation_status', 'approved')
        .not('legal_framework_type', 'is', null);

      // Apply category filter if selected
      if (selectedCategory !== 'all') {
        query = query.contains('case_categories', [selectedCategory]);
      }

      const { data: cases, error: casesError } = await query;

      if (casesError) throw casesError;

      if (!cases || cases.length === 0) {
        setTimeData([]);
        setProtocolData([]);
        setFrameworkDistribution([]);
        setError('No legal framework data available');
        return;
      }

      // Process time-based data
      const timeBasedData = processTimeData(cases);
      setTimeData(timeBasedData);

      // Process protocol data
      const protocols = processProtocolData(cases);
      setProtocolData(protocols);

      // Process framework distribution
      const distribution = processFrameworkDistribution(cases);
      setFrameworkDistribution(distribution);

    } catch (err) {
      console.error('Error fetching legal framework data:', err);
      setError('Failed to load legal framework data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const processTimeData = (cases: any[]): LegalFrameworkData[] => {
    // Group cases by month
    const monthlyData: { [key: string]: { domestic: number; international: number; both: number } } = {};
    
    // Initialize the last 6 months
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthlyData[monthKey] = { domestic: 0, international: 0, both: 0 };
    }
    
    // Count cases by month and framework type
    cases.forEach(caseItem => {
      const date = new Date(caseItem.created_at);
      const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      if (monthlyData[monthKey]) {
        const frameworkType = caseItem.legal_framework_type?.toLowerCase() || 'unknown';
        if (frameworkType === 'domestic law') {
          monthlyData[monthKey].domestic++;
        } else if (frameworkType === 'international law') {
          monthlyData[monthKey].international++;
        } else if (frameworkType === 'both') {
          monthlyData[monthKey].both++;
        }
      }
    });
    
    // Convert to array format for charts
    return Object.entries(monthlyData).map(([name, counts]) => ({
      name,
      domestic: counts.domestic,
      international: counts.international,
      both: counts.both
    }));
  };

  const processProtocolData = (cases: any[]): ProtocolData[] => {
    // Count protocol citations
    const protocolCounts: { [key: string]: number } = {};
    
    cases.forEach(caseItem => {
      if (caseItem.protocols && Array.isArray(caseItem.protocols)) {
        caseItem.protocols.forEach((protocol: string) => {
          protocolCounts[protocol] = (protocolCounts[protocol] || 0) + 1;
        });
      }
    });
    
    // Convert to array and sort by count
    return Object.entries(protocolCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 protocols
  };

  const processFrameworkDistribution = (cases: any[]): any[] => {
    // Count cases by framework type
    const frameworkCounts = {
      'Domestic Law Only': 0,
      'International Law Only': 0,
      'Both Used': 0
    };
    
    cases.forEach(caseItem => {
      const frameworkType = caseItem.legal_framework_type?.toLowerCase() || 'unknown';
      if (frameworkType === 'domestic law') {
        frameworkCounts['Domestic Law Only']++;
      } else if (frameworkType === 'international law') {
        frameworkCounts['International Law Only']++;
      } else if (frameworkType === 'both') {
        frameworkCounts['Both Used']++;
      }
    });
    
    // Convert to array format for charts
    return Object.entries(frameworkCounts)
      .map(([name, value]) => ({ name, value }));
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <Title>Legal Framework Analysis</Title>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
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
          <div className="mb-6">
            <Title>Legal Instruments Used</Title>
            {timeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="domestic" 
                    stackId="1"
                    name="Domestic Law" 
                    fill="#FBBF24" 
                    stroke="#F59E0B" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="international" 
                    stackId="1"
                    name="International Law" 
                    fill="#60A5FA" 
                    stroke="#3B82F6" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="both" 
                    stackId="1"
                    name="Both" 
                    fill="#A78BFA" 
                    stroke="#8B5CF6" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-64">
                <Text>No time-based legal framework data available</Text>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Title>Protocol Citation Frequency</Title>
              {protocolData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    layout="vertical" 
                    data={protocolData}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar 
                      dataKey="value" 
                      name="Citations" 
                      fill="#8B5CF6" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>No protocol citation data available</Text>
                </div>
              )}
            </div>
            
            <div>
              <Title>Domestic vs International Law</Title>
              {frameworkDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={frameworkDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill="#F59E0B" />
                      <Cell fill="#3B82F6" />
                      <Cell fill="#8B5CF6" />
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} cases`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>No framework distribution data available</Text>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <Flex>
                <FileText className="h-5 w-5 text-amber-500" />
                <Text className="font-medium">Domestic Legal Frameworks</Text>
              </Flex>
              <div className="mt-2 space-y-2">
                {/* This section now uses real data from the database */}
                {timeData.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <Text>Total Domestic Law Cases</Text>
                      <Text className="font-medium">
                        {timeData.reduce((sum, item) => sum + item.domestic, 0)}
                      </Text>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-amber-500 h-2 rounded-full" 
                        style={{ 
                          width: '100%'
                        }}
                      ></div>
                    </div>
                  </>
                ) : (
                  <Text>No domestic law data available</Text>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <Flex>
                <Scale className="h-5 w-5 text-blue-500" />
                <Text className="font-medium">International Instruments</Text>
              </Flex>
              <div className="mt-2 space-y-2">
                {/* This section now uses real data from the database */}
                {timeData.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <Text>Total International Law Cases</Text>
                      <Text className="font-medium">
                        {timeData.reduce((sum, item) => sum + item.international, 0)}
                      </Text>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: '100%'
                        }}
                      ></div>
                    </div>
                  </>
                ) : (
                  <Text>No international law data available</Text>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <Flex>
                <BookOpen className="h-5 w-5 text-purple-500" />
                <Text className="font-medium">Combined Approach</Text>
              </Flex>
              <div className="mt-2 space-y-2">
                {/* This section now uses real data from the database */}
                {timeData.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <Text>Total Combined Approach Cases</Text>
                      <Text className="font-medium">
                        {timeData.reduce((sum, item) => sum + item.both, 0)}
                      </Text>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ 
                          width: '100%'
                        }}
                      ></div>
                    </div>
                  </>
                ) : (
                  <Text>No combined approach data available</Text>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default LegalFrameworkAnalysis;
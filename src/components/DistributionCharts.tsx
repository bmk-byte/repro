import React from 'react';
import { motion } from 'framer-motion';
import { Card, Title, Text, Flex } from '@tremor/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { supabase, queryWithRetry, handleSupabaseError } from '../lib/supabase';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// Custom colors based on #9C1D20 theme with black for Rapid Response
const CASE_TYPE_COLORS = ["#9C1D20", "#000000"];
const STATUS_COLORS = ["#F59E0B", "#10B981", "#EF4444", "#3B82F6"];

interface DistributionChartsProps {
  // Add any props if needed
}

const DistributionCharts: React.FC<DistributionChartsProps> = () => {
  const [data, setData] = React.useState<any>({
    caseTypes: [],
    statusDistribution: [],
    countryDistribution: []
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [totalCases, setTotalCases] = React.useState<number>(0);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    fetchDistributionData();
  }, []);

  const fetchDistributionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch case types distribution with retry logic
      const caseTypes = await queryWithRetry(async () => {
        const { data, error } = await supabase
          .from('cases')
          .select('case_type, status, countries(name)')
          .eq('moderation_status', 'approved');

        if (error) throw error;
        return data;
      });

      if (!caseTypes || caseTypes.length === 0) {
        setData({
          caseTypes: [],
          statusDistribution: [],
          countryDistribution: []
        });
        setError('No approved case data available');
        return;
      }

      // Process data for visualizations
      const processedData = {
        caseTypes: processCaseTypes(caseTypes),
        statusDistribution: processStatusDistribution(caseTypes),
        countryDistribution: processCountryDistribution(caseTypes)
      };

      setData(processedData);
      setTotalCases(caseTypes.length);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error fetching distribution data:', err);
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      
      // Show toast notification for user feedback
      toast.error(`Failed to load distribution data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchDistributionData();
  };

  const processCaseTypes = (cases: any[]) => {
    const types = cases.reduce((acc: any, curr) => {
      const caseType = curr.case_type || 'unknown';
      acc[caseType] = (acc[caseType] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(types).map(([name, value]) => ({
      name: name === 'litigation' ? 'Litigation' : 
            name === 'rapid-response' ? 'Rapid Response' : 
            name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  };

  const processStatusDistribution = (cases: any[]) => {
    const statuses = cases.reduce((acc: any, curr) => {
      const status = curr.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statuses).map(([name, value]) => ({
      name: name === 'in_progress' ? 'In Progress' :
            name === 'completed' ? 'Completed' :
            name === 'pending' ? 'Pending' :
            name === 'on_hold' ? 'On Hold' :
            name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  };

  const processCountryDistribution = (cases: any[]) => {
    const countries = cases.reduce((acc: any, curr) => {
      const countryName = curr.countries?.name || 'Unknown';
      acc[countryName] = (acc[countryName] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(countries)
      .map(([name, value]) => ({
        name,
        value
      }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10); // Top 10 countries
  };

  // Custom tooltip for the donut chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalCases > 0 ? ((data.value / totalCases) * 100).toFixed(1) : '0';
      
      return (
        <div className="bg-white p-3 shadow-lg rounded-md border border-stone-200">
          <p className="font-medium text-stone-900">{data.name}</p>
          <p className="text-stone-600">{data.value} cases ({percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  // Animation variants for cards
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  // Get color for case type
  const getCaseTypeColor = (entry: any, index: number) => {
    // Use black for Rapid Response, primary color for Litigation
    if (entry.name === 'Rapid Response') {
      return "#000000";
    } else if (entry.name === 'Litigation') {
      return "#9C1D20";
    } else {
      return CASE_TYPE_COLORS[index % CASE_TYPE_COLORS.length];
    }
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
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500 text-center max-w-md">
          <p className="font-semibold">Failed to load distribution data</p>
          <p className="text-sm mt-1">{error}</p>
          {retryCount > 0 && (
            <p className="text-xs mt-1 text-stone-500">Retry attempt: {retryCount}</p>
          )}
        </div>
        <button 
          onClick={handleRetry}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Retrying...' : 'Retry'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
          <Card className="border-l-4 border-primary shadow-lg hover:shadow-xl transition-shadow duration-300">
            <Title className="text-xl font-bold text-stone-800">Case Types</Title>
            <div className="mt-2 text-sm text-stone-500">Distribution of cases by type</div>
            {data.caseTypes.length > 0 ? (
              <div className="flex flex-col md:flex-row items-center justify-between mt-4">
                <div className="w-full h-64 md:h-72 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.caseTypes}
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="80%"
                        paddingAngle={4}
                        dataKey="value"
                        minAngle={15}
                        animationDuration={800}
                        animationEasing="ease-out"
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                        aria-label="Case types distribution chart"
                      >
                        {data.caseTypes.map((entry: any, index: number) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={getCaseTypeColor(entry, index)}
                            stroke={getCaseTypeColor(entry, index)}
                            strokeWidth={activeIndex === index ? 2 : 1}
                            className="transition-all duration-300"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center total count */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="text-3xl font-bold font-inter text-stone-800">
                      {totalCases}
                    </div>
                    <div className="text-sm text-stone-500">Total Cases</div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="mt-4 md:mt-0 w-full md:w-auto">
                  <div className="flex flex-col space-y-3 md:pl-4">
                    {data.caseTypes.map((entry: any, index: number) => (
                      <div 
                        key={`legend-${index}`}
                        className={`flex items-center space-x-2 p-2 rounded-md transition-colors duration-300 ${
                          activeIndex === index ? 'bg-stone-100' : ''
                        }`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                      >
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: getCaseTypeColor(entry, index) }}
                        />
                        <div className="flex flex-col md:flex-row md:items-center md:space-x-2">
                          <span className="text-sm font-medium">{entry.name}</span>
                          <span className="text-xs text-stone-500">
                            {entry.value} ({totalCases > 0 ? ((entry.value / totalCases) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center">
                <Text>No case type data available</Text>
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          <Card className="border-l-4 border-blue-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <Title className="text-xl font-bold text-stone-800">Status Distribution</Title>
            <div className="mt-2 text-sm text-stone-500">Cases by current status</div>
            {data.statusDistribution.length > 0 ? (
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    layout="vertical" 
                    data={data.statusDistribution}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip 
                      formatter={(value: any) => [`${value} cases`, 'Count']}
                      contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend />
                    {data.statusDistribution.map((entry: any, index: number) => (
                      <Bar 
                        key={`status-bar-${index}`}
                        dataKey="value" 
                        name={entry.name} 
                        fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                        radius={[0, 12, 12, 0]}
                        barSize={40}
                        animationDuration={300}
                        animationEasing="ease-in-out"
                        className="hover:shadow-lg transition-shadow duration-300"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center">
                <Text>No status distribution data available</Text>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <motion.div
        variants={cardVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-l-4 border-green-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <Title className="text-xl font-bold text-stone-800">Top 10 Countries by Case Volume</Title>
          <div className="mt-2 text-sm text-stone-500">Geographic distribution of cases</div>
          {data.countryDistribution.length > 0 ? (
            <div className="h-72 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.countryDistribution}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [`${value} cases`, 'Count']}
                    contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    name="Cases" 
                    fill="#9C1D20" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={300}
                    animationEasing="ease-in-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center">
              <Text>No country distribution data available</Text>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default DistributionCharts;
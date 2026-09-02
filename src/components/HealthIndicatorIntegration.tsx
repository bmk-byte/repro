import React from 'react';
import { Card, Title, Text, Flex } from '@tremor/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Activity, TrendingUp, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { LoadingState } from './ui';

interface HealthData {
  name: string;
  maternal_mortality: number;
  contraceptive_access: number;
  adolescent_health: number;
  sgbv_reporting: number;
  hiv_testing?: number;
  antenatal_care?: number;
  skilled_birth_attendance?: number;
  child_marriage?: number;
  fgm_prevalence?: number;
  menstrual_health?: number;
}

interface CorrelationData {
  x: number;
  y: number;
  z: number;
  name: string;
}

interface HealthIndicator {
  id: string;
  country_id: string;
  indicator_type: string;
  value: number;
  year: number;
  month: number;
  source: string;
  notes: string;
  countries: {
    name: string;
  };
}

const HealthIndicatorIntegration: React.FC = () => {
  const [healthData, setHealthData] = React.useState<HealthData[]>([]);
  const [correlationData, setCorrelationData] = React.useState<CorrelationData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = React.useState<string>('maternal_mortality');
  const [countries, setCountries] = React.useState<{id: string, name: string}[]>([]);
  const [selectedCountry, setSelectedCountry] = React.useState<string>('all');
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const [indicatorStats, setIndicatorStats] = React.useState<Record<string, {value: number, change: string}>>({
    maternal_mortality: {value: 0, change: '0%'},
    contraceptive_access: {value: 0, change: '0%'},
    adolescent_health: {value: 0, change: '0%'},
    sgbv_reporting: {value: 0, change: '0%'}
  });

  React.useEffect(() => {
    fetchCountries();
  }, []);

  React.useEffect(() => {
    fetchHealthData();
  }, [selectedIndicator, selectedCountry, selectedYear]);

  const fetchCountries = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('countries')
        .select('id, name')
        .order('name');

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setError('No countries found in the database.');
        return;
      }

      setCountries(data);
    } catch (err) {
      console.error('Error fetching countries:', err);
      setError('Failed to load countries. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('health_indicators')
        .select(`
          id,
          country_id,
          indicator_type,
          value,
          year,
          month,
          source,
          notes,
          countries (name)
        `)
        .eq('year', selectedYear);

      if (selectedCountry !== 'all') {
        query = query.eq('country_id', selectedCountry);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setError('No health indicator data available for the selected filters.');
        setHealthData([]);
        setCorrelationData([]);
        setIndicatorStats({
          maternal_mortality: {value: 0, change: '0%'},
          contraceptive_access: {value: 0, change: '0%'},
          adolescent_health: {value: 0, change: '0%'},
          sgbv_reporting: {value: 0, change: '0%'}
        });
        return;
      }

      const processedData = processHealthData(data);
      setHealthData(processedData);

      // Prefer real case-data-driven correlations; fall back to the
      // indicator-only correlation when there isn't enough case data
      // (e.g. sparse/no approved cases) for the selected filters.
      let correlationPoints = await generateCorrelationDataFromReal(data);
      if (correlationPoints.length === 0) {
        correlationPoints = generateCorrelationData(data);
      }
      setCorrelationData(correlationPoints);

      calculateIndicatorStats(data);
    } catch (err) {
      console.error('Error fetching health data:', err);
      const errorMessage = handleSupabaseError(err);
      setError(errorMessage);
      toast.error(`Failed to load health indicator data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const processHealthData = (data: HealthIndicator[]): HealthData[] => {
    // Group data by month
    const monthlyData: { [key: string]: { [key: string]: number } } = {};
    
    // Initialize all months
    for (let month = 1; month <= 12; month++) {
      const monthName = new Date(2000, month - 1, 1).toLocaleString('default', { month: 'short' });
      monthlyData[monthName] = {
        maternal_mortality: 0,
        contraceptive_access: 0,
        adolescent_health: 0,
        sgbv_reporting: 0,
        hiv_testing: 0,
        antenatal_care: 0,
        skilled_birth_attendance: 0,
        child_marriage: 0,
        fgm_prevalence: 0,
        menstrual_health: 0
      };
    }
    
    // Populate with actual data
    data.forEach(indicator => {
      const monthName = new Date(2000, indicator.month - 1, 1).toLocaleString('default', { month: 'short' });
      if (monthlyData[monthName] && indicator.indicator_type) {
        monthlyData[monthName][indicator.indicator_type] = indicator.value;
      }
    });
    
    // Convert to array format for charts
    return Object.entries(monthlyData).map(([name, values]) => ({
      name,
      ...values
    }));
  };

  const generateCorrelationData = (data: HealthIndicator[]): CorrelationData[] => {
    // Group data by country
    const countryData: { [key: string]: { [key: string]: number } } = {};
    
    data.forEach(indicator => {
      const countryName = indicator.countries?.name || 'Unknown';
      if (!countryData[countryName]) {
        countryData[countryName] = {};
      }
      countryData[countryName][indicator.indicator_type] = indicator.value;
    });
    
    // Create correlation data points
    const correlationPoints: CorrelationData[] = [];
    
    Object.entries(countryData).forEach(([country, indicators]) => {
      // Only add points if we have both maternal_mortality and contraceptive_access data
      if (indicators.maternal_mortality !== undefined && indicators.contraceptive_access !== undefined) {
        correlationPoints.push({
          x: indicators.maternal_mortality,
          y: indicators.contraceptive_access,
          z: indicators.adolescent_health || 50, // Use adolescent health for bubble size, default to 50
          name: country
        });
      }
    });
    
    return correlationPoints;
  };

  // Generate correlation data from real case records, joining approved
  // cases (by country and category) with health indicator values.
  const generateCorrelationDataFromReal = async (data: HealthIndicator[]): Promise<CorrelationData[]> => {
    // First, get case data to correlate with health indicators
    const { data: cases, error } = await supabase
      .from('cases')
      .select(`
        id,
        country_id,
        created_at,
        status,
        case_categories
      `)
      .eq('moderation_status', 'approved');
    
    if (error) {
      console.error('Error fetching cases for correlation:', error);
      return [];
    }
    
    // Group health indicators by country
    const countryHealthData: { [key: string]: { [key: string]: number } } = {};
    data.forEach(indicator => {
      const countryId = indicator.country_id;
      if (!countryHealthData[countryId]) {
        countryHealthData[countryId] = {};
      }
      countryHealthData[countryId][indicator.indicator_type] = indicator.value;
    });
    
    // Count cases by country and category
    const countryCaseCounts: { [key: string]: { total: number, reproductive: number } } = {};
    cases.forEach(caseItem => {
      const countryId = caseItem.country_id;
      if (!countryCaseCounts[countryId]) {
        countryCaseCounts[countryId] = { total: 0, reproductive: 0 };
      }
      
      countryCaseCounts[countryId].total++;
      
      // Check if case is related to reproductive health
      const hasReproductiveCategory = caseItem.case_categories?.some(cat => 
        cat.toLowerCase().includes('maternal') || 
        cat.toLowerCase().includes('reproductive') ||
        cat.toLowerCase().includes('abortion') ||
        cat.toLowerCase().includes('contraceptive')
      );
      
      if (hasReproductiveCategory) {
        countryCaseCounts[countryId].reproductive++;
      }
    });
    
    // Create correlation data points
    const correlationPoints: CorrelationData[] = [];
    
    // Get country names for display
    const { data: countryData } = await supabase
      .from('countries')
      .select('id, name');
    
    const countryNames: { [key: string]: string } = {};
    if (countryData) {
      countryData.forEach(country => {
        countryNames[country.id] = country.name;
      });
    }
    
    // Create correlation points
    Object.entries(countryHealthData).forEach(([countryId, indicators]) => {
      // Only add points if we have both health indicator and case data
      if (indicators[selectedIndicator] !== undefined && countryCaseCounts[countryId]) {
        const countryName = countryNames[countryId] || 'Unknown';
        correlationPoints.push({
          x: indicators[selectedIndicator],
          y: countryCaseCounts[countryId].reproductive,
          z: countryCaseCounts[countryId].total,
          name: countryName
        });
      }
    });
    
    return correlationPoints;
  };

  const calculateIndicatorStats = (data: HealthIndicator[]) => {
    // Group by indicator type
    const indicatorValues: { [key: string]: number[] } = {
      maternal_mortality: [],
      contraceptive_access: [],
      adolescent_health: [],
      sgbv_reporting: []
    };
    
    // Collect current year values
    data.forEach(indicator => {
      if (indicatorValues[indicator.indicator_type]) {
        indicatorValues[indicator.indicator_type].push(indicator.value);
      }
    });
    
    // Calculate averages for current year
    const currentStats: Record<string, {value: number, change: string}> = {};
    Object.entries(indicatorValues).forEach(([type, values]) => {
      if (values.length > 0) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        currentStats[type] = { value: Math.round(avg * 10) / 10, change: '0%' };
      } else {
        currentStats[type] = { value: 0, change: '0%' };
      }
    });
    
    // Fetch previous year data to calculate change
    const fetchPreviousYearData = async () => {
      try {
        let query = supabase
          .from('health_indicators')
          .select(`
            indicator_type,
            value
          `)
          .eq('year', selectedYear - 1);
        
        if (selectedCountry !== 'all') {
          query = query.eq('country_id', selectedCountry);
        }
        
        const { data: prevData, error } = await query;
        
        if (error) throw error;
        
        if (prevData && prevData.length > 0) {
          // Group by indicator type
          const prevIndicatorValues: { [key: string]: number[] } = {
            maternal_mortality: [],
            contraceptive_access: [],
            adolescent_health: [],
            sgbv_reporting: []
          };
          
          prevData.forEach(indicator => {
            if (prevIndicatorValues[indicator.indicator_type]) {
              prevIndicatorValues[indicator.indicator_type].push(indicator.value);
            }
          });
          
          // Calculate changes
          Object.entries(prevIndicatorValues).forEach(([type, values]) => {
            if (values.length > 0 && currentStats[type]) {
              const prevAvg = values.reduce((sum, val) => sum + val, 0) / values.length;
              if (prevAvg > 0) {
                const changePercent = ((currentStats[type].value - prevAvg) / prevAvg) * 100;
                
                // Format change with sign and limit to 1 decimal place
                const formattedChange = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(1) + '%';
                
                currentStats[type].change = formattedChange;
              }
            }
          });
        }
        
        setIndicatorStats(currentStats);
      } catch (err) {
        console.error('Error fetching previous year data:', err);
      }
    };
    
    fetchPreviousYearData();
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <Title>Health Indicators Dashboard</Title>
          <div className="flex space-x-4">
            <select
              value={selectedIndicator}
              onChange={(e) => setSelectedIndicator(e.target.value)}
              className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="maternal_mortality">Maternal Mortality</option>
              <option value="contraceptive_access">Contraceptive Access</option>
              <option value="adolescent_health">Adolescent Health</option>
              <option value="sgbv_reporting">SGBV Reporting</option>
              <option value="hiv_testing">HIV Testing</option>
              <option value="antenatal_care">Antenatal Care</option>
            </select>
            
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
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading health indicator data…" />
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-red-500 text-center">
              <p>{error}</p>
              <button 
                onClick={fetchHealthData}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <Flex>
                  <Heart className="h-5 w-5 text-red-500" />
                  <Text className="font-medium">Maternal Mortality</Text>
                </Flex>
                <Text className="mt-2 text-2xl font-bold text-red-600">
                  {indicatorStats.maternal_mortality.value}
                </Text>
                <Text className={`text-sm ${indicatorStats.maternal_mortality.change.startsWith('+') ? 'text-red-600' : 'text-green-600'}`}>
                  {indicatorStats.maternal_mortality.change} from previous year
                </Text>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <Flex>
                  <Activity className="h-5 w-5 text-blue-500" />
                  <Text className="font-medium">Contraceptive Access</Text>
                </Flex>
                <Text className="mt-2 text-2xl font-bold text-blue-600">
                  {indicatorStats.contraceptive_access.value}%
                </Text>
                <Text className={`text-sm ${indicatorStats.contraceptive_access.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {indicatorStats.contraceptive_access.change} from previous year
                </Text>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <Flex>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <Text className="font-medium">Adolescent Health</Text>
                </Flex>
                <Text className="mt-2 text-2xl font-bold text-green-600">
                  {indicatorStats.adolescent_health.value}
                </Text>
                <Text className={`text-sm ${indicatorStats.adolescent_health.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {indicatorStats.adolescent_health.change} from previous year
                </Text>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <Flex>
                  <Activity className="h-5 w-5 text-purple-500" />
                  <Text className="font-medium">SGBV Reporting</Text>
                </Flex>
                <Text className="mt-2 text-2xl font-bold text-purple-600">
                  {indicatorStats.sgbv_reporting.value}
                </Text>
                <Text className={`text-sm ${indicatorStats.sgbv_reporting.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {indicatorStats.sgbv_reporting.change} from previous year
                </Text>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Title>Monthly Trends: {selectedIndicator.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Title>
                {healthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={healthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey={selectedIndicator} 
                        name={selectedIndicator.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                        stroke="#9C1D20" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-64">
                    <Text>No trend data available</Text>
                  </div>
                )}
              </div>
              
              <div>
                <Title>Health Indicators vs. Case Volume</Title>
                {correlationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        dataKey="x" 
                        name={selectedIndicator.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                        unit="" 
                      />
                      <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Reproductive Health Cases" 
                        unit="" 
                      />
                      <ZAxis 
                        type="number" 
                        dataKey="z" 
                        range={[60, 400]} 
                        name="Total Cases" 
                        unit="" 
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        formatter={(value, name) => [value, name]}
                        labelFormatter={(label) => correlationData[label]?.name || ''}
                      />
                      <Scatter 
                        name="Health-Case Correlation" 
                        data={correlationData} 
                        fill="#9C1D20" 
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-64">
                    <Text>No correlation data available</Text>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-stone-50 p-6 rounded-lg">
              <Title>Health Indicator Analysis</Title>
              <Text className="mt-2">
                This dashboard shows the relationship between health indicators and legal cases across different countries.
                Higher values in maternal mortality and lower values in contraceptive access often correlate with increased
                case volumes related to reproductive rights.
              </Text>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <Text className="font-medium">Key Insights</Text>
                  <ul className="mt-2 space-y-2 text-sm text-stone-600">
                    <li>• Countries with higher maternal mortality rates show increased litigation activity</li>
                    <li>• Improved contraceptive access correlates with fewer legal challenges</li>
                    <li>• Adolescent health indicators can predict future case trends</li>
                    <li>• SGBV reporting rates show strong correlation with case outcomes</li>
                  </ul>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <Text className="font-medium">Data Sources</Text>
                  <ul className="mt-2 space-y-2 text-sm text-stone-600">
                    <li>• World Health Organization (WHO) country statistics</li>
                    <li>• United Nations Population Fund (UNFPA) reports</li>
                    <li>• National health ministries and statistical agencies</li>
                    <li>• NGO research and field reports</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default HealthIndicatorIntegration;
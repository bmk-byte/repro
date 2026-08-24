import React from 'react';
import { Card, Title, Text, Flex } from '@tremor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Building, Gavel, RefreshCw } from 'lucide-react';
import { supabase, queryWithRetry, handleSupabaseError } from '../lib/supabase';
import toast from 'react-hot-toast';

const COLORS = ['#9C1D20', '#2563EB', '#059669', '#D97706', '#7C3AED'];

interface ActorData {
  name: string;
  value: number;
}

interface CountryRegion {
  id: string;
  name: string;
  region: string;
}

const ActorsInstitutionsModule: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [selectedRegion, setSelectedRegion] = React.useState<string>('all');
  const [litigantData, setLitigantData] = React.useState<ActorData[]>([]);
  const [defendingData, setDefendingData] = React.useState<ActorData[]>([]);
  const [judicialData, setJudicialData] = React.useState<ActorData[]>([]);
  const [countries, setCountries] = React.useState<CountryRegion[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    fetchActorsData();
  }, [selectedRegion]);

  const fetchActorsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch countries and their regions with retry logic
      const countriesData = await queryWithRetry(async () => {
        const { data, error } = await supabase
          .from('countries')
          .select('id, name, region');

        if (error) throw error;
        return data;
      });

      setCountries(countriesData || []);

      // Get country IDs for the selected region
      const countryIds = selectedRegion === 'all' 
        ? countriesData?.map(c => c.id) 
        : countriesData?.filter(c => c.region === selectedRegion).map(c => c.id);

      if (!countryIds || countryIds.length === 0) {
        // Reset data if no countries match the filter
        setLitigantData([]);
        setDefendingData([]);
        setJudicialData([]);
        return;
      }

      // Fetch cases with litigants, defending institutions, and judicial bodies
      const casesData = await queryWithRetry(async () => {
        const { data, error } = await supabase
          .from('cases')
          .select(`
            litigants,
            defending_institutions,
            judicial_body_type,
            judicial_body,
            country_id
          `)
          .in('country_id', countryIds)
          .eq('moderation_status', 'approved')
          .not('litigants', 'is', null);

        if (error) throw error;
        return data;
      });

      // Process litigants data
      const litigantCounts: Record<string, number> = {};
      casesData?.forEach(caseItem => {
        if (caseItem.litigants && Array.isArray(caseItem.litigants)) {
          caseItem.litigants.forEach(litigant => {
            if (litigant && typeof litigant === 'string') {
              litigantCounts[litigant] = (litigantCounts[litigant] || 0) + 1;
            }
          });
        }
      });

      // Process defending institutions data
      const defendingCounts: Record<string, number> = {};
      casesData?.forEach(caseItem => {
        if (caseItem.defending_institutions && Array.isArray(caseItem.defending_institutions)) {
          caseItem.defending_institutions.forEach(institution => {
            if (institution && typeof institution === 'string') {
              defendingCounts[institution] = (defendingCounts[institution] || 0) + 1;
            }
          });
        }
      });

      // Process judicial bodies data
      const judicialCounts: Record<string, number> = {};
      casesData?.forEach(caseItem => {
        if (caseItem.judicial_body_type) {
          judicialCounts[caseItem.judicial_body_type] = (judicialCounts[caseItem.judicial_body_type] || 0) + 1;
        }
      });

      // Convert to array format for charts
      const litigantArray = Object.entries(litigantCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4); // Top 4 litigants

      const defendingArray = Object.entries(defendingCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4); // Top 4 defending institutions

      const judicialArray = Object.entries(judicialCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setLitigantData(litigantArray);
      setDefendingData(defendingArray);
      setJudicialData(judicialArray);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      console.error('Error fetching actors data:', errorMessage);
      setError(errorMessage);
      toast.error(`Failed to load actors data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchActorsData();
  };

  // Get unique regions from countries
  const regions = React.useMemo(() => {
    const allRegions = countries.map(c => c.region);
    return ['all', ...Array.from(new Set(allRegions))];
  }, [countries]);

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <div className="text-red-500 text-center max-w-md">
            <p className="font-semibold">Failed to load actors data</p>
            <p className="text-sm mt-1">{error}</p>
            {retryCount > 0 && (
              <p className="text-xs mt-1 text-gray-500">Retry attempt: {retryCount}</p>
            )}
          </div>
          <button 
            onClick={handleRetry}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Retrying...' : 'Retry'}</span>
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <Title>Actors & Institutions</Title>
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Regions</option>
          {regions.filter(r => r !== 'all').map(region => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <Title>Top Litigants</Title>
          {litigantData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                layout="vertical" 
                data={litigantData}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  name="Cases" 
                  fill="#9C1D20" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-64">
              <Text>No litigant data available</Text>
            </div>
          )}
        </div>
        
        <div>
          <Title>Top Defending Institutions</Title>
          {defendingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                layout="vertical" 
                data={defendingData}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  name="Cases" 
                  fill="#3B82F6" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-64">
              <Text>No defending institution data available</Text>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Title>Judicial Bodies Involved</Title>
          {judicialData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={judicialData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {judicialData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} cases`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-64">
              <Text>No judicial body data available</Text>
            </div>
          )}
        </div>
        
        <div className="md:col-span-2">
          <Title>Key Actors Analysis</Title>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <Flex>
                <Users className="h-5 w-5 text-primary" />
                <Text className="font-medium">Litigants</Text>
              </Flex>
              <div className="mt-2 space-y-2">
                {litigantData.slice(0, 2).map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Text className="text-xs truncate">{item.name}</Text>
                      <Text className="font-medium text-xs">{item.value}</Text>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ 
                          width: `${(item.value / (litigantData[0]?.value || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <Flex>
                <Building className="h-5 w-5 text-blue-500" />
                <Text className="font-medium">Institutions</Text>
              </Flex>
              <div className="mt-2 space-y-2">
                {defendingData.slice(0, 2).map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Text className="text-xs truncate">{item.name}</Text>
                      <Text className="font-medium text-xs">{item.value}</Text>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(item.value / (defendingData[0]?.value || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded-lg">
              <Flex>
                <Gavel className="h-5 w-5 text-purple-500" />
                <Text className="font-medium">Courts</Text>
              </Flex>
              <div className="mt-2 space-y-2">
                {judicialData.slice(0, 2).map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Text className="text-xs truncate">{item.name}</Text>
                      <Text className="font-medium text-xs">{item.value}</Text>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(item.value / (judicialData[0]?.value || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ActorsInstitutionsModule;
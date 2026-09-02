import React from 'react';
import { Card, Title, Text, Flex } from '@tremor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Building, Gavel, RefreshCw } from 'lucide-react';
import { supabase, queryWithRetry, handleSupabaseError } from '../lib/supabase';
import toast from 'react-hot-toast';
import { LoadingState } from './ui';

const COLORS = ['#9C1D20', '#2563EB', '#059669', '#D97706', '#7C3AED'];

interface StakeholderData {
  name: string;
  cases: number;
}

interface CountryRegion {
  id: string;
  name: string;
  region: string;
}

/**
 * Merged from the former StakeholderAnalytics + ActorsInstitutionsModule,
 * which were near-identical (same litigant/defending-institution/judicial-
 * body breakdown, same chart shapes and colors) and differed only in which
 * dimension they filtered by — case category vs. country region. This
 * version supports both filters together instead of forcing a choice
 * between two near-duplicate screens.
 */
const StakeholderAnalytics: React.FC = () => {
  const [litigantData, setLitigantData] = React.useState<StakeholderData[]>([]);
  const [defendingData, setDefendingData] = React.useState<StakeholderData[]>([]);
  const [judicialData, setJudicialData] = React.useState<StakeholderData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [categories, setCategories] = React.useState<string[]>([]);

  const [selectedRegion, setSelectedRegion] = React.useState<string>('all');
  const [countries, setCountries] = React.useState<CountryRegion[]>([]);
  const regions = React.useMemo(() => {
    const allRegions = countries.map(c => c.region).filter(Boolean);
    return Array.from(new Set(allRegions));
  }, [countries]);

  React.useEffect(() => {
    fetchCategories();
    fetchCountries();
  }, []);

  React.useEffect(() => {
    fetchStakeholderData();
  }, [selectedCategory, selectedRegion, countries]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('case_categories')
        .eq('moderation_status', 'approved')
        .not('case_categories', 'is', null);

      if (error) throw error;

      const allCategories = data?.flatMap(item => item.case_categories || []) || [];
      setCategories(Array.from(new Set(allCategories)));
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([
        'Access to Safe Abortion',
        'Maternal Health and Mortality',
        'Sexual and Gender-Based Violence (SGBV)',
        'Reproductive Healthcare',
        'Family Planning'
      ]);
    }
  };

  const fetchCountries = async () => {
    try {
      const data = await queryWithRetry(async () => {
        const { data, error } = await supabase
          .from('countries')
          .select('id, name, region');
        if (error) throw error;
        return data;
      });
      setCountries(data || []);
    } catch (err) {
      console.error('Error fetching countries:', err);
    }
  };

  const fetchStakeholderData = async () => {
    // Wait until countries have loaded at least once so the region filter
    // (if any is selected) can resolve to a real set of country IDs.
    if (selectedRegion !== 'all' && countries.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('cases')
        .select(`
          litigants,
          defending_institutions,
          judicial_body_type,
          judicial_body,
          country_id
        `)
        .eq('moderation_status', 'approved')
        .not('litigants', 'is', null);

      if (selectedCategory !== 'all') {
        query = query.contains('case_categories', [selectedCategory]);
      }

      if (selectedRegion !== 'all') {
        const countryIds = countries.filter(c => c.region === selectedRegion).map(c => c.id);
        if (countryIds.length === 0) {
          setLitigantData([]);
          setDefendingData([]);
          setJudicialData([]);
          return;
        }
        query = query.in('country_id', countryIds);
      }

      const cases = await queryWithRetry(async () => {
        const { data, error } = await query;
        if (error) throw error;
        return data;
      });

      if (!cases || cases.length === 0) {
        setLitigantData([]);
        setDefendingData([]);
        setJudicialData([]);
        return;
      }

      const litigantCounts: Record<string, number> = {};
      cases.forEach(caseItem => {
        if (caseItem.litigants && Array.isArray(caseItem.litigants)) {
          caseItem.litigants.forEach((litigant: string) => {
            if (litigant) litigantCounts[litigant] = (litigantCounts[litigant] || 0) + 1;
          });
        }
      });

      const defendingCounts: Record<string, number> = {};
      cases.forEach(caseItem => {
        if (caseItem.defending_institutions && Array.isArray(caseItem.defending_institutions)) {
          caseItem.defending_institutions.forEach((institution: string) => {
            if (institution) defendingCounts[institution] = (defendingCounts[institution] || 0) + 1;
          });
        }
      });

      const judicialCounts: Record<string, number> = {};
      cases.forEach(caseItem => {
        const judicialBody = caseItem.judicial_body || 'Unknown';
        judicialCounts[judicialBody] = (judicialCounts[judicialBody] || 0) + 1;
      });

      const toSorted = (counts: Record<string, number>, limit: number) =>
        Object.entries(counts)
          .map(([name, cases]) => ({ name, cases }))
          .sort((a, b) => b.cases - a.cases)
          .slice(0, limit);

      setLitigantData(toSorted(litigantCounts, 5));
      setDefendingData(toSorted(defendingCounts, 5));
      setJudicialData(toSorted(judicialCounts, 5));
      setRetryCount(0);
    } catch (err) {
      const errorMessage = handleSupabaseError(err);
      console.error('Error fetching stakeholder data:', errorMessage);
      setError(errorMessage);
      toast.error(`Failed to load stakeholder data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchStakeholderData();
  };

  return (
    <Card>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <Title>Stakeholder Analytics</Title>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Regions</option>
            {regions.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading stakeholder analytics…" />
      ) : error ? (
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <div className="text-danger text-center max-w-md">
            <p className="font-semibold">Failed to load stakeholder data</p>
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
      ) : (
        <>
          <div className="mb-6">
            <Title>Key Player Analysis</Title>
            {litigantData.length > 0 || defendingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[...litigantData.map(d => ({ ...d, type: 'Litigant' })), ...defendingData.map(d => ({ ...d, type: 'Defending' }))]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="cases"
                    name="Cases"
                    fill="#9C1D20"
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-64">
                <Text>No key player data available</Text>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Title>Institution Engagement</Title>
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
                      dataKey="cases"
                      name="Cases"
                      fill="#3B82F6"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>No institution data available</Text>
                </div>
              )}
            </div>

            <div>
              <Title>Court Participation Patterns</Title>
              {judicialData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={judicialData.map(item => ({ name: item.name, value: item.cases }))}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-stone-50 p-4 rounded-lg">
              <Flex>
                <Users className="h-5 w-5 text-primary" />
                <Text className="font-medium">Top Litigants</Text>
              </Flex>
              <div className="mt-2 space-y-2">
                {litigantData.slice(0, 3).map((litigant, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Text className="truncate pr-2">{litigant.name}</Text>
                      <Text className="font-medium">{litigant.cases} cases</Text>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(litigant.cases / (litigantData[0]?.cases || 1)) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-stone-50 p-4 rounded-lg">
              <Flex>
                <Building className="h-5 w-5 text-blue-500" />
                <Text className="font-medium">Top Defending Institutions</Text>
              </Flex>
              <div className="mt-2 space-y-2">
                {defendingData.slice(0, 3).map((institution, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Text className="truncate pr-2">{institution.name}</Text>
                      <Text className="font-medium">{institution.cases} cases</Text>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(institution.cases / (defendingData[0]?.cases || 1)) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-stone-50 p-4 rounded-lg">
              <Flex>
                <Gavel className="h-5 w-5 text-purple-500" />
                <Text className="font-medium">Judicial Bodies</Text>
              </Flex>
              <div className="mt-2 space-y-2">
                {judicialData.slice(0, 3).map((body, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Text className="truncate pr-2">{body.name}</Text>
                      <Text className="font-medium">{body.cases} cases</Text>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{
                          width: `${(body.cases / (judicialData[0]?.cases || 1)) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default StakeholderAnalytics;

import React from 'react';
import { Card, Title, Text, Flex } from '@tremor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Building, Gavel } from 'lucide-react';
import { supabase } from '../lib/supabase';

const COLORS = ['#9C1D20', '#2563EB', '#059669', '#D97706', '#7C3AED'];

interface StakeholderData {
  name: string;
  cases: number;
}

const StakeholderAnalytics: React.FC = () => {
  const [litigantData, setLitigantData] = React.useState<StakeholderData[]>([]);
  const [defendingData, setDefendingData] = React.useState<StakeholderData[]>([]);
  const [judicialData, setJudicialData] = React.useState<StakeholderData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [categories, setCategories] = React.useState<string[]>([]);

  React.useEffect(() => {
    fetchCategories();
  }, []);

  React.useEffect(() => {
    fetchStakeholderData();
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

  const fetchStakeholderData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch cases with stakeholder data
      let query = supabase
        .from('cases')
        .select(`
          litigants,
          defending_institutions,
          judicial_body_type,
          judicial_body
        `)
        .eq('moderation_status', 'approved')
        .not('litigants', 'is', null);

      // Apply category filter if selected
      if (selectedCategory !== 'all') {
        query = query.contains('case_categories', [selectedCategory]);
      }

      const { data: cases, error: casesError } = await query;

      if (casesError) throw casesError;

      if (!cases || cases.length === 0) {
        setLitigantData([]);
        setDefendingData([]);
        setJudicialData([]);
        setError('No stakeholder data available');
        return;
      }

      // Process litigants data
      const litigantCounts: Record<string, number> = {};
      cases.forEach(caseItem => {
        if (caseItem.litigants && Array.isArray(caseItem.litigants)) {
          caseItem.litigants.forEach(litigant => {
            litigantCounts[litigant] = (litigantCounts[litigant] || 0) + 1;
          });
        }
      });

      // Process defending institutions data
      const defendingCounts: Record<string, number> = {};
      cases.forEach(caseItem => {
        if (caseItem.defending_institutions && Array.isArray(caseItem.defending_institutions)) {
          caseItem.defending_institutions.forEach(institution => {
            defendingCounts[institution] = (defendingCounts[institution] || 0) + 1;
          });
        }
      });

      // Process judicial bodies data
      const judicialCounts: Record<string, number> = {};
      cases.forEach(caseItem => {
        const judicialBody = caseItem.judicial_body || 'Unknown';
        judicialCounts[judicialBody] = (judicialCounts[judicialBody] || 0) + 1;
      });

      // Convert to array format for charts
      const litigantArray = Object.entries(litigantCounts)
        .map(([name, cases]) => ({ name, cases }))
        .sort((a, b) => b.cases - a.cases)
        .slice(0, 5); // Top 5 litigants

      const defendingArray = Object.entries(defendingCounts)
        .map(([name, cases]) => ({ name, cases }))
        .sort((a, b) => b.cases - a.cases)
        .slice(0, 5); // Top 5 defending institutions

      const judicialArray = Object.entries(judicialCounts)
        .map(([name, cases]) => ({ name, cases }))
        .sort((a, b) => b.cases - a.cases)
        .slice(0, 5); // Top 5 judicial bodies

      setLitigantData(litigantArray);
      setDefendingData(defendingArray);
      setJudicialData(judicialArray);
    } catch (err) {
      console.error('Error fetching stakeholder data:', err);
      setError('Failed to load stakeholder data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <Title>Stakeholder Analytics</Title>
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
            <Title>Key Player Analysis</Title>
            {litigantData.length > 0 || defendingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[...litigantData.map(d => ({...d, type: 'Litigant'})), ...defendingData.map(d => ({...d, type: 'Defending'}))]}>
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
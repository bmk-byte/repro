import React from 'react';
import { Card, Title, Text, Flex, ProgressBar } from '@tremor/react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Scale, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { LoadingState, ErrorState, Button } from './ui';
import { CHART_COLORS, CHART_CATEGORICAL_PALETTE } from '../lib/chartColors';
import { chartHeight } from '../lib/chartLayout';

const FRAMEWORK_COLORS = [CHART_COLORS.warning, CHART_COLORS.info, CHART_CATEGORICAL_PALETTE[4]];

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
  const { t } = useTranslation('analytics');
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
        setError(t('legalFrameworkAnalysis.noData'));
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
      setError(t('legalFrameworkAnalysis.loadError'));
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
      domesticOnly: 0,
      internationalOnly: 0,
      bothUsed: 0
    };

    cases.forEach(caseItem => {
      const frameworkType = caseItem.legal_framework_type?.toLowerCase() || 'unknown';
      if (frameworkType === 'domestic law') {
        frameworkCounts.domesticOnly++;
      } else if (frameworkType === 'international law') {
        frameworkCounts.internationalOnly++;
      } else if (frameworkType === 'both') {
        frameworkCounts.bothUsed++;
      }
    });

    // Convert to array format for charts
    return [
      { name: t('legalFrameworkAnalysis.frameworkDistribution.domesticOnly'), value: frameworkCounts.domesticOnly },
      { name: t('legalFrameworkAnalysis.frameworkDistribution.internationalOnly'), value: frameworkCounts.internationalOnly },
      { name: t('legalFrameworkAnalysis.frameworkDistribution.bothUsed'), value: frameworkCounts.bothUsed }
    ];
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <Title>{t('legalFrameworkAnalysis.title')}</Title>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">{t('legalFrameworkAnalysis.allCategories')}</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState label={t('legalFrameworkAnalysis.loading')} />
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <ErrorState description={error} action={<Button onClick={fetchLegalFrameworkData}>{t('legalFrameworkAnalysis.retry')}</Button>} />
        </div>
      ) : (
        <>
          <div className="mb-6">
            <Title>{t('legalFrameworkAnalysis.instrumentsUsed.title')}</Title>
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
                    name={t('legalFrameworkAnalysis.legend.domestic')}
                    fill={FRAMEWORK_COLORS[0]}
                    fillOpacity={0.5}
                    stroke={FRAMEWORK_COLORS[0]}
                  />
                  <Area
                    type="monotone"
                    dataKey="international"
                    stackId="1"
                    name={t('legalFrameworkAnalysis.legend.international')}
                    fill={FRAMEWORK_COLORS[1]}
                    fillOpacity={0.5}
                    stroke={FRAMEWORK_COLORS[1]}
                  />
                  <Area
                    type="monotone"
                    dataKey="both"
                    stackId="1"
                    name={t('legalFrameworkAnalysis.legend.both')}
                    fill={FRAMEWORK_COLORS[2]}
                    fillOpacity={0.5}
                    stroke={FRAMEWORK_COLORS[2]}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-64">
                <Text>{t('legalFrameworkAnalysis.instrumentsUsed.noData')}</Text>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Title>{t('legalFrameworkAnalysis.protocolCitation.title')}</Title>
              {protocolData.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartHeight(protocolData.length, 300)}>
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
                      name={t('legalFrameworkAnalysis.protocolCitation.seriesName')}
                      fill={CHART_CATEGORICAL_PALETTE[4]}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>{t('legalFrameworkAnalysis.protocolCitation.noData')}</Text>
                </div>
              )}
            </div>

            <div>
              <Title>{t('legalFrameworkAnalysis.frameworkDistribution.title')}</Title>
              {frameworkDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={frameworkDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill={FRAMEWORK_COLORS[0]} />
                      <Cell fill={FRAMEWORK_COLORS[1]} />
                      <Cell fill={FRAMEWORK_COLORS[2]} />
                    </Pie>
                    <Tooltip formatter={(value) => [t('legalFrameworkAnalysis.tooltip.cases', { count: value }), t('legalFrameworkAnalysis.tooltip.count')]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>{t('legalFrameworkAnalysis.frameworkDistribution.noData')}</Text>
                </div>
              )}
            </div>
          </div>

          {(() => {
            const domesticTotal = timeData.reduce((sum, item) => sum + item.domestic, 0);
            const internationalTotal = timeData.reduce((sum, item) => sum + item.international, 0);
            const bothTotal = timeData.reduce((sum, item) => sum + item.both, 0);
            const totalFrameworkCases = domesticTotal + internationalTotal + bothTotal;
            const domesticPercent = totalFrameworkCases > 0 ? (domesticTotal / totalFrameworkCases) * 100 : 0;
            const internationalPercent = totalFrameworkCases > 0 ? (internationalTotal / totalFrameworkCases) * 100 : 0;
            const bothPercent = totalFrameworkCases > 0 ? (bothTotal / totalFrameworkCases) * 100 : 0;

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-stone-50 p-4 rounded-lg">
                  <Flex>
                    <FileText className="h-5 w-5 text-amber-500" />
                    <Text className="font-medium">{t('legalFrameworkAnalysis.summary.domestic.title')}</Text>
                  </Flex>
                  <div className="mt-2 space-y-2">
                    {timeData.length > 0 ? (
                      <>
                        <div className="flex justify-between items-center">
                          <Text>{t('legalFrameworkAnalysis.summary.domestic.totalLabel')}</Text>
                          <Text className="font-medium">{domesticTotal}</Text>
                        </div>
                        <ProgressBar value={domesticPercent} color="amber" />
                      </>
                    ) : (
                      <Text>{t('legalFrameworkAnalysis.summary.domestic.noData')}</Text>
                    )}
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-lg">
                  <Flex>
                    <Scale className="h-5 w-5 text-blue-500" />
                    <Text className="font-medium">{t('legalFrameworkAnalysis.summary.international.title')}</Text>
                  </Flex>
                  <div className="mt-2 space-y-2">
                    {timeData.length > 0 ? (
                      <>
                        <div className="flex justify-between items-center">
                          <Text>{t('legalFrameworkAnalysis.summary.international.totalLabel')}</Text>
                          <Text className="font-medium">{internationalTotal}</Text>
                        </div>
                        <ProgressBar value={internationalPercent} color="blue" />
                      </>
                    ) : (
                      <Text>{t('legalFrameworkAnalysis.summary.international.noData')}</Text>
                    )}
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-lg">
                  <Flex>
                    <BookOpen className="h-5 w-5 text-purple-500" />
                    <Text className="font-medium">{t('legalFrameworkAnalysis.summary.combined.title')}</Text>
                  </Flex>
                  <div className="mt-2 space-y-2">
                    {timeData.length > 0 ? (
                      <>
                        <div className="flex justify-between items-center">
                          <Text>{t('legalFrameworkAnalysis.summary.combined.totalLabel')}</Text>
                          <Text className="font-medium">{bothTotal}</Text>
                        </div>
                        <ProgressBar value={bothPercent} color="violet" />
                      </>
                    ) : (
                      <Text>{t('legalFrameworkAnalysis.summary.combined.noData')}</Text>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </Card>
  );
};

export default LegalFrameworkAnalysis;

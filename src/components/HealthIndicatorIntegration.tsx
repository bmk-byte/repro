import React from 'react';
import { Card, Title, Text, Flex } from '@tremor/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Activity, TrendingUp, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '../lib/toast';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { LoadingState, ErrorState, Button } from './ui';
import { CHART_COLORS } from '../lib/chartColors';

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
  const { t } = useTranslation('analytics');
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

  const indicatorLabels: Record<string, string> = {
    maternal_mortality: t('healthIndicators.indicators.maternalMortality'),
    contraceptive_access: t('healthIndicators.indicators.contraceptiveAccess'),
    adolescent_health: t('healthIndicators.indicators.adolescentHealth'),
    sgbv_reporting: t('healthIndicators.indicators.sgbvReporting'),
    hiv_testing: t('healthIndicators.indicators.hivTesting'),
    antenatal_care: t('healthIndicators.indicators.antenatalCare'),
  };
  const selectedIndicatorLabel = indicatorLabels[selectedIndicator] || selectedIndicator;

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
        setError(t('healthIndicators.noCountries'));
        return;
      }

      setCountries(data);
    } catch (err) {
      console.error('Error fetching countries:', err);
      setError(t('healthIndicators.loadCountriesError'));
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
        setError(t('healthIndicators.noDataFilters'));
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
      toast.error(t('healthIndicators.loadDataErrorToast', { error: errorMessage }));
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
      const countryName = indicator.countries?.name || t('healthIndicators.unknownCountry');
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
        const countryName = countryNames[countryId] || t('healthIndicators.unknownCountry');
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
          <Title>{t('healthIndicators.title')}</Title>
          <div className="flex space-x-4">
            <select
              value={selectedIndicator}
              onChange={(e) => setSelectedIndicator(e.target.value)}
              className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="maternal_mortality">{t('healthIndicators.indicators.maternalMortality')}</option>
              <option value="contraceptive_access">{t('healthIndicators.indicators.contraceptiveAccess')}</option>
              <option value="adolescent_health">{t('healthIndicators.indicators.adolescentHealth')}</option>
              <option value="sgbv_reporting">{t('healthIndicators.indicators.sgbvReporting')}</option>
              <option value="hiv_testing">{t('healthIndicators.indicators.hivTesting')}</option>
              <option value="antenatal_care">{t('healthIndicators.indicators.antenatalCare')}</option>
            </select>

            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">{t('healthIndicators.allCountries')}</option>
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
          <LoadingState label={t('healthIndicators.loading')} />
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <ErrorState description={error} action={<Button onClick={fetchHealthData}>{t('healthIndicators.retry')}</Button>} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-danger-light p-4 rounded-lg border border-danger/20">
                <Flex>
                  <Heart className="h-5 w-5 text-danger" />
                  <Text className="font-medium">{t('healthIndicators.indicators.maternalMortality')}</Text>
                </Flex>
                <Text className="mt-2 text-2xl font-bold text-danger-dark">
                  {indicatorStats.maternal_mortality.value}
                </Text>
                <Text className={`text-sm ${indicatorStats.maternal_mortality.change.startsWith('+') ? 'text-danger' : 'text-success'}`}>
                  {t('healthIndicators.changeFromPreviousYear', { change: indicatorStats.maternal_mortality.change })}
                </Text>
              </div>

              <div className="bg-info-light p-4 rounded-lg border border-info/20">
                <Flex>
                  <Activity className="h-5 w-5 text-info" />
                  <Text className="font-medium">{t('healthIndicators.indicators.contraceptiveAccess')}</Text>
                </Flex>
                <Text className="mt-2 text-2xl font-bold text-info-dark">
                  {indicatorStats.contraceptive_access.value}%
                </Text>
                <Text className={`text-sm ${indicatorStats.contraceptive_access.change.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                  {t('healthIndicators.changeFromPreviousYear', { change: indicatorStats.contraceptive_access.change })}
                </Text>
              </div>

              <div className="bg-success-light p-4 rounded-lg border border-success/20">
                <Flex>
                  <TrendingUp className="h-5 w-5 text-success" />
                  <Text className="font-medium">{t('healthIndicators.indicators.adolescentHealth')}</Text>
                </Flex>
                <Text className="mt-2 text-2xl font-bold text-success-dark">
                  {indicatorStats.adolescent_health.value}
                </Text>
                <Text className={`text-sm ${indicatorStats.adolescent_health.change.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                  {t('healthIndicators.changeFromPreviousYear', { change: indicatorStats.adolescent_health.change })}
                </Text>
              </div>

              <div className="bg-stone-100 p-4 rounded-lg border border-stone-200">
                <Flex>
                  <Activity className="h-5 w-5 text-stone-700" />
                  <Text className="font-medium">{t('healthIndicators.indicators.sgbvReporting')}</Text>
                </Flex>
                <Text className="mt-2 text-2xl font-bold text-stone-700">
                  {indicatorStats.sgbv_reporting.value}
                </Text>
                <Text className={`text-sm ${indicatorStats.sgbv_reporting.change.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                  {t('healthIndicators.changeFromPreviousYear', { change: indicatorStats.sgbv_reporting.change })}
                </Text>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Title>{t('healthIndicators.monthlyTrends.title', { indicator: selectedIndicatorLabel })}</Title>
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
                        name={selectedIndicatorLabel}
                        stroke={CHART_COLORS.primary}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-64">
                    <Text>{t('healthIndicators.monthlyTrends.noData')}</Text>
                  </div>
                )}
              </div>

              <div>
                <Title>{t('healthIndicators.correlation.title')}</Title>
                {correlationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={selectedIndicatorLabel}
                        unit=""
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name={t('healthIndicators.correlation.yAxis')}
                        unit=""
                      />
                      <ZAxis
                        type="number"
                        dataKey="z"
                        range={[60, 400]}
                        name={t('healthIndicators.correlation.zAxis')}
                        unit=""
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value, name) => [value, name]}
                        labelFormatter={(label) => correlationData[label]?.name || ''}
                      />
                      <Scatter
                        name={t('healthIndicators.correlation.seriesName')}
                        data={correlationData}
                        fill={CHART_COLORS.primary}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-64">
                    <Text>{t('healthIndicators.correlation.noData')}</Text>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-stone-50 p-6 rounded-lg">
              <Title>{t('healthIndicators.analysis.title')}</Title>
              <Text className="mt-2">
                {t('healthIndicators.analysis.description')}
              </Text>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <Text className="font-medium">{t('healthIndicators.analysis.keyInsightsTitle')}</Text>
                  <ul className="mt-2 space-y-2 text-sm text-stone-600">
                    <li>• {t('healthIndicators.analysis.insights.item1')}</li>
                    <li>• {t('healthIndicators.analysis.insights.item2')}</li>
                    <li>• {t('healthIndicators.analysis.insights.item3')}</li>
                    <li>• {t('healthIndicators.analysis.insights.item4')}</li>
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <Text className="font-medium">{t('healthIndicators.analysis.dataSourcesTitle')}</Text>
                  <ul className="mt-2 space-y-2 text-sm text-stone-600">
                    <li>• {t('healthIndicators.analysis.sources.item1')}</li>
                    <li>• {t('healthIndicators.analysis.sources.item2')}</li>
                    <li>• {t('healthIndicators.analysis.sources.item3')}</li>
                    <li>• {t('healthIndicators.analysis.sources.item4')}</li>
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

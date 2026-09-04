import React from 'react';
import { Card, Title, Text, Flex } from '@tremor/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MapPin, Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { GlobeLive, LiveMarker } from './ui/cobe-globe-live';
import { getCountryCoordinates } from '../lib/countryCoordinates';
import { LoadingState, ErrorState, Button } from './ui';
import { CHART_COLORS } from '../lib/chartColors';

interface CountryData {
  name: string;
  total: number;
  success: number;
}

interface Country {
  id: string;
  name: string;
  region: string;
}

interface GeographicIntelligenceProps {
  connectionError?: string | null;
  setConnectionError?: (error: string | null) => void;
}

const GeographicIntelligence: React.FC<GeographicIntelligenceProps> = ({
  connectionError,
  setConnectionError
}) => {
  const { t } = useTranslation('analytics');
  const [countryData, setCountryData] = React.useState<CountryData[]>([]);
  const [allCountries, setAllCountries] = React.useState<Country[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = React.useState<string>('all');
  const [regions, setRegions] = React.useState<string[]>(['all']);

  // Fetch all countries and regions once on component mount
  React.useEffect(() => {
    if (!connectionError) {
      fetchCountriesAndRegions();
    }
  }, [connectionError]);

  // Fetch case data when region selection changes
  React.useEffect(() => {
    if (!connectionError && allCountries.length > 0) {
      fetchCountryData();
    }
  }, [selectedRegion, allCountries, connectionError]);

  const fetchCountriesAndRegions = async () => {
    try {
      setError(null);
      const { data: countries, error: countriesError } = await supabase
        .from('countries')
        .select('id, name, region')
        .order('name');

      if (countriesError) {
        const errorMsg = handleSupabaseError(countriesError);
        throw new Error(errorMsg);
      }

      if (countries) {
        setAllCountries(countries);
        const uniqueRegions = Array.from(new Set(countries.map(item => item.region))).filter(Boolean);
        setRegions(['all', ...uniqueRegions]);
      }
    } catch (err) {
      const errorMsg = handleSupabaseError(err);
      setConnectionError?.(errorMsg);
      setError(errorMsg);
      console.error('Error fetching countries and regions:', errorMsg);
    }
  };

  const fetchCountryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Filter countries based on selected region
      const filteredCountries = selectedRegion === 'all'
        ? allCountries
        : allCountries.filter(country => country.region === selectedRegion);

      if (filteredCountries.length === 0) {
        setCountryData([]);
        setLoading(false);
        return;
      }

      const countryIds = filteredCountries.map(country => country.id);

      const { data: caseCounts, error: casesError } = await supabase
        .from('cases')
        .select(`
          country_id,
          status,
          client_satisfaction
        `)
        .in('country_id', countryIds)
        .eq('moderation_status', 'approved');

      if (casesError) {
        const errorMsg = handleSupabaseError(casesError);
        throw new Error(errorMsg);
      }

      const countryStats = filteredCountries.map(country => {
        const countryCases = caseCounts?.filter(c => c.country_id === country.id) || [];
        const totalCount = countryCases.length;

        const completedCases = countryCases.filter(c =>
          c.status === 'completed' && c.client_satisfaction !== null
        );

        let successRate = 0;
        if (completedCases.length > 0) {
          const avgSatisfaction = completedCases.reduce((sum, c) => sum + (c.client_satisfaction || 0), 0) / completedCases.length;
          successRate = Math.round((avgSatisfaction / 5) * 100);
        }

        return {
          name: country.name,
          total: totalCount,
          success: successRate
        };
      });

      const filteredData = countryStats
        .filter(country => country.total > 0)
        .sort((a, b) => b.total - a.total);

      setCountryData(filteredData);
    } catch (err) {
      const errorMsg = handleSupabaseError(err);
      setConnectionError?.(errorMsg);
      setError(errorMsg);
      console.error('Error fetching country data:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const retryConnection = async () => {
    setLoading(true);
    setError(null);
    setConnectionError?.(null);
    await fetchCountriesAndRegions();
  };

  if (connectionError) {
    return (
      <Card>
        <div className="flex justify-between items-center mb-6">
          <Title>{t('geographicIntelligence.title')}</Title>
        </div>
        <div className="flex justify-center items-center h-64">
          <ErrorState
            title={t('geographicIntelligence.connectionErrorTitle')}
            description={connectionError}
            action={
              <Button onClick={retryConnection} loading={loading}>
                {t('geographicIntelligence.retryConnection')}
              </Button>
            }
          />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <Title>{t('geographicIntelligence.title')}</Title>
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {regions.map(region => (
            <option key={region} value={region}>
              {region === 'all' ? t('geographicIntelligence.allRegions') : region}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState label={t('geographicIntelligence.loading')} />
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <ErrorState
            description={error}
            action={
              <Button onClick={retryConnection} loading={loading}>
                {t('geographicIntelligence.retry')}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-6">
            <div className="w-full max-w-2xl">
              <GlobeLive
                markers={countryData
                  .map((country): LiveMarker | null => {
                    const coords = getCountryCoordinates(country.name);
                    if (!coords) return null;
                    return {
                      id: country.name.toLowerCase().replace(/\s+/g, '-'),
                      location: coords,
                      country: country.name,
                      caseCount: country.total
                    };
                  })
                  .filter((marker): marker is LiveMarker => marker !== null)
                }
                speed={0.003}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <Title>{t('geographicIntelligence.caseVolumeByCountry')}</Title>
              {countryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countryData.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" name={t('geographicIntelligence.totalCasesSeries')} fill={CHART_COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>{t('geographicIntelligence.noCountryData')}</Text>
                </div>
              )}
            </div>

            <div>
              <Title>{t('geographicIntelligence.successRateByCountry')}</Title>
              {countryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countryData.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="success" name={t('geographicIntelligence.successRateSeries')} fill={CHART_COLORS.success} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <Text>{t('geographicIntelligence.noSuccessRateData')}</Text>
                </div>
              )}
            </div>
          </div>

          {countryData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-stone-50 p-4 rounded-lg">
                <Flex>
                  <MapPin className="h-5 w-5 text-primary" />
                  <Text className="font-medium">{t('geographicIntelligence.topCaseCountries')}</Text>
                </Flex>
                <div className="mt-2 space-y-2">
                  {countryData.slice(0, 3).map((country, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Text>{country.name}</Text>
                        <Text className="font-medium">{t('geographicIntelligence.casesCount', { count: country.total })}</Text>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(country.total / (countryData[0]?.total || 1)) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-stone-50 p-4 rounded-lg">
                <Flex>
                  <Map className="h-5 w-5 text-blue-500" />
                  <Text className="font-medium">{t('geographicIntelligence.regionalDistribution')}</Text>
                </Flex>
                <div className="mt-2 space-y-2">
                  {regions.filter(r => r !== 'all').map((region, index) => {
                    const regionCount = countryData
                      .filter(country => {
                        const countryObj = allCountries.find(c => c.name === country.name);
                        return countryObj && countryObj.region === region;
                      })
                      .reduce((sum, country) => sum + country.total, 0);

                    const totalCases = countryData.reduce((sum, country) => sum + country.total, 0);
                    const percentage = totalCases > 0 ? (regionCount / totalCases) * 100 : 0;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <Text>{region}</Text>
                          <Text className="font-medium">{t('geographicIntelligence.casesCount', { count: regionCount })}</Text>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default GeographicIntelligence;

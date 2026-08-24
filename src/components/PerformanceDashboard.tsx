import React, { useState, useEffect } from 'react';
import { Card, Title, Tab, TabList, TabGroup, TabPanel, TabPanels } from '@tremor/react';
import { RefreshCw } from 'lucide-react';
import { supabase, testConnection, handleSupabaseError, queryWithRetry } from '../lib/supabase';
import toast from 'react-hot-toast';
import TimelineVisualization from './TimelineVisualization';
import GeographicIntelligence from './GeographicIntelligence';
import OutcomeMetricsDashboard from './OutcomeMetricsDashboard';
import LegalFrameworkAnalysis from './LegalFrameworkAnalysis';
import StakeholderAnalytics from './StakeholderAnalytics';
import HealthIndicatorIntegration from './HealthIndicatorIntegration';
import ReportGenerationSystem from './ReportGenerationSystem';
import PerformanceTrackingModule from './PerformanceTrackingModule';
import ActorsInstitutionsModule from './ActorsInstitutionsModule';

interface PerformanceDashboardProps {
  isModerator: boolean;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ isModerator }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [filters, setFilters] = useState({
    timeRange: 'all',
    country: 'all',
    category: 'all',
    status: 'all',
    judicialBody: 'all'
  });
  const [countries, setCountries] = useState<{id: string, name: string}[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [judicialBodies, setJudicialBodies] = useState<string[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionError(null);
      
      // Test Supabase connection first
      const { success, error: connError } = await testConnection();
      if (!success) {
        const errorMsg = handleSupabaseError(connError);
        setConnectionError(errorMsg);
        throw new Error(errorMsg);
      }

      // Fetch countries with enhanced error handling and retry logic
      const countriesData = await queryWithRetry(async () => {
        const { data, error } = await supabase
          .from('countries')
          .select('id, name')
          .order('name');
        
        if (error) throw error;
        return data;
      });
      
      setCountries(countriesData || []);

      // Fetch case categories with enhanced error handling
      try {
        const casesData = await queryWithRetry(async () => {
          const { data, error } = await supabase
            .from('cases')
            .select('case_categories')
            .not('case_categories', 'is', null)
            .eq('moderation_status', 'approved');
          
          if (error) throw error;
          return data;
        });
        
        const allCategories = casesData?.flatMap(c => c.case_categories || []) || [];
        const uniqueCategories = [...new Set(allCategories)];
        setCategories(uniqueCategories);
      } catch (err) {
        console.warn('Could not fetch case categories:', handleSupabaseError(err));
        // Set default categories as fallback
        setCategories([
          'Access to Safe Abortion',
          'Maternal Health and Mortality',
          'Forced Sterilization',
          'Sexual and Gender-Based Violence (SGBV)',
          'Child Marriage'
        ]);
      }

      // Fetch judicial bodies with enhanced error handling
      try {
        const bodiesData = await queryWithRetry(async () => {
          const { data, error } = await supabase
            .from('cases')
            .select('judicial_body')
            .not('judicial_body', 'is', null)
            .eq('moderation_status', 'approved');
          
          if (error) throw error;
          return data;
        });
        
        const allBodies = bodiesData?.map(c => c.judicial_body).filter(Boolean) || [];
        const uniqueBodies = [...new Set(allBodies)];
        setJudicialBodies(uniqueBodies);
      } catch (err) {
        console.warn('Could not fetch judicial bodies:', handleSupabaseError(err));
        // Set default judicial bodies as fallback
        setJudicialBodies([
          'Constitutional Court',
          'High Court',
          'Court of Appeal',
          'Regional Court'
        ]);
      }

      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      const errorMessage = handleSupabaseError(error);
      console.error('Error fetching filter options:', errorMessage);
      setError(`Failed to load filter options: ${errorMessage}`);
      toast.error(`Failed to load filter options: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const retryConnection = async () => {
    setRetryCount(prev => prev + 1);
    await fetchFilterOptions();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error || connectionError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <span className="block sm:inline font-semibold">Connection Error:</span>
              <span className="block sm:inline ml-1">{connectionError || error}</span>
              {retryCount > 0 && (
                <p className="text-sm mt-1">Retry attempt: {retryCount}</p>
              )}
            </div>
            <button
              onClick={retryConnection}
              disabled={loading}
              className="flex items-center space-x-2 bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Retrying...' : 'Retry Connection'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <TabGroup>
          <div className="flex justify-between items-center mb-6">
            <Title>Advanced Performance Analytics</Title>
            <TabList variant="solid">
              <Tab value="timeline">Timeline</Tab>
              <Tab value="geographic">Geographic</Tab>
              <Tab value="outcomes">Outcomes</Tab>
              <Tab value="legal">Legal Framework</Tab>
              <Tab value="stakeholders">Stakeholders</Tab>
              <Tab value="health">Health</Tab>
              <Tab value="reports">Reports</Tab>
              <Tab value="performance">Performance</Tab>
              <Tab value="actors">Actors</Tab>
            </TabList>
          </div>

          <TabPanels>
            <TabPanel value="timeline">
              <TimelineVisualization />
            </TabPanel>

            <TabPanel value="geographic">
              <GeographicIntelligence 
                connectionError={connectionError} 
                setConnectionError={setConnectionError}
              />
            </TabPanel>

            <TabPanel value="outcomes">
              <OutcomeMetricsDashboard />
            </TabPanel>

            <TabPanel value="legal">
              <LegalFrameworkAnalysis />
            </TabPanel>

            <TabPanel value="stakeholders">
              <StakeholderAnalytics />
            </TabPanel>

            <TabPanel value="health">
              <HealthIndicatorIntegration 
                connectionError={connectionError}
                setConnectionError={setConnectionError}
              />
            </TabPanel>

            {isModerator && (
              <TabPanel value="reports">
                <ReportGenerationSystem />
              </TabPanel>
            )}

            <TabPanel value="performance">
              <PerformanceTrackingModule />
            </TabPanel>

            <TabPanel value="actors">
              <ActorsInstitutionsModule />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </Card>
    </div>
  );
};

export default PerformanceDashboard;
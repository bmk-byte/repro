import React, { useState, useEffect } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { ChartCard, RankedBarChart } from './charts';
import { supabase } from '../lib/supabase';
import { RefreshCw, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '../lib/toast';
import CaseStageProgress from './CaseStageProgress';
import { LoadingState, Badge, Select, Button, EmptyState, ErrorState } from './ui';
import type { BadgeProps } from './ui';
import DashboardCard from './DashboardCard';

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

interface RapidResponseDashboardProps {
  onViewAllCases?: () => void;
  onCreateCase?: () => void;
  onCaseClick?: (caseId: string) => void;
}

const RapidResponseDashboard: React.FC<RapidResponseDashboardProps> = ({
  onViewAllCases,
  onCreateCase,
  onCaseClick
}) => {
  const { t } = useTranslation('rapidResponse');
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priority: 'all',
    stage: 'all',
    category: 'all',
    partner: 'all',
    country: 'all',
    status: 'all'
  });
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    priorities: ['Urgent', 'High', 'Medium', 'Low'],
    stages: ['intake', 'review', 'action', 'resolution'],
    categories: [] as string[],
    partners: [] as string[],
    countries: [] as { id: string; name: string }[],
    statuses: ['pending', 'in_progress', 'completed', 'on_hold']
  });

  const [stats, setStats] = useState({
    totalCases: 0,
    activeCases: 0,
    completedCases: 0,
    averageResolutionTime: 0,
    priorityDistribution: [] as { name: string; value: number }[],
    stageDistribution: [] as { name: string; value: number }[],
    categoryDistribution: [] as { name: string; value: number }[],
    partnerDistribution: [] as { name: string; value: number }[],
    recentActivity: [] as any[],
    processedStagesForProgress: [] as {
      stage_name: string;
      status: 'Pending' | 'In Progress' | 'Completed';
      count: number;
    }[]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [recentCases, setRecentCases] = useState<any[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    devLog('RapidResponseDashboard: Fetching dashboard data...');
    fetchDashboardData();
  }, [timeRange, filters]);

  // Set up real-time subscriptions
  useEffect(() => {
    devLog('Setting up real-time subscriptions for rapid response dashboard');
    
    // Subscribe to changes in rapid response cases
    const casesSubscription = supabase
      .channel('rapid-response-cases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
          filter: 'case_type=eq.rapid-response'
        },
        (payload) => {
          devLog('Rapid response case changed:', payload);
          fetchDashboardData();
          
          if (payload.eventType === 'INSERT') {
            toast.success(t('dashboard.toasts.newCaseAdded'));
          } else if (payload.eventType === 'UPDATE') {
            toast.success(t('dashboard.toasts.caseUpdated'));
          }
        }
      )
      .subscribe();

    // Subscribe to changes in case stages
    const stagesSubscription = supabase
      .channel('case-stages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_stages'
        },
        (payload) => {
          devLog('Case stage changed:', payload);
          fetchDashboardData();
        }
      )
      .subscribe();

    // Clean up subscriptions when component unmounts
    return () => {
      devLog('Cleaning up rapid response dashboard subscriptions');
      supabase.removeChannel(casesSubscription);
      supabase.removeChannel(stagesSubscription);
    };
  }, []);

  const fetchFilterOptions = async () => {
    try {
      devLog('Fetching filter options for rapid response dashboard');
      
      // Fetch countries
      const { data: countriesData, error: countriesError } = await supabase
        .from('countries')
        .select('id, name')
        .order('name');
      
      if (countriesError) throw countriesError;
      
      // Fetch unique categories from rapid response cases
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('cases')
        .select('case_categories')
        .eq('case_type', 'rapid-response')
        .eq('moderation_status', 'approved')
        .not('case_categories', 'is', null);
      
      if (categoriesError) throw categoriesError;
      
      // Flatten and get unique categories
      const allCategories = categoriesData?.flatMap(item => item.case_categories || []) || [];
      const uniqueCategories = Array.from(new Set(allCategories));
      
      // Fetch unique partner organizations
      const { data: partnersData, error: partnersError } = await supabase
        .from('cases')
        .select('partner')
        .eq('case_type', 'rapid-response')
        .eq('moderation_status', 'approved')
        .not('partner', 'is', null);
      
      if (partnersError) throw partnersError;
      
      const uniquePartners = Array.from(new Set(partnersData?.map(item => item.partner).filter(Boolean) || []));
      
      setFilterOptions(prev => ({
        ...prev,
        categories: uniqueCategories,
        partners: uniquePartners,
        countries: countriesData || []
      }));
      
    } catch (error) {
      console.error('Error fetching filter options:', error);
      // Set fallback options
      setFilterOptions(prev => ({
        ...prev,
        categories: ['Abortion', 'Rape', 'Defilement', 'SGBV', 'Incest'],
        partners: ['Afya Na Haki', 'LIRA Programme'],
        countries: []
      }));
    }
  };

  const fetchDashboardData = async () => {
    try {
      devLog('Fetching dashboard data...');
      setLoading(true);
      setError(null);

      // Get date range based on selected time range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      devLog('Date range:', { startDate, endDate });

      // Fetch rapid response cases
      let casesQuery = supabase
        .from('cases')
        .select(`
          id,
          case_filed,
          case_summary,
          status,
          created_at,
          case_type,
          priority_level,
          rapid_response_stage,
          case_categories,
          partner,
          country_id,
          profiles:user_id (full_name, organization),
          countries (name)
        `)
        .eq('case_type', 'rapid-response')
        .eq('moderation_status', 'approved');

      // Apply filters
      if (filters.priority !== 'all') {
        casesQuery = casesQuery.eq('priority_level', filters.priority);
      }
      
      if (filters.stage !== 'all') {
        casesQuery = casesQuery.eq('rapid_response_stage', filters.stage);
      }
      
      if (filters.category !== 'all') {
        casesQuery = casesQuery.contains('case_categories', [filters.category]);
      }
      
      if (filters.partner !== 'all') {
        casesQuery = casesQuery.eq('partner', filters.partner);
      }
      
      if (filters.country !== 'all') {
        casesQuery = casesQuery.eq('country_id', filters.country);
      }
      
      if (filters.status !== 'all') {
        casesQuery = casesQuery.eq('status', filters.status);
      }

      casesQuery = casesQuery.order('created_at', { ascending: false });

      const { data: casesData, error: casesError } = await casesQuery;

      devLog('Cases query result:', casesData);
      devLog('Cases query error:', casesError);

      if (casesError) throw casesError;

      // Set recent cases for display
      setRecentCases(casesData?.slice(0, 3) || []);

      // Filter cases by date range
      const filteredCases = casesData?.filter(c => {
        const caseDate = new Date(c.created_at);
        return caseDate >= startDate && caseDate <= endDate;
      }) || [];

      // Fetch case stages for all rapid response cases
      let stagesQuery = supabase
        .from('case_stages')
        .select(`
          id,
          case_id,
          stage_group,
          stage_name,
          status,
          timestamp
        `);
      
      // Only fetch stages for cases that match our filters
      if (casesData && casesData.length > 0) {
        stagesQuery = stagesQuery.in('case_id', casesData.map(c => c.id));
      } else {
        // If no cases match filters, don't fetch stages
        setStats(prev => ({ ...prev, processedStagesForProgress: [] }));
      }

      const { data: stagesData, error: stagesError } = await stagesQuery;

      devLog('Stages query result:', stagesData?.length);
      devLog('Stages query error:', stagesError);

      if (stagesError) throw stagesError;

      // Calculate dashboard stats
      const totalCases = filteredCases.length;
      const activeCases = filteredCases.filter(c => c.status === 'in_progress' || c.status === 'pending').length;
      const completedCases = filteredCases.filter(c => c.status === 'completed').length;

      // Calculate average resolution time (in days) for completed cases
      let totalResolutionTime = 0;
      let completedCasesWithTime = 0;

      filteredCases.forEach(caseItem => {
        if (caseItem.status === 'completed') {
          const createdDate = new Date(caseItem.created_at);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - createdDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          totalResolutionTime += diffDays;
          completedCasesWithTime++;
        }
      });

      const averageResolutionTime = completedCasesWithTime > 0 
        ? Math.round(totalResolutionTime / completedCasesWithTime) 
        : 0;

      // Calculate priority distribution
      const priorityCounts: Record<string, number> = {
        'Urgent': 0,
        'High': 0,
        'Medium': 0,
        'Low': 0
      };

      filteredCases.forEach(caseItem => {
        if (caseItem.priority_level) {
          priorityCounts[caseItem.priority_level] = (priorityCounts[caseItem.priority_level] || 0) + 1;
        }
      });

      const priorityDistribution = Object.entries(priorityCounts)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0);

      // Calculate stage distribution
      const stageCounts: Record<string, number> = {};

      stagesData?.forEach(stage => {
        if (stage.status === 'Completed') {
          stageCounts[stage.stage_group] = (stageCounts[stage.stage_group] || 0) + 1;
        }
      });

      const stageDistribution = Object.entries(stageCounts)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

      // Calculate category distribution
      const categoryCounts: Record<string, number> = {};
      
      filteredCases.forEach(caseItem => {
        if (caseItem.case_categories && Array.isArray(caseItem.case_categories)) {
          caseItem.case_categories.forEach((category: string) => {
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          });
        }
      });
      
      const categoryDistribution = Object.entries(categoryCounts)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

      // Calculate partner organization distribution
      const partnerCounts: Record<string, number> = {};
      
      filteredCases.forEach(caseItem => {
        if (caseItem.partner) {
          partnerCounts[caseItem.partner] = (partnerCounts[caseItem.partner] || 0) + 1;
        } else {
          partnerCounts['Unspecified'] = (partnerCounts['Unspecified'] || 0) + 1;
        }
      });
      
      const partnerDistribution = Object.entries(partnerCounts)
        .map(([name, value]) => ({ name, value }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5 partners

      // Process stages for progress component. `value` is the literal
      // stage_group string stored in the database (used to match case_stages
      // rows); `labelKey` resolves the translated label shown in the UI.
      const rapidResponseStages: { value: string; labelKey: string }[] = [
        { value: 'Initial Contact', labelKey: 'dashboard.stageNames.initialContact' },
        { value: 'Investigation & Arrest', labelKey: 'dashboard.stageNames.investigationAndArrest' },
        { value: 'Local Mediation', labelKey: 'dashboard.stageNames.localMediation' },
        { value: 'Medical & Counselling', labelKey: 'dashboard.stageNames.medicalAndCounselling' },
        { value: 'Legal Prosecution', labelKey: 'dashboard.stageNames.legalProsecution' },
        { value: 'Court Trial', labelKey: 'dashboard.stageNames.courtTrial' },
        { value: 'Post-Trial', labelKey: 'dashboard.stageNames.postTrial' }
      ];

      const processedStagesForProgress = rapidResponseStages.map(({ value: stageName, labelKey }) => {
        const stageData = stagesData?.filter(stage => stage.stage_group === stageName) || [];
        const completedCount = stageData.filter(stage => stage.status === 'Completed').length;
        const inProgressCount = stageData.filter(stage => stage.status === 'In Progress').length;
        const totalCount = stageData.length;

        let status: 'Pending' | 'In Progress' | 'Completed' = 'Pending';

        if (completedCount === totalCount && totalCount > 0) {
          status = 'Completed';
        } else if (inProgressCount > 0 || completedCount > 0) {
          status = 'In Progress';
        }

        return {
          stage_name: t(labelKey),
          status,
          count: totalCount
        };
      });

      devLog('Processed stages for progress:', processedStagesForProgress);

      // Get recent activity (latest 5 cases or stage updates)
      const recentActivity = filteredCases
        .map(caseItem => ({
          id: caseItem.id,
          case_filed: caseItem.case_filed,
          action: caseItem.status === 'completed' ? 'Case Completed' : 'Case Created',
          date: new Date(caseItem.created_at).toLocaleDateString(),
          user: caseItem.profiles?.full_name || 'Unknown User'
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Update state with calculated stats
      setStats({
        totalCases,
        activeCases,
        completedCases,
        averageResolutionTime,
        priorityDistribution,
        stageDistribution,
        recentActivity,
        processedStagesForProgress,
        categoryDistribution,
        partnerDistribution
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(t('dashboard.errors.failedToLoadDashboardData'));
      toast.error(t('dashboard.errors.failedToLoadDashboardData'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      priority: 'all',
      stage: 'all',
      category: 'all',
      partner: 'all',
      country: 'all',
      status: 'all'
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== 'all');
  const getPriorityTone = (priority: string): NonNullable<BadgeProps['tone']> => {
    switch (priority) {
      case 'Urgent': return 'danger';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      case 'Low': return 'success';
      default: return 'neutral';
    }
  };

  const getStageTone = (stage: string): NonNullable<BadgeProps['tone']> => {
    switch (stage) {
      case 'intake': return 'neutral';
      case 'review': return 'info';
      case 'action': return 'warning';
      case 'resolution': return 'success';
      default: return 'neutral';
    }
  };

  const getStatusTone = (status: string): NonNullable<BadgeProps['tone']> => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      case 'on_hold': return 'warning';
      case 'pending': return 'neutral';
      default: return 'neutral';
    }
  };


  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card className="bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <Title>{t('dashboard.title')}</Title>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'quarter' | 'year')}
              className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="week">{t('dashboard.timeRange.lastWeek')}</option>
              <option value="month">{t('dashboard.timeRange.lastMonth')}</option>
              <option value="quarter">{t('dashboard.timeRange.lastQuarter')}</option>
              <option value="year">{t('dashboard.timeRange.lastYear')}</option>
            </select>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter className="h-4 w-4" />}
          >
            <span>{t('dashboard.filtersButton')}</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-primary rounded-full">
                {Object.values(filters).filter(value => value !== 'all').length}
              </span>
            )}
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-stone-50 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <Select
                label={t('dashboard.filters.priority')}
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="all">{t('dashboard.filters.allPriorities')}</option>
                {filterOptions.priorities.map(priority => (
                  <option key={priority} value={priority}>{t(`caseForm.priorities.${priority.toLowerCase()}`)}</option>
                ))}
              </Select>

              <Select
                label={t('dashboard.filters.stage')}
                value={filters.stage}
                onChange={(e) => handleFilterChange('stage', e.target.value)}
              >
                <option value="all">{t('dashboard.filters.allStages')}</option>
                {filterOptions.stages.map(stage => (
                  <option key={stage} value={stage}>{t(`caseForm.stages.${stage}`)}</option>
                ))}
              </Select>

              <Select
                label={t('dashboard.filters.category')}
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="all">{t('dashboard.filters.allCategories')}</option>
                {filterOptions.categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>

              <Select
                label={t('dashboard.filters.partner')}
                value={filters.partner}
                onChange={(e) => handleFilterChange('partner', e.target.value)}
              >
                <option value="all">{t('dashboard.filters.allPartners')}</option>
                {filterOptions.partners.map(partner => (
                  <option key={partner} value={partner}>{partner}</option>
                ))}
              </Select>

              <Select
                label={t('dashboard.filters.country')}
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
              >
                <option value="all">{t('dashboard.filters.allCountries')}</option>
                {filterOptions.countries.map(country => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </Select>

              <Select
                label={t('dashboard.filters.status')}
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">{t('dashboard.filters.allStatuses')}</option>
                {filterOptions.statuses.map(status => (
                  <option key={status} value={status}>{t(`dashboard.statusLabels.${status}`)}</option>
                ))}
              </Select>
            </div>

            {/* Active filters display */}
            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                  if (value === 'all') return null;

                  let displayValue = value;
                  if (key === 'country') {
                    const country = filterOptions.countries.find(c => c.id === value);
                    displayValue = country?.name || value;
                  } else if (key === 'priority') {
                    displayValue = t(`caseForm.priorities.${value.toLowerCase()}`);
                  } else if (key === 'stage') {
                    displayValue = t(`caseForm.stages.${value}`);
                  } else if (key === 'status') {
                    displayValue = t(`dashboard.statusLabels.${value}`);
                  }

                  const filterLabelKey = key === 'partner' ? 'dashboard.filters.partner'
                    : key === 'category' ? 'dashboard.filters.category'
                    : key === 'country' ? 'dashboard.filters.country'
                    : key === 'priority' ? 'dashboard.filters.priority'
                    : key === 'stage' ? 'dashboard.filters.stage'
                    : key === 'status' ? 'dashboard.filters.status'
                    : null;

                  return (
                    <span
                      key={key}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      {filterLabelKey ? t(filterLabelKey) : key.charAt(0).toUpperCase() + key.slice(1)}: {displayValue}
                      <button
                        onClick={() => handleFilterChange(key, 'all')}
                        className="ml-1 text-primary hover:text-primary-dark"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}

                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  {t('dashboard.clearAllFilters')}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
      {error ? (
        <Card className="bg-white">
          <ErrorState
            description={error}
            action={
              <Button onClick={fetchDashboardData} icon={<RefreshCw className="h-4 w-4" />}>
                {t('dashboard.errors.retry')}
              </Button>
            }
          />
        </Card>
      ) : loading ? (
        <Card>
          <LoadingState label={t('dashboard.states.loadingCases')} />
        </Card>
      ) : (
        <>
          {/* Results Summary */}
          <Card className="bg-white">
            <div className="flex justify-between items-center">
              <div>
                <Text className="text-stone-500">
                  {t('dashboard.summary.showingCases', { count: stats.totalCases })}
                  {hasActiveFilters && t('dashboard.summary.filteredSuffix')}
                  {timeRange !== 'year' && t('dashboard.summary.fromLastSuffix', { timeRange: t(`dashboard.timeRange.last${timeRange.charAt(0).toUpperCase()}${timeRange.slice(1)}`) })}
                </Text>
                {hasActiveFilters && (
                  <Text className="text-sm text-stone-400 mt-1">
                    {t('dashboard.summary.useFiltersHint')}
                  </Text>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDashboardData}
                title={t('dashboard.summary.refreshTitle')}
                icon={<RefreshCw className="h-4 w-4" />}
              >
                {t('dashboard.summary.refresh')}
              </Button>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <DashboardCard
              title={t('dashboard.stats.totalCases')}
              value={stats.totalCases}
              change="+0.0%"
              type="cases"
            />
            <DashboardCard
              title={t('dashboard.stats.activeCases')}
              value={stats.activeCases}
              change="+0.0%"
              type="judgments"
            />
            <DashboardCard
              title={t('dashboard.stats.completedCases')}
              value={stats.completedCases}
              change="+0.0%"
              type="success"
            />
            <DashboardCard
              title={t('dashboard.stats.avgResolutionTime')}
              value={t('dashboard.stats.daysSuffix', { count: stats.averageResolutionTime })}
              change="+0.0%"
              type="cases"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard
              title={t('dashboard.charts.priorityDistribution')}
              description={t('dashboard.charts.priorityDistributionDescription')}
            >
              <RankedBarChart
                data={stats.priorityDistribution}
                valueLabel={t('dashboard.charts.casesLabel')}
                showPercent={false}
                labelWidth={90}
                minHeight={180}
                emptyTitle={t('dashboard.charts.noPriorityData')}
              />
            </ChartCard>

            <ChartCard
              title={t('dashboard.charts.partnerOrgEngagement')}
              description={t('dashboard.charts.partnerOrgEngagementDescription')}
            >
              <RankedBarChart
                data={stats.partnerDistribution}
                valueLabel={t('dashboard.charts.casesLabel')}
                showPercent={false}
                labelWidth={200}
                minHeight={220}
                emptyTitle={t('dashboard.charts.noPartnerData')}
              />
            </ChartCard>
          </div>

          <ChartCard
            title={t('dashboard.charts.caseCategoryDistribution')}
            description={t('dashboard.charts.caseCategoryDistributionDescription')}
          >
            <RankedBarChart
              data={stats.categoryDistribution}
              valueLabel={t('dashboard.charts.casesLabel')}
              showPercent
              labelWidth={240}
              minHeight={220}
              emptyTitle={t('dashboard.charts.noCategoryData')}
              highlightTop
            />
          </ChartCard>

          {/* Case Stage Progress */}
          <Card className="bg-white">
            <Title>{t('dashboard.charts.caseStageProgress')}</Title>
            <div className="mt-4">
              <CaseStageProgress
                stages={stats.processedStagesForProgress}
                showCounts={true}
              />
            </div>
          </Card>

          {/* Recent Cases */}
          <Card className="bg-white">
            <div className="flex justify-between items-center mb-4">
              <Title>{t('dashboard.recentCases.title')}</Title>
              {onViewAllCases && (
                <Button variant="ghost" size="sm" onClick={onViewAllCases}>
                  {t('dashboard.recentCases.viewAllCases')}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {recentCases.length > 0 ? (
                recentCases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="p-4 border border-stone-200 rounded-xl shadow-card hover:bg-stone-50 cursor-pointer"
                    onClick={() => onCaseClick && onCaseClick(caseItem.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-medium text-stone-900">{caseItem.case_filed}</h3>
                        <p className="text-xs text-stone-500 mt-1">{caseItem.countries?.name}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        {caseItem.status && (
                          <Badge tone={getStatusTone(caseItem.status)}>
                            {t(`dashboard.statusLabels.${caseItem.status}`)}
                          </Badge>
                        )}
                        {caseItem.priority_level && (
                          <Badge tone={getPriorityTone(caseItem.priority_level)}>
                            {t(`caseForm.priorities.${caseItem.priority_level.toLowerCase()}`)}
                          </Badge>
                        )}
                        {caseItem.rapid_response_stage && (
                          <Badge tone={getStageTone(caseItem.rapid_response_stage)}>
                            {t(`caseForm.stages.${caseItem.rapid_response_stage}`)}
                          </Badge>
                        )}
                        {caseItem.case_categories && caseItem.case_categories.length > 0 && (
                          <Badge tone="neutral">
                            {caseItem.case_categories[0].split(' ')[0]}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-stone-600 mt-2 line-clamp-2">{caseItem.case_summary}</p>
                    <div className="flex justify-between items-center mt-2 text-xs text-stone-500">
                      <span>{new Date(caseItem.created_at).toLocaleDateString()}</span>
                      <div className="flex items-center gap-1.5">
                        {caseItem.profiles?.full_name && (
                          <span className="font-medium text-stone-700">{caseItem.profiles.full_name}</span>
                        )}
                        {caseItem.profiles?.organization && (
                          <Badge tone="neutral">
                            {caseItem.profiles.organization}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title={t('dashboard.recentCases.noRecentCases')}
                  action={
                    onCreateCase ? (
                      <Button onClick={onCreateCase}>{t('dashboard.recentCases.createNewCase')}</Button>
                    ) : undefined
                  }
                />
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default RapidResponseDashboard;
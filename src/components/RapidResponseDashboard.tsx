import React, { useState, useEffect } from 'react';
import { Card, Title, Text, BarChart } from '@tremor/react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import CaseStageProgress from './CaseStageProgress';
import { LoadingState, Badge, Select, Button, EmptyState, ErrorState } from './ui';
import type { BadgeProps } from './ui';
import { chartHeight } from '../lib/chartLayout';
import DashboardCard from './DashboardCard';

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
    console.log('RapidResponseDashboard: Fetching dashboard data...');
    fetchDashboardData();
  }, [timeRange, filters]);

  // Set up real-time subscriptions
  useEffect(() => {
    console.log('Setting up real-time subscriptions for rapid response dashboard');
    
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
          console.log('Rapid response case changed:', payload);
          fetchDashboardData();
          
          if (payload.eventType === 'INSERT') {
            toast.success('New rapid response case added');
          } else if (payload.eventType === 'UPDATE') {
            toast.success('Rapid response case updated');
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
          console.log('Case stage changed:', payload);
          fetchDashboardData();
        }
      )
      .subscribe();

    // Clean up subscriptions when component unmounts
    return () => {
      console.log('Cleaning up rapid response dashboard subscriptions');
      supabase.removeChannel(casesSubscription);
      supabase.removeChannel(stagesSubscription);
    };
  }, []);

  const fetchFilterOptions = async () => {
    try {
      console.log('Fetching filter options for rapid response dashboard');
      
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
      console.log('Fetching dashboard data...');
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

      console.log('Date range:', { startDate, endDate });

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

      console.log('Cases query result:', casesData);
      console.log('Cases query error:', casesError);

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

      console.log('Stages query result:', stagesData?.length);
      console.log('Stages query error:', stagesError);

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

      // Process stages for progress component
      const rapidResponseStages = [
        'Initial Contact',
        'Investigation & Arrest',
        'Local Mediation',
        'Medical & Counselling',
        'Legal Prosecution',
        'Court Trial',
        'Post-Trial'
      ];

      const processedStagesForProgress = rapidResponseStages.map(stageName => {
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
          stage_name: stageName,
          status,
          count: totalCount
        };
      });

      console.log('Processed stages for progress:', processedStagesForProgress);

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
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
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

  // Tremor's `colors` prop only accepts its own named palette (e.g. "red",
  // "blue") — arbitrary hex codes don't match any known color and silently
  // fall back to black bars, so these must stay as Tremor color names.
  const priorityColors = ["red", "orange", "blue", "emerald"];
  const categoryColors = ["violet", "red", "pink", "orange", "indigo"];
  const partnerColors = ["rose", "blue", "emerald", "amber", "violet"];

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card className="bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <Title>Rapid Response Dashboard</Title>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'quarter' | 'year')}
              className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            icon={<Filter className="h-4 w-4" />}
          >
            <span>Filters</span>
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
                label="Priority"
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="all">All Priorities</option>
                {filterOptions.priorities.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </Select>

              <Select
                label="Stage"
                value={filters.stage}
                onChange={(e) => handleFilterChange('stage', e.target.value)}
              >
                <option value="all">All Stages</option>
                {filterOptions.stages.map(stage => (
                  <option key={stage} value={stage}>{stage.charAt(0).toUpperCase() + stage.slice(1)}</option>
                ))}
              </Select>

              <Select
                label="Category"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="all">All Categories</option>
                {filterOptions.categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>

              <Select
                label="Partner"
                value={filters.partner}
                onChange={(e) => handleFilterChange('partner', e.target.value)}
              >
                <option value="all">All Partners</option>
                {filterOptions.partners.map(partner => (
                  <option key={partner} value={partner}>{partner}</option>
                ))}
              </Select>

              <Select
                label="Country"
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
              >
                <option value="all">All Countries</option>
                {filterOptions.countries.map(country => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </Select>

              <Select
                label="Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Statuses</option>
                {filterOptions.statuses.map(status => (
                  <option key={status} value={status}>{status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
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
                  }
                  
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}: {displayValue}
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
                  Clear all filters
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
                Retry
              </Button>
            }
          />
        </Card>
      ) : loading ? (
        <Card>
          <LoadingState label="Loading rapid response cases…" />
        </Card>
      ) : (
        <>
          {/* Results Summary */}
          <Card className="bg-white">
            <div className="flex justify-between items-center">
              <div>
                <Text className="text-stone-500">
                  Showing {stats.totalCases} rapid response cases
                  {hasActiveFilters && ' (filtered)'}
                  {timeRange !== 'year' && ` from the last ${timeRange}`}
                </Text>
                {hasActiveFilters && (
                  <Text className="text-sm text-stone-400 mt-1">
                    Use filters above to refine results
                  </Text>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDashboardData}
                title="Refresh data"
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh
              </Button>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <DashboardCard
              title="Total Cases"
              value={stats.totalCases}
              change="+0.0%"
              type="cases"
            />
            <DashboardCard
              title="Active Cases"
              value={stats.activeCases}
              change="+0.0%"
              type="judgments"
            />
            <DashboardCard
              title="Completed Cases"
              value={stats.completedCases}
              change="+0.0%"
              type="success"
            />
            <DashboardCard
              title="Avg. Resolution Time"
              value={`${stats.averageResolutionTime} days`}
              change="+0.0%"
              type="cases"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Priority Distribution */}
            <Card className="bg-white">
              <Title>Priority Distribution</Title>
              {stats.priorityDistribution.length > 0 ? (
                <BarChart
                  className="mt-6 h-60"
                  data={stats.priorityDistribution}
                  index="name"
                  categories={["value"]}
                  colors={priorityColors}
                  layout="vertical"
                  showLegend={false}
                  showAnimation={true}
                  showYAxis={true}
                  showXAxis={true}
                  showGridLines={true}
                  yAxisWidth={90}
                  valueFormatter={(value) => `${value} cases`}
                />
              ) : (
                <EmptyState title="No priority data available" />
              )}
            </Card>

            {/* Partner Organization Engagement */}
            <Card className="bg-white">
              <Title>Partner Organization Engagement</Title>
              {stats.partnerDistribution.length > 0 ? (
                <BarChart
                  className="mt-6"
                  style={{ height: chartHeight(stats.partnerDistribution.length, 320) }}
                  data={stats.partnerDistribution}
                  index="name"
                  categories={["value"]}
                  colors={partnerColors}
                  layout="vertical"
                  showLegend={false}
                  showAnimation={true}
                  showYAxis={true}
                  showXAxis={true}
                  showGridLines={true}
                  yAxisWidth={220}
                  valueFormatter={(value) => `${value} cases`}
                />
              ) : (
                <EmptyState title="No partner organization data available" />
              )}
            </Card>
          </div>

          {/* Case Category Distribution */}
          <Card className="bg-white">
            <Title>Case Category Distribution</Title>
            {stats.categoryDistribution.length > 0 ? (
              <BarChart
                className="mt-6"
                style={{ height: chartHeight(stats.categoryDistribution.length, 240) }}
                data={stats.categoryDistribution}
                index="name"
                categories={["value"]}
                colors={categoryColors}
                layout="vertical"
                showLegend={false}
                showAnimation={true}
                showYAxis={true}
                showXAxis={true}
                showGridLines={true}
                yAxisWidth={160}
                valueFormatter={(value) => `${value} cases`}
              />
            ) : (
              <EmptyState title="No category data available" />
            )}
          </Card>

          {/* Case Stage Progress */}
          <Card className="bg-white">
            <Title>Case Stage Progress</Title>
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
              <Title>Recent Cases</Title>
              {onViewAllCases && (
                <Button variant="ghost" size="sm" onClick={onViewAllCases}>
                  View All Cases
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
                            {caseItem.status.replace('_', ' ')}
                          </Badge>
                        )}
                        {caseItem.priority_level && (
                          <Badge tone={getPriorityTone(caseItem.priority_level)}>
                            {caseItem.priority_level}
                          </Badge>
                        )}
                        {caseItem.rapid_response_stage && (
                          <Badge tone={getStageTone(caseItem.rapid_response_stage)}>
                            {caseItem.rapid_response_stage}
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
                  title="No recent cases"
                  action={
                    onCreateCase ? (
                      <Button onClick={onCreateCase}>Create New Case</Button>
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
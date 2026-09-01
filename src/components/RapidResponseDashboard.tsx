import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Flex, BarChart } from '@tremor/react';
import { supabase } from '../lib/supabase';
import { Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Calendar, RefreshCw, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import CaseStageProgress from './CaseStageProgress';

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
        const stagesData: any[] = [];
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
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-blue-100 text-blue-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-stone-100 text-stone-800';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'intake': return 'bg-purple-100 text-purple-800';
      case 'review': return 'bg-blue-100 text-blue-800';
      case 'action': return 'bg-amber-100 text-amber-800';
      case 'resolution': return 'bg-green-100 text-green-800';
      default: return 'bg-stone-100 text-stone-800';
    }
  };

  const getCategoryColor = (category: string) => {
    if (category.includes('Abortion')) return 'bg-purple-100 text-purple-800';
    if (category.includes('Rape')) return 'bg-red-100 text-red-800';
    if (category.includes('Defilement')) return 'bg-pink-100 text-pink-800';
    if (category.includes('SGBV')) return 'bg-orange-100 text-orange-800';
    if (category.includes('Incest')) return 'bg-indigo-100 text-indigo-800';
    return 'bg-stone-100 text-stone-800';
  };

  // Custom colors for priority levels
  const priorityColors = ["#EF4444", "#F97316", "#3B82F6", "#10B981"];
  const categoryColors = ["#8B5CF6", "#EF4444", "#EC4899", "#F97316", "#6366F1"];
  const partnerColors = ["#9C1D20", "#2563EB", "#059669", "#D97706", "#7C3AED"];

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
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-primary rounded-full">
                {Object.values(filters).filter(value => value !== 'all').length}
              </span>
            )}
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-stone-50 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Priorities</option>
                  {filterOptions.priorities.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Stage</label>
                <select
                  value={filters.stage}
                  onChange={(e) => handleFilterChange('stage', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Stages</option>
                  {filterOptions.stages.map(stage => (
                    <option key={stage} value={stage}>{stage.charAt(0).toUpperCase() + stage.slice(1)}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Categories</option>
                  {filterOptions.categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Partner</label>
                <select
                  value={filters.partner}
                  onChange={(e) => handleFilterChange('partner', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Partners</option>
                  {filterOptions.partners.map(partner => (
                    <option key={partner} value={partner}>{partner}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Country</label>
                <select
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Countries</option>
                  {filterOptions.countries.map(country => (
                    <option key={country.id} value={country.id}>{country.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Statuses</option>
                  {filterOptions.statuses.map(status => (
                    <option key={status} value={status}>{status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>
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
                
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
      {error ? (
        <Card className="bg-red-50 border border-red-200">
          <div className="text-red-700 px-4 py-3">
            <span className="block sm:inline">{error}</span>
            <button
              onClick={fetchDashboardData}
              className="mt-2 inline-flex items-center px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </button>
          </div>
        </Card>
      ) : loading ? (
        <Card>
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
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
              <button
                onClick={fetchDashboardData}
                className="flex items-center space-x-2 px-3 py-1 text-sm text-stone-600 hover:text-primary transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white">
              <Flex>
                <div>
                  <Text className="text-stone-500">Total Cases</Text>
                  <Text className="text-2xl font-bold">{stats.totalCases}</Text>
                </div>
                <AlertTriangle className="h-8 w-8 text-primary" />
              </Flex>
            </Card>
            
            <Card className="bg-white">
              <Flex>
                <div>
                  <Text className="text-stone-500">Active Cases</Text>
                  <Text className="text-2xl font-bold">{stats.activeCases}</Text>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </Flex>
            </Card>
            
            <Card className="bg-white">
              <Flex>
                <div>
                  <Text className="text-stone-500">Completed Cases</Text>
                  <Text className="text-2xl font-bold">{stats.completedCases}</Text>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </Flex>
            </Card>
            
            <Card className="bg-white">
              <Flex>
                <div>
                  <Text className="text-stone-500">Avg. Resolution Time</Text>
                  <Text className="text-2xl font-bold">{stats.averageResolutionTime} days</Text>
                </div>
                <Calendar className="h-8 w-8 text-amber-500" />
              </Flex>
            </Card>
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
                <div className="flex justify-center items-center h-60">
                  <Text>No priority data available</Text>
                </div>
              )}
            </Card>

            {/* Case Category Distribution */}
            <Card className="bg-white">
              <Title>Case Category Distribution</Title>
              {stats.categoryDistribution.length > 0 ? (
                <BarChart
                  className="mt-6 h-60"
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
                <div className="flex justify-center items-center h-60">
                  <Text>No category data available</Text>
                </div>
              )}
            </Card>
          </div>

          {/* Partner Organization Engagement */}
          <Card className="bg-white">
            <Title>Partner Organization Engagement</Title>
            {stats.partnerDistribution.length > 0 ? (
              <BarChart
                className="mt-6 h-80"
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
              <div className="flex justify-center items-center h-60">
                <Text>No partner organization data available</Text>
              </div>
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
                <button
                  onClick={onViewAllCases}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  View All Cases
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {recentCases.length > 0 ? (
                recentCases.map((caseItem) => (
                  <div 
                    key={caseItem.id} 
                    className="p-4 border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer"
                    onClick={() => onCaseClick && onCaseClick(caseItem.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-medium text-stone-900">{caseItem.case_filed}</h3>
                        <p className="text-xs text-stone-500 mt-1">{caseItem.countries?.name}</p>
                      </div>
                      <div className="flex space-x-2">
                        {caseItem.priority_level && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(caseItem.priority_level)}`}>
                            {caseItem.priority_level}
                          </span>
                        )}
                        {caseItem.rapid_response_stage && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStageColor(caseItem.rapid_response_stage)}`}>
                            {caseItem.rapid_response_stage}
                          </span>
                        )}
                        {caseItem.case_categories && caseItem.case_categories.length > 0 && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getCategoryColor(caseItem.case_categories[0])}`}>
                            {caseItem.case_categories[0].split(' ')[0]}
                          </span>
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
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600 border border-slate-200">
                            {caseItem.profiles.organization}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Text>No recent cases</Text>
                  {onCreateCase && (
                    <button
                      onClick={onCreateCase}
                      className="mt-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                    >
                      Create New Case
                    </button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default RapidResponseDashboard;
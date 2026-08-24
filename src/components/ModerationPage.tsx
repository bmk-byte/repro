import React from 'react';
import { Shield, CircleCheck as CheckCircle, Circle as XCircle, CircleAlert as AlertCircle, Eye, FileText, Filter, X, Search, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase, queryWithRetry, handleSupabaseError, verifyTableExists } from '../lib/supabase';
import { sanitizeSearchTerm, sanitizeOrFilterTerm } from '../lib/sanitize';
import toast from 'react-hot-toast';
import SubmissionDetailsModal from './SubmissionDetailsModal';
import DocumentModal from './DocumentModal';
import SubmissionDetailsCard from './SubmissionDetailsCard';
import { useModeratorStatus } from '../hooks/useModeratorStatus';
import RejectionModal from './RejectionModal';

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

const ModerationPage = () => {
  const [loading, setLoading] = React.useState(true);
  const [pendingCases, setPendingCases] = React.useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState<'cases' | 'submissions'>('submissions');
  const [activeSubmissionType, setActiveSubmissionType] = React.useState<'all' | 'case' | 'judgment'>('all');
  const [showDocumentModal, setShowDocumentModal] = React.useState(false);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any>(null);
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);
  
  // Filter states
  const [showFilters, setShowFilters] = React.useState(false);
  const [filterStartDate, setFilterStartDate] = React.useState('');
  const [filterEndDate, setFilterEndDate] = React.useState('');
  const [filterProfession, setFilterProfession] = React.useState('');
  const [filterOrganization, setFilterOrganization] = React.useState('');
  const [filterCountry, setFilterCountry] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'desc' | 'asc'>('desc');
  
  // Filter options
  const [professions, setProfessions] = React.useState<string[]>([]);
  const [organizations, setOrganizations] = React.useState<string[]>([]);
  const [countries, setCountries] = React.useState<{id: string, name: string}[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  const [contentError, setContentError] = React.useState<string | null>(null);

  // Use the custom hook for moderator status
  const { isModerator, loading: moderatorLoading, error: moderatorError } = useModeratorStatus();
  
  devLog('ModerationPage render - moderator status:', { isModerator, moderatorLoading, moderatorError });

  React.useEffect(() => {
    devLog('ModerationPage effect - checking if should fetch data');
    devLog('moderatorLoading:', moderatorLoading, 'isModerator:', isModerator);
    
    if (!moderatorLoading && isModerator) {
      devLog('User is moderator and not loading, fetching data');
      fetchFilterOptions();
      fetchPendingContent();
    } else if (!moderatorLoading && !isModerator) {
      devLog('User is NOT a moderator and not loading');
    }
  }, [isModerator, moderatorLoading, activeTab, activeSubmissionType, filterStartDate, filterEndDate, filterProfession, filterOrganization, filterCountry, sortOrder]);

  // Set up real-time subscription for pending submissions
  React.useEffect(() => {
    if (!isModerator) return;

    devLog('Setting up real-time subscription for pending submissions');
    
    // Subscribe to INSERT events on both pending tables
    const pendingCasesSubscription = supabase
      .channel('pending-cases-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pending_cases',
          filter: 'status=eq.pending'
        },
        (payload) => {
          devLog('New pending case:', payload);
          fetchPendingContent();
          
          const submissionTitle = payload.new.title || 'New case submission';
          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <AlertCircle className="h-10 w-10 text-primary" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">New Case Submission</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {submissionTitle} has been submitted for moderation
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    setActiveTab('submissions');
                  }}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary hover:text-primary-dark focus:outline-none"
                >
                  View
                </button>
              </div>
            </div>
          ), {
            duration: 5000,
            position: 'top-right',
          });
        }
      )
      .subscribe();

    const pendingJudgmentsSubscription = supabase
      .channel('pending-judgments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pending_judgments',
          filter: 'status=eq.pending'
        },
        (payload) => {
          devLog('New pending judgment:', payload);
          fetchPendingContent();
          
          const submissionTitle = payload.new.title || 'New judgment submission';
          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <AlertCircle className="h-10 w-10 text-primary" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">New Judgment Submission</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {submissionTitle} has been submitted for moderation
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    setActiveTab('submissions');
                  }}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary hover:text-primary-dark focus:outline-none"
                >
                  View
                </button>
              </div>
            </div>
          ), {
            duration: 5000,
            position: 'top-right',
          });
        }
      )
      .subscribe();

    // Clean up subscriptions when component unmounts
    return () => {
      devLog('Cleaning up subscriptions');
      supabase.removeChannel(pendingCasesSubscription);
      supabase.removeChannel(pendingJudgmentsSubscription);
    };
  }, [isModerator]);

  const fetchFilterOptions = async () => {
    try {
      devLog('Fetching filter options');
      
      const result = await queryWithRetry(async () => {
        // Fetch unique professions
        const { data: professionData, error: professionError } = await supabase
          .from('profiles')
          .select('profession')
          .not('profession', 'is', null);
        
        if (professionError) throw professionError;
        
        const uniqueProfessions = Array.from(
          new Set(professionData.map(p => p.profession).filter(Boolean))
        ).sort();
        
        // Fetch unique organizations
        const { data: orgData, error: orgError } = await supabase
          .from('profiles')
          .select('organization')
          .not('organization', 'is', null);
        
        if (orgError) throw orgError;
        
        const uniqueOrgs = Array.from(
          new Set(orgData.map(o => o.organization).filter(Boolean))
        ).sort();
        
        // Fetch countries
        const { data: countryData, error: countryError } = await supabase
          .from('countries')
          .select('id, name')
          .order('name');
        
        if (countryError) throw countryError;
        
        return {
          professions: uniqueProfessions,
          organizations: uniqueOrgs,
          countries: countryData || []
        };
      });
      
      setProfessions(result.professions);
      setOrganizations(result.organizations);
      setCountries(result.countries);
      
    } catch (error) {
      console.error('Error fetching filter options:', error);
      toast.error(handleSupabaseError(error));
    }
  };

  const fetchPendingContent = async () => {
    try {
      devLog('Fetching pending content, activeTab:', activeTab);
      setLoading(true);
      setContentError(null);
      
      // Get matching profile IDs if profession or organization filters are set
      let profileIds: string[] | null = null;
      if (filterProfession || filterOrganization) {
        const profileResult = await queryWithRetry(async () => {
          let query = supabase
            .from('profiles')
            .select('id');
          
          if (filterProfession) {
            query = query.ilike('profession', `%${sanitizeSearchTerm(filterProfession)}%`);
          }

          if (filterOrganization) {
            query = query.ilike('organization', `%${sanitizeSearchTerm(filterOrganization)}%`);
          }
          
          const { data: profiles, error: profilesError } = await query;
          
          if (profilesError) throw profilesError;
          return profiles;
        });
        
        if (profileResult.length === 0) {
          // No matching profiles, so no results will be found
          if (activeTab === 'cases') setPendingCases([]);
          else setPendingSubmissions([]);
          return;
        }
        
        profileIds = profileResult.map(p => p.id);
      }
      
      if (activeTab === 'cases') {
        devLog('Fetching pending cases');
        // Fetch pending cases
        const casesResult = await queryWithRetry(async () => {
          let query = supabase
            .from('cases')
            .select(`
              *,
              profiles!cases_user_id_fkey (
                email, 
                full_name, 
                profession, 
                organization
              ),
              countries (name)
            `)
            .eq('moderation_status', 'pending');
          
          // Apply filters
          if (profileIds) {
            query = query.in('user_id', profileIds);
          }
          
          if (filterCountry) {
            query = query.eq('country_id', filterCountry);
          }
          
          if (filterStartDate) {
            query = query.gte('created_at', filterStartDate);
          }
          
          if (filterEndDate) {
            // Add one day to include the end date fully
            const endDate = new Date(filterEndDate);
            endDate.setDate(endDate.getDate() + 1);
            query = query.lt('created_at', endDate.toISOString());
          }
          
          if (searchTerm) {
            const term = sanitizeOrFilterTerm(searchTerm);
            query = query.or(`case_filed.ilike.%${term}%,case_summary.ilike.%${term}%`);
          }
          
          // Apply sorting and bound the result — an unbounded moderation
          // queue query grows without limit as pending cases accumulate.
          query = query.order('created_at', { ascending: sortOrder === 'asc' }).range(0, 199);

          const { data: cases, error: casesError } = await query;

          if (casesError) throw casesError;
          return cases;
        });

        devLog('Pending cases result:', casesResult);
        setPendingCases(casesResult || []);
      } else if (activeTab === 'submissions') {
        devLog('Fetching pending submissions from both tables');
        
        let allSubmissions: any[] = [];
        
        // Fetch pending cases if we want all or just cases
        if (activeSubmissionType === 'all' || activeSubmissionType === 'case') {
          // First verify the table exists
          const pendingCasesExists = await verifyTableExists('pending_cases');
          if (!pendingCasesExists) {
            console.error('pending_cases table does not exist or is not accessible');
            toast.error('Database configuration issue: pending_cases table not found');
          } else {
            const casesResult = await queryWithRetry(async () => {
              let casesQuery = supabase
                .from('pending_cases')
                .select(`
                  *,
                  profiles!pending_cases_submitted_by_fkey (
                    email, 
                    full_name, 
                    profession, 
                    organization
                  ),
                  countries (name)
                `)
                .eq('status', 'pending');
              
              // Apply filters
              if (profileIds) {
                casesQuery = casesQuery.in('submitted_by', profileIds);
              }
              
              if (filterCountry) {
                casesQuery = casesQuery.eq('country_id', filterCountry);
              }
              
              if (filterStartDate) {
                casesQuery = casesQuery.gte('submission_date', filterStartDate);
              }
              
              if (filterEndDate) {
                const endDate = new Date(filterEndDate);
                endDate.setDate(endDate.getDate() + 1);
                casesQuery = casesQuery.lt('submission_date', endDate.toISOString());
              }
              
              if (searchTerm) {
                const term = sanitizeOrFilterTerm(searchTerm);
                casesQuery = casesQuery.or(`title.ilike.%${term}%,summary.ilike.%${term}%`);
              }
              
              casesQuery = casesQuery.order('submission_date', { ascending: sortOrder === 'asc' }).range(0, 199);

              const { data: pendingCasesData, error: pendingCasesError } = await casesQuery;

              if (pendingCasesError) throw pendingCasesError;
              return pendingCasesData;
            });
            
            // Add type and originalTable properties to each case
            const casesWithType = (casesResult || []).map(item => ({
              ...item,
              type: 'case',
              originalTable: 'pending_cases'
            }));
            
            allSubmissions = [...allSubmissions, ...casesWithType];
          }
        }
        
        // Fetch pending judgments if we want all or just judgments
        if (activeSubmissionType === 'all' || activeSubmissionType === 'judgment') {
          // First verify the table exists
          const pendingJudgmentsExists = await verifyTableExists('pending_judgments');
          if (!pendingJudgmentsExists) {
            console.error('pending_judgments table does not exist or is not accessible');
            toast.error('Database configuration issue: pending_judgments table not found');
          } else {
            const judgmentsResult = await queryWithRetry(async () => {
              let judgmentsQuery = supabase
                .from('pending_judgments')
                .select(`
                  *,
                  profiles!pending_judgments_submitted_by_fkey (
                    email, 
                    full_name, 
                    profession, 
                    organization
                  ),
                  countries (name)
                `)
                .eq('status', 'pending');
              
              // Apply filters
              if (profileIds) {
                judgmentsQuery = judgmentsQuery.in('submitted_by', profileIds);
              }
              
              if (filterCountry) {
                judgmentsQuery = judgmentsQuery.eq('country_id', filterCountry);
              }
              
              if (filterStartDate) {
                judgmentsQuery = judgmentsQuery.gte('submission_date', filterStartDate);
              }
              
              if (filterEndDate) {
                const endDate = new Date(filterEndDate);
                endDate.setDate(endDate.getDate() + 1);
                judgmentsQuery = judgmentsQuery.lt('submission_date', endDate.toISOString());
              }
              
              if (searchTerm) {
                const term = sanitizeOrFilterTerm(searchTerm);
                judgmentsQuery = judgmentsQuery.or(`title.ilike.%${term}%,summary.ilike.%${term}%`);
              }
              
              judgmentsQuery = judgmentsQuery.order('submission_date', { ascending: sortOrder === 'asc' }).range(0, 199);

              const { data: pendingJudgmentsData, error: pendingJudgmentsError } = await judgmentsQuery;

              if (pendingJudgmentsError) throw pendingJudgmentsError;
              return pendingJudgmentsData;
            });
            
            // Add type and originalTable properties to each judgment
            const judgmentsWithType = (judgmentsResult || []).map(item => ({
              ...item,
              type: 'judgment',
              originalTable: 'pending_judgments'
            }));
            
            allSubmissions = [...allSubmissions, ...judgmentsWithType];
          }
        }
        
        // Sort all submissions by submission_date
        allSubmissions.sort((a, b) => {
          const dateA = new Date(a.submission_date || a.created_at);
          const dateB = new Date(b.submission_date || b.created_at);
          return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        });

        devLog('All pending submissions result:', allSubmissions);
        setPendingSubmissions(allSubmissions);
      }
    } catch (error) {
      console.error('Error fetching pending content:', error);
      const msg = handleSupabaseError(error);
      toast.error(msg);
      setContentError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleModeration = async (
    type: 'cases' | 'submissions',
    id: string,
    status: 'approved' | 'rejected',
    originalTable?: string,
    feedback?: string
  ) => {
    try {
      setLoading(true);

      if (type === 'cases') {
        // Handle cases moderation (existing logic)
        const updateData: any = { moderation_status: status };
        
        devLog(`Updating cases with ID ${id} to status ${status}`);
        devLog('Update data:', updateData);
        
        await queryWithRetry(async () => {
          const { error } = await supabase
            .from('cases')
            .update(updateData)
            .eq('id', String(id));

          if (error) throw error;
        });
      } else if (type === 'submissions') {
        // Determine which table to update based on originalTable property
        const tableName = originalTable || 'pending_cases'; // fallback to pending_cases
        
        // Verify table exists before attempting update
        const tableExists = await verifyTableExists(tableName);
        if (!tableExists) {
          throw new Error(`Table ${tableName} is not accessible`);
        }
        
        if (status === 'approved') {
          // For approved submissions, we only need to update the status
          // The database trigger will handle moving the data to the appropriate table
          devLog(`Approving submission with ID ${id} from table ${tableName}`);
          
          const updateData: any = { status };
          
          // Add feedback if provided for rejected submissions
          if (status === 'rejected' && feedback) {
            updateData.feedback = feedback;
          }
          
          await queryWithRetry(async () => {
            const { error } = await supabase
              .from(tableName)
              .update(updateData)
              .eq('id', String(id));
              
            if (error) throw error;
          });
        } else {
          // For rejected submissions, just update the status with feedback
          const updateData: any = { 
            status,
            feedback: feedback || ''
          };
          
          devLog(`Updating ${tableName} with ID ${id} to status ${status}`);
          devLog('Update data:', updateData);
          
          await queryWithRetry(async () => {
            const { error } = await supabase
              .from(tableName)
              .update(updateData)
              .eq('id', String(id));

            if (error) throw error;
          });
        }
      }

      toast.success(`Content ${status} successfully`);
      fetchPendingContent();
      
      // Clear feedback and close modal if open
      if (showFeedbackModal) {
        setShowFeedbackModal(false);
        setSelectedItem(null);
      }
    } catch (error: any) {
      console.error('Error updating moderation status:', error);
      devLog('Error details:', JSON.stringify(error));
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterProfession('');
    setFilterOrganization('');
    setFilterCountry('');
    setSortOrder('desc');
    setSearchTerm('');
  };

  const handleRejection = (id: string, feedback: string, originalTable?: string) => {
    handleModeration('submissions', id, 'rejected', originalTable, feedback);
  };

  if (moderatorLoading) {
    devLog('Moderator status is loading');
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isModerator) {
    devLog('User is not a moderator');
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You do not have permission to access this page
          </p>
          {moderatorError && (
            <p className="mt-4 text-sm text-red-500">
              Error: {moderatorError}
            </p>
          )}
        </div>
      </div>
    );
  }

  devLog('User is a moderator, rendering moderation page');
  // Get the current items based on active tab
  const currentItems = activeTab === 'cases' 
    ? pendingCases 
    : pendingSubmissions;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">Content Moderation</h1>
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Search and Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="col-span-1 md:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
              <select
                value={filterProfession}
                onChange={(e) => setFilterProfession(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">All Professions</option>
                {professions.map(profession => (
                  <option key={profession} value={profession}>{profession}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
              <select
                value={filterOrganization}
                onChange={(e) => setFilterOrganization(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">All Organizations</option>
                {organizations.map(org => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">All Countries</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm font-medium text-primary bg-white border border-primary rounded-lg hover:bg-primary/5"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          {/* Filter summary */}
          <div className="flex flex-wrap gap-2 mt-2">
            {filterStartDate && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                From: {new Date(filterStartDate).toLocaleDateString()}
                <button onClick={() => setFilterStartDate('')} className="ml-1 text-blue-600 hover:text-blue-800">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterEndDate && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                To: {new Date(filterEndDate).toLocaleDateString()}
                <button onClick={() => setFilterEndDate('')} className="ml-1 text-blue-600 hover:text-blue-800">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterProfession && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Profession: {filterProfession}
                <button onClick={() => setFilterProfession('')} className="ml-1 text-purple-600 hover:text-purple-800">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterOrganization && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Organization: {filterOrganization}
                <button onClick={() => setFilterOrganization('')} className="ml-1 text-green-600 hover:text-green-800">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterCountry && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Country: {countries.find(c => c.id === filterCountry)?.name}
                <button onClick={() => setFilterCountry('')} className="ml-1 text-yellow-600 hover:text-yellow-800">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {sortOrder !== 'desc' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Oldest First
                <button onClick={() => setSortOrder('desc')} className="ml-1 text-gray-600 hover:text-gray-800">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b overflow-x-auto">
          <nav className="flex space-x-4 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('submissions')}
              className={`py-4 px-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'submissions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Submissions
            </button>
            <button
              onClick={() => setActiveTab('cases')}
              className={`py-4 px-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'cases'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cases
            </button>
          </nav>
        </div>

        {activeTab === 'submissions' && (
          <div className="border-b overflow-x-auto">
            <nav className="flex space-x-4 px-6 py-2" aria-label="Submission Types">
              <button
                onClick={() => setActiveSubmissionType('all')}
                className={`py-2 px-3 text-sm font-medium rounded-md ${
                  activeSubmissionType === 'all'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Submissions
              </button>
              <button
                onClick={() => setActiveSubmissionType('case')}
                className={`py-2 px-3 text-sm font-medium rounded-md ${
                  activeSubmissionType === 'case'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Case Submissions
              </button>
              <button
                onClick={() => setActiveSubmissionType('judgment')}
                className={`py-2 px-3 text-sm font-medium rounded-md ${
                  activeSubmissionType === 'judgment'
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Judgment Submissions
              </button>
            </nav>
          </div>
        )}

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : contentError ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-2">Failed to load content</p>
              <p className="text-gray-500 text-sm mb-4">{contentError}</p>
              <button
                onClick={fetchPendingContent}
                className="text-primary hover:text-primary-dark text-sm font-medium"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Results count */}
              <div className="mb-4 text-sm text-gray-500">
                {currentItems.length} {currentItems.length === 1 ? 'item' : 'items'} pending review
                {(filterStartDate || filterEndDate || filterProfession || filterOrganization || filterCountry || searchTerm) && ' (filtered)'}
              </div>
              
              {currentItems.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No pending content to moderate</p>
                  {(filterStartDate || filterEndDate || filterProfession || filterOrganization || filterCountry || searchTerm) && (
                    <p className="mt-2 text-sm text-gray-400">Try adjusting your filters</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {currentItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                          <SubmissionDetailsCard 
                            submission={item}
                            showDocument={false}
                          />
                          
                          <div className="mt-4 flex flex-wrap gap-3">
                            {(item.file_url || item.pdf_url || item.document_url) && (
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowDocumentModal(true);
                                }}
                                className="inline-flex items-center text-sm text-primary hover:text-primary-dark"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Document
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setShowDetailsModal(true);
                              }}
                              className="inline-flex items-center text-sm text-primary hover:text-primary-dark"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View Full Details
                            </button>
                          </div>
                        </div>
                        <div className="flex space-x-2 sm:ml-4 self-end sm:self-start">
                          <button
                            onClick={() => handleModeration(activeTab, item.id, 'approved', item.originalTable)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                            title="Approve"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              if (activeTab === 'submissions') {
                                setSelectedItem(item);
                                setShowFeedbackModal(true);
                              } else {
                                handleModeration(activeTab, item.id, 'rejected');
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                            title="Reject"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showDocumentModal && selectedItem && (
        <DocumentModal
          isOpen={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
          documentUrl={selectedItem.file_url || selectedItem.pdf_url || selectedItem.document_url}
          title={selectedItem.title || selectedItem.case_filed || "Document Preview"}
        />
      )}
      
      <RejectionModal
        isOpen={showFeedbackModal}
        onClose={() => {
          setShowFeedbackModal(false);
          setSelectedItem(null);
        }}
        selectedItem={selectedItem}
        onReject={handleRejection}
        loading={loading}
      />
      
      {showDetailsModal && selectedItem && (
        <SubmissionDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedItem(null);
          }}
          submission={selectedItem}
        />
      )}
    </div>
  );
};

export default ModerationPage;
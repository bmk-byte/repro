import React from 'react';
import { Search, Filter, ChevronDown, ChevronUp, X, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import CaseCard from './CaseCard';
import CaseDetails from './CaseDetails';
import EditCaseModal from './EditCaseModal';
import { useModeratorStatus } from '../hooks/useModeratorStatus';
import { sanitizeSearchTerm } from '../lib/sanitize';
import { RESTRICTED_ORGANIZATIONS } from '../constants/organizations';

interface CasesPageProps {
  userProfile?: any;
}

const CasesPage: React.FC<CasesPageProps> = ({ userProfile }) => {
  const [cases, setCases] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCase, setSelectedCase] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState({
    status: '',
    type: '',
    country: '',
    category: '',
    partner: ''
  });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCases, setTotalCases] = React.useState(0);
  const [selectedCaseForEdit, setSelectedCaseForEdit] = React.useState<any>(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [countries, setCountries] = React.useState<{id: string, name: string}[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [partners, setPartners] = React.useState<string[]>([]);
  const [userOrganization, setUserOrganization] = React.useState<string | null>(null);
  const [isAfyanahakiModerator, setIsAfyanahakiModerator] = React.useState(false);
  const [accessScope, setAccessScope] = React.useState<'global' | 'organization'>('global');
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  // Use the custom hook for moderator status
  const { isModerator } = useModeratorStatus();

  React.useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization, email, is_moderator')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            setUserOrganization(profile.organization);
            const isAfyanahaki = profile.is_moderator && (profile.email?.endsWith('@afyanahaki.org') || false);
            setIsAfyanahakiModerator(isAfyanahaki);

            // If afyanahaki or not a moderator, user has global access
            // If restricted organization moderator, user has organization-only access
            if (isAfyanahaki || !profile.is_moderator) {
              setAccessScope('global');
            } else if (RESTRICTED_ORGANIZATIONS.includes(profile.organization || '')) {
              setAccessScope('organization');
            } else {
              setAccessScope('global');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        toast.error('Failed to load your profile. Some access controls may not apply correctly.');
      }
    };

    fetchUserInfo();
    fetchFilterOptions();
  }, []);

  React.useEffect(() => {
    fetchCases();
  }, [filters, currentPage]);

  React.useEffect(() => {
    // Reset to first page when filters change
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchCases();
    }
  }, [searchTerm]);

  // Set up real-time subscription for new cases
  React.useEffect(() => {
    // Subscribe to INSERT events on the cases table (only litigation cases)
    const subscription = supabase
      .channel('cases-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cases',
          filter: 'moderation_status=eq.approved,case_type=eq.litigation'
        },
        (payload) => {
          console.log('New case inserted:', payload);
          // Refresh the cases list when a new case is inserted
          fetchCases();
          toast.success('New case has been added');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cases',
          filter: 'moderation_status=eq.approved,case_type=eq.litigation'
        },
        (payload) => {
          console.log('Case updated:', payload);
          // Refresh the cases list when a case is updated
          fetchCases();
        }
      )
      .subscribe();

    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchFilterOptions = async () => {
    try {
      // Fetch countries
      const { data: countriesData, error: countriesError } = await supabase
        .from('countries')
        .select('id, name')
        .order('name');
      
      if (countriesError) throw countriesError;
      setCountries(countriesData || []);

      // Fetch case categories (only from litigation cases)
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('case_categories')
        .eq('case_type', 'litigation')
        .not('case_categories', 'is', null);
      
      if (casesError) throw casesError;
      
      // Flatten and get unique categories
      const allCategories = casesData?.flatMap(c => c.case_categories || []) || [];
      const uniqueCategories = Array.from(new Set(allCategories));
      setCategories(uniqueCategories);

      // Fetch partner organizations (only from litigation cases)
      const { data: partnersData, error: partnersError } = await supabase
        .from('cases')
        .select('partner')
        .eq('case_type', 'litigation')
        .not('partner', 'is', null);
        
      if (partnersError) throw partnersError;
      
      // Get unique partners
      const allPartners = partnersData?.map(p => p.partner).filter(Boolean) || [];
      const uniquePartners = Array.from(new Set(allPartners));
      setPartners(uniquePartners);
    } catch (error) {
      console.error('Error fetching filter options:', error);
      toast.error('Failed to load filter options');
    }
  };

  const fetchCases = async () => {
    try {
      setLoading(true);
      setFetchError(null);

      let query = supabase
        .from('cases')
        .select(`
          id,
          case_filed,
          created_at,
          status,
          case_type,
          priority_level,
          rapid_response_stage,
          case_categories,
          partner,
          countries (name),
          user_id
        `, { count: 'exact' })
        .eq('case_type', 'litigation')
        .eq('moderation_status', 'approved');

      // Access control is enforced by RLS policies at the database level.
      // No client-side user_id filtering needed — RLS already restricts
      // regular users and restricted-org moderators to their own cases,
      // while other moderators and afyanahaki moderators see all cases.

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.type) {
        query = query.eq('case_type', filters.type);
      }
      if (filters.country) {
        query = query.eq('country_id', filters.country);
      }
      if (filters.category) {
        query = query.contains('case_categories', [filters.category]);
      }
      if (filters.partner) {
        query = query.eq('partner', filters.partner);
      }

      // Apply search term
      if (searchTerm) {
        const sanitized = sanitizeSearchTerm(searchTerm);
        query = query.or(`case_filed.ilike.%${sanitized}%,case_summary.ilike.%${sanitized}%`);
      }

      // Apply pagination
      const PAGE_SIZE = 9; // Number of cases per page
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      setCases(data || []);

      // Calculate total pages
      if (count !== null) {
        setTotalCases(count);
        setTotalPages(Math.ceil(count / PAGE_SIZE));
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast.error('Failed to load cases');
      setFetchError('Unable to load cases. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCase = (caseData: any) => {
    setSelectedCaseForEdit(caseData);
    setShowEditModal(true);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      type: '',
      country: '',
      category: '',
      partner: ''
    });
    setSearchTerm('');
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 3; // Reduced for mobile
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 mx-1 rounded-md ${
            currentPage === i
              ? 'bg-primary text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          {i}
        </button>
      );
    }
    
    return (
      <div className="flex items-center justify-center mt-8 flex-wrap gap-2">
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="px-3 py-1 mx-1 rounded-md bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          First
        </button>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 mx-1 rounded-md bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        {pages}
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 mx-1 rounded-md bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 mx-1 rounded-md bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Last
        </button>
      </div>
    );
  };

  if (selectedCase) {
    return (
      <CaseDetails
        caseId={selectedCase}
        onBack={() => setSelectedCase(null)}
        isModerator={isModerator}
        onEditCase={handleEditCase}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Cases</h1>
        <p className="mt-2 text-gray-600">Browse and manage litigation cases submitted through the case upload form</p>
        {accessScope === 'organization' && userOrganization && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              You are viewing cases uploaded by <strong>{userOrganization}</strong> only. Cases from other organizations are not visible.
            </p>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search cases by title or summary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Litigation</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  value={filters.country}
                  onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Countries</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>{country.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Partner</label>
                <select
                  value={filters.partner}
                  onChange={(e) => setFilters(prev => ({ ...prev, partner: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Partners</option>
                  {partners.map(partner => (
                    <option key={partner} value={partner}>{partner}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Active filters */}
            {(filters.status || filters.type || filters.country || filters.category || filters.partner || searchTerm) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {searchTerm && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Search: {searchTerm}
                    <button onClick={() => setSearchTerm('')} className="ml-1 text-blue-600 hover:text-blue-800">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                {filters.status && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Status: {filters.status}
                    <button onClick={() => setFilters(prev => ({ ...prev, status: '' }))} className="ml-1 text-green-600 hover:text-green-800">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                {filters.type && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Type: {filters.type}
                    <button onClick={() => setFilters(prev => ({ ...prev, type: '' }))} className="ml-1 text-purple-600 hover:text-purple-800">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                {filters.country && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Country: {countries.find(c => c.id === filters.country)?.name}
                    <button onClick={() => setFilters(prev => ({ ...prev, country: '' }))} className="ml-1 text-yellow-600 hover:text-yellow-800">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                {filters.category && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Category: {filters.category}
                    <button onClick={() => setFilters(prev => ({ ...prev, category: '' }))} className="ml-1 text-red-600 hover:text-red-800">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {filters.partner && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    Partner: {filters.partner}
                    <button onClick={() => setFilters(prev => ({ ...prev, partner: '' }))} className="ml-1 text-indigo-600 hover:text-indigo-800">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cases Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : fetchError ? (
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-400" />
          </div>
          <p className="text-gray-700 font-medium mb-2">Failed to load cases</p>
          <p className="text-gray-500 text-sm mb-4">{fetchError}</p>
          <button
            onClick={fetchCases}
            className="text-primary hover:text-primary-dark text-sm font-medium"
          >
            Try again
          </button>
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchTerm || filters.status || filters.type || filters.country || filters.category || filters.partner
              ? 'No cases found matching your criteria'
              : 'No cases found'}
          </p>
          {(searchTerm || filters.status || filters.type || filters.country || filters.category || filters.partner) && (
            <button
              onClick={clearFilters}
              className="mt-4 text-primary hover:text-primary-dark"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((caseItem) => (
              <CaseCard
                key={caseItem.id}
                caseData={caseItem}
                onClick={() => setSelectedCase(caseItem.id)}
              />
            ))}
          </div>
          
          {/* Pagination */}
          {renderPagination()}
          
          {/* Results count */}
          <div className="text-center mt-4 text-sm text-gray-500">
            Showing {(currentPage - 1) * 9 + 1} to {Math.min(currentPage * 9, totalCases)} of {totalCases} cases
          </div>
        </>
      )}

      {/* Edit Case Modal */}
      {showEditModal && selectedCaseForEdit && (
        <EditCaseModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCaseForEdit(null);
          }}
          caseData={selectedCaseForEdit}
          onUpdate={fetchCases}
        />
      )}
    </div>
  );
};

export default CasesPage;
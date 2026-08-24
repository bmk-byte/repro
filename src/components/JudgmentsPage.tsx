import React from 'react';
import { Search, Filter, ChevronDown, ChevronUp, X, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import JudgmentCard from './JudgmentCard';
import JudgmentDetails from './JudgmentDetails';
import { useModeratorStatus } from '../hooks/useModeratorStatus';
import { sanitizeSearchTerm } from '../lib/sanitize';

const JudgmentsPage = () => {
  const [judgments, setJudgments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedJudgment, setSelectedJudgment] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState({
    court: '',
    type: '',
    country: '',
    language: '',
    year: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [countries, setCountries] = React.useState<{id: string, name: string}[]>([]);
  const [courts, setCourts] = React.useState<string[]>([]);
  const [languages, setLanguages] = React.useState<string[]>(['English', 'French', 'Portuguese', 'Swahili']);
  const [years, setYears] = React.useState<number[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalJudgments, setTotalJudgments] = React.useState(0);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  // Use the custom hook for moderator status
  const { isModerator } = useModeratorStatus();

  React.useEffect(() => {
    fetchFilterOptions();
  }, []);

  React.useEffect(() => {
    fetchJudgments();
  }, [filters, currentPage]);

  React.useEffect(() => {
    // Reset to first page when search term changes
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchJudgments();
    }
  }, [searchTerm]);

  // Set up real-time subscription for new judgments
  React.useEffect(() => {
    // Subscribe to INSERT events on the judgments table
    const subscription = supabase
      .channel('judgments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'judgments'
        },
        (payload) => {
          console.log('New judgment inserted:', payload);
          // Refresh the judgments list when a new judgment is inserted
          fetchJudgments();
          toast.success('New judgment has been added');
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

      // Fetch unique courts
      const { data: courtsData, error: courtsError } = await supabase
        .from('judgments')
        .select('court')
        .not('court', 'is', null);
      
      if (courtsError) throw courtsError;
      
      const uniqueCourts = Array.from(new Set(courtsData.map(item => item.court))).filter(Boolean).sort();
      setCourts(uniqueCourts);

      // Get unique years from judgment_date
      const { data: yearsData, error: yearsError } = await supabase
        .from('judgments')
        .select('judgment_date');
      
      if (yearsError) throw yearsError;
      
      const uniqueYears = Array.from(
        new Set(
          yearsData
            .map(item => new Date(item.judgment_date).getFullYear())
            .filter(year => !isNaN(year))
        )
      ).sort((a, b) => b - a); // Sort descending
      
      setYears(uniqueYears);
    } catch (error) {
      console.error('Error fetching filter options:', error);
      toast.error('Failed to load filter options');
    }
  };

  const fetchJudgments = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      
      const PAGE_SIZE = 9; // Number of judgments per page
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      let query = supabase
        .from('judgments')
        .select(`
          id,
          citation,
          court,
          judgment_date,
          type,
          countries (name)
        `, { count: 'exact' });

      // Apply filters
      if (filters.court) {
        query = query.eq('court', filters.court);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.country) {
        query = query.eq('country_id', filters.country);
      }
      if (filters.language) {
        query = query.eq('language', filters.language);
      }
      if (filters.year) {
        const year = parseInt(filters.year);
        const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
        const endDate = new Date(year, 11, 31).toISOString().split('T')[0];
        query = query.gte('judgment_date', startDate).lte('judgment_date', endDate);
      }

      // Apply search term
      if (searchTerm) {
        const sanitized = sanitizeSearchTerm(searchTerm);
        query = query.or(`citation.ilike.%${sanitized}%,media_neutral_citation.ilike.%${sanitized}%,case_summary.ilike.%${sanitized}%,flynote.ilike.%${sanitized}%`);
      }

      // Apply pagination and ordering
      query = query
        .order('judgment_date', { ascending: false })
        .range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;
      
      setJudgments(data || []);
      
      // Calculate total pages
      if (count !== null) {
        setTotalJudgments(count);
        setTotalPages(Math.ceil(count / PAGE_SIZE));
      }
    } catch (error) {
      console.error('Error fetching judgments:', error);
      toast.error('Failed to load judgments');
      setFetchError('Unable to load judgments. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setFilters({
      court: '',
      type: '',
      country: '',
      language: '',
      year: ''
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

  if (selectedJudgment) {
    return (
      <JudgmentDetails
        judgmentId={selectedJudgment}
        onBack={() => setSelectedJudgment(null)}
        isModerator={isModerator}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Judgments</h1>
        <p className="mt-2 text-gray-600">Browse and search legal judgments</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search judgments by citation, summary, or flynote..."
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
          <div className="mt-4 p-4 bg-white rounded-lg shadow-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Court</label>
                <select
                  value={filters.court}
                  onChange={(e) => setFilters(prev => ({ ...prev, court: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Courts</option>
                  {courts.map(court => (
                    <option key={court} value={court}>{court}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Types</option>
                  <option value="Final Judgment">Final Judgment</option>
                  <option value="Interim Order">Interim Order</option>
                  <option value="Ruling">Ruling</option>
                  <option value="Consent Judgment">Consent Judgment</option>
                  <option value="Default Judgment">Default Judgment</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Languages</option>
                  {languages.map(language => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={filters.year}
                  onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Active filters */}
            {(filters.court || filters.type || filters.country || filters.language || filters.year || searchTerm) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {searchTerm && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Search: {searchTerm}
                    <button onClick={() => setSearchTerm('')} className="ml-1 text-blue-600 hover:text-blue-800">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                {filters.court && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Court: {filters.court}
                    <button onClick={() => setFilters(prev => ({ ...prev, court: '' }))} className="ml-1 text-green-600 hover:text-green-800">
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
                
                {filters.language && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Language: {filters.language}
                    <button onClick={() => setFilters(prev => ({ ...prev, language: '' }))} className="ml-1 text-red-600 hover:text-red-800">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                {filters.year && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    Year: {filters.year}
                    <button onClick={() => setFilters(prev => ({ ...prev, year: '' }))} className="ml-1 text-indigo-600 hover:text-indigo-800">
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

      {/* Judgments Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : fetchError ? (
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-400" />
          </div>
          <p className="text-gray-700 font-medium mb-2">Failed to load judgments</p>
          <p className="text-gray-500 text-sm mb-4">{fetchError}</p>
          <button
            onClick={fetchJudgments}
            className="text-primary hover:text-primary-dark text-sm font-medium"
          >
            Try again
          </button>
        </div>
      ) : judgments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchTerm || filters.court || filters.type || filters.country || filters.language || filters.year
              ? 'No judgments found matching your criteria'
              : 'No judgments found'}
          </p>
          {(searchTerm || filters.court || filters.type || filters.country || filters.language || filters.year) && (
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
            {judgments.map((judgment) => (
              <JudgmentCard
                key={judgment.id}
                judgment={judgment}
                onClick={() => setSelectedJudgment(judgment.id)}
              />
            ))}
          </div>
          
          {/* Pagination */}
          {renderPagination()}
          
          {/* Results count */}
          <div className="text-center mt-4 text-sm text-gray-500">
            Showing {(currentPage - 1) * 9 + 1} to {Math.min(currentPage * 9, totalJudgments)} of {totalJudgments} judgments
          </div>
        </>
      )}
    </div>
  );
};

export default JudgmentsPage;
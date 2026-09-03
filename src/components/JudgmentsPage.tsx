import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, ChevronDown, ChevronUp, X, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import JudgmentCard from './JudgmentCard';
import JudgmentDetails from './JudgmentDetails';
import { useModeratorStatus } from '../hooks/useModeratorStatus';
import { sanitizeSearchTerm } from '../lib/sanitize';
import { Button, Select, Badge, EmptyState, SkeletonCard } from './ui';

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

const JudgmentsPage = () => {
  const { t } = useTranslation();
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
  const [languages, setLanguages] = React.useState<string[]>([]);
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
          devLog('New judgment inserted:', payload);
          // Refresh the judgments list when a new judgment is inserted
          fetchJudgments();
          toast.success(t('judgments.newJudgmentAdded'));
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

      // Fetch unique languages
      const { data: languagesData, error: languagesError } = await supabase
        .from('judgments')
        .select('language')
        .not('language', 'is', null);

      if (languagesError) throw languagesError;

      const uniqueLanguages = Array.from(new Set(languagesData.map(item => item.language))).filter(Boolean).sort();
      setLanguages(uniqueLanguages);

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
      toast.error(t('common.failedToLoadFilterOptions'));
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
      toast.error(t('judgments.failedToLoad'));
      setFetchError(t('judgments.unableToLoad'));
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
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          size="sm"
          variant={currentPage === i ? 'primary' : 'outline'}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      );
    }

    return (
      <div className="flex items-center justify-center mt-8 flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => handlePageChange(1)} disabled={currentPage === 1}>
          {t('common.first')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
          {t('common.previous')}
        </Button>

        {pages}

        <Button size="sm" variant="outline" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          {t('common.next')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>
          {t('common.last')}
        </Button>
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
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900">{t('judgments.title')}</h1>
        <p className="mt-2 text-stone-600">{t('judgments.subtitle')}</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <label htmlFor="judgments-search" className="sr-only">{t('judgments.searchLabel')}</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
            <input
              id="judgments-search"
              type="text"
              placeholder={t('judgments.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            aria-expanded={showAdvancedFilters}
            icon={<Filter className="h-4 w-4" />}
          >
            {t('common.filters')}
            {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow-card border border-stone-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Select
                label={t('common.courtLabel')}
                value={filters.court}
                onChange={(e) => setFilters(prev => ({ ...prev, court: e.target.value }))}
              >
                <option value="">{t('common.allCourts')}</option>
                {courts.map(court => (
                  <option key={court} value={court}>{court}</option>
                ))}
              </Select>

              <Select
                label={t('common.typeLabel')}
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="">{t('common.allTypes')}</option>
                <option value="Final Judgment">{t('judgments.typeFinalJudgment')}</option>
                <option value="Interim Order">{t('judgments.typeInterimOrder')}</option>
                <option value="Ruling">{t('judgments.typeRuling')}</option>
                <option value="Consent Judgment">{t('judgments.typeConsentJudgment')}</option>
                <option value="Default Judgment">{t('judgments.typeDefaultJudgment')}</option>
              </Select>

              <Select
                label={t('common.countryLabel')}
                value={filters.country}
                onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
              >
                <option value="">{t('common.allCountries')}</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </Select>

              <Select
                label={t('common.languageLabel')}
                value={filters.language}
                onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
              >
                <option value="">{t('common.allLanguages')}</option>
                {languages.map(language => (
                  <option key={language} value={language}>{language}</option>
                ))}
              </Select>

              <Select
                label={t('common.yearLabel')}
                value={filters.year}
                onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
              >
                <option value="">{t('common.allYears')}</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Select>
            </div>

            {/* Active filters */}
            {(filters.court || filters.type || filters.country || filters.language || filters.year || searchTerm) && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {searchTerm && (
                  <Badge tone="primary">
                    {t('common.search', { term: searchTerm })}
                    <button onClick={() => setSearchTerm('')} aria-label={t('common.clearSearchFilter')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}

                {filters.court && (
                  <Badge tone="primary">
                    {t('common.court', { value: filters.court })}
                    <button onClick={() => setFilters(prev => ({ ...prev, court: '' }))} aria-label={t('common.clearCourtFilter')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}

                {filters.type && (
                  <Badge tone="primary">
                    {t('common.type', { value: filters.type })}
                    <button onClick={() => setFilters(prev => ({ ...prev, type: '' }))} aria-label={t('common.clearTypeFilter')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}

                {filters.country && (
                  <Badge tone="primary">
                    {t('common.country', { value: countries.find(c => c.id === filters.country)?.name })}
                    <button onClick={() => setFilters(prev => ({ ...prev, country: '' }))} aria-label={t('common.clearCountryFilter')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}

                {filters.language && (
                  <Badge tone="primary">
                    {t('common.language', { value: filters.language })}
                    <button onClick={() => setFilters(prev => ({ ...prev, language: '' }))} aria-label={t('common.clearLanguageFilter')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}

                {filters.year && (
                  <Badge tone="primary">
                    {t('common.year', { value: filters.year })}
                    <button onClick={() => setFilters(prev => ({ ...prev, year: '' }))} aria-label={t('common.clearYearFilter')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}

                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  {t('common.clearAllFilters')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Judgments Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : fetchError ? (
        <EmptyState
          icon={<AlertCircle className="h-12 w-12" />}
          title={t('judgments.failedToLoad')}
          description={fetchError}
          action={<Button variant="outline" onClick={fetchJudgments}>{t('common.tryAgain')}</Button>}
        />
      ) : judgments.length === 0 ? (
        <EmptyState
          title={
            searchTerm || filters.court || filters.type || filters.country || filters.language || filters.year
              ? t('judgments.noJudgmentsMatchCriteria')
              : t('judgments.noJudgmentsFound')
          }
          action={
            (searchTerm || filters.court || filters.type || filters.country || filters.language || filters.year) && (
              <Button variant="outline" onClick={clearFilters}>{t('common.clearFilters')}</Button>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {judgments.map((judgment) => (
              <JudgmentCard
                key={judgment.id}
                judgment={judgment}
                onClick={setSelectedJudgment}
              />
            ))}
          </div>

          {/* Pagination */}
          {renderPagination()}

          {/* Results count */}
          <div className="text-center mt-4 text-sm text-stone-500">
            {t('judgments.showingResults', { from: (currentPage - 1) * 9 + 1, to: Math.min(currentPage * 9, totalJudgments), total: totalJudgments })}
          </div>
        </>
      )}
    </div>
  );
};

export default JudgmentsPage;
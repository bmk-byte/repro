import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, ChevronDown, ChevronUp, X, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import CaseCard from './CaseCard';
import CaseDetails from './CaseDetails';
import EditCaseModal from './EditCaseModal';
import { useModeratorStatus } from '../hooks/useModeratorStatus';
import { RESTRICTED_ORGANIZATIONS } from '../constants/organizations';
import { fetchCountries } from '../lib/data/countries';
import { fetchLitigationCases, fetchCaseFilterOptions } from '../lib/data/cases';
import { Button, Select, Badge, EmptyState, SkeletonCard } from './ui';

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

interface CasesPageProps {
  userProfile?: any;
}

const CasesPage: React.FC<CasesPageProps> = ({ userProfile }) => {
  const { t } = useTranslation();
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
        toast.error(t('cases.failedToLoadProfile'));
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
          devLog('New case inserted:', payload);
          // Refresh the cases list when a new case is inserted
          fetchCases();
          toast.success(t('cases.newCaseAdded'));
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
          devLog('Case updated:', payload);
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
    const [{ data: countriesData, error: countriesError }, { data: options, error: optionsError }] = await Promise.all([
      fetchCountries(),
      fetchCaseFilterOptions(),
    ]);

    if (countriesError || optionsError) {
      console.error('Error fetching filter options:', countriesError ?? optionsError);
      toast.error(t('common.failedToLoadFilterOptions'));
      return;
    }

    setCountries(countriesData ?? []);
    setCategories(options?.categories ?? []);
    setPartners(options?.partners ?? []);
  };

  const fetchCases = async () => {
    setLoading(true);
    setFetchError(null);

    // Access control is enforced by RLS policies at the database level.
    // No client-side user_id filtering needed — RLS already restricts
    // regular users and restricted-org moderators to their own cases,
    // while other moderators and afyanahaki moderators see all cases.
    const PAGE_SIZE = 9; // Number of cases per page
    const { data, count, error } = await fetchLitigationCases(filters, searchTerm, currentPage, PAGE_SIZE);

    if (error) {
      console.error('Error fetching cases:', error);
      toast.error(t('cases.failedToLoad'));
      setFetchError(t('cases.unableToLoad'));
      setLoading(false);
      return;
    }

    setCases(data ?? []);

    if (count !== null) {
      setTotalCases(count);
      setTotalPages(Math.ceil(count / PAGE_SIZE));
    }
    setLoading(false);
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
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900">{t('cases.title')}</h1>
        <p className="mt-2 text-stone-600">{t('cases.subtitle')}</p>
        {accessScope === 'organization' && userOrganization && (
          <div className="mt-3 p-3 bg-info-light border border-info/20 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
            <p className="text-sm text-info-dark">
              {t('cases.orgScopeNotice', { organization: userOrganization })}
            </p>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <label htmlFor="cases-search" className="sr-only">{t('cases.searchLabel')}</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
            <input
              id="cases-search"
              type="text"
              placeholder={t('cases.searchPlaceholder')}
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
                label={t('common.statusLabel')}
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">{t('common.allStatuses')}</option>
                <option value="pending">{t('common.statusPending')}</option>
                <option value="in_progress">{t('common.statusInProgress')}</option>
                <option value="completed">{t('common.statusCompleted')}</option>
                <option value="on_hold">{t('common.statusOnHold')}</option>
              </Select>

              <Select
                label={t('common.typeLabel')}
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="">{t('cases.litigation')}</option>
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
                label={t('common.categoryLabel')}
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">{t('common.allCategories')}</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>

              <Select
                label={t('common.partnerLabel')}
                value={filters.partner}
                onChange={(e) => setFilters(prev => ({ ...prev, partner: e.target.value }))}
              >
                <option value="">{t('common.allPartners')}</option>
                {partners.map(partner => (
                  <option key={partner} value={partner}>{partner}</option>
                ))}
              </Select>
            </div>

            {/* Active filters */}
            {(filters.status || filters.type || filters.country || filters.category || filters.partner || searchTerm) && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {searchTerm && (
                  <Badge tone="primary">
                    {t('common.search', { term: searchTerm })}
                    <button onClick={() => setSearchTerm('')} aria-label={t('common.clearSearchFilter')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}

                {filters.status && (
                  <Badge tone="primary">
                    {t('common.status', { value: filters.status })}
                    <button onClick={() => setFilters(prev => ({ ...prev, status: '' }))} aria-label={t('common.clearStatusFilter')} className="ml-1">
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

                {filters.category && (
                  <Badge tone="primary">
                    {t('common.category', { value: filters.category })}
                    <button onClick={() => setFilters(prev => ({ ...prev, category: '' }))} aria-label={t('common.clearCategoryFilter')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}

                {filters.partner && (
                  <Badge tone="primary">
                    {t('common.partner', { value: filters.partner })}
                    <button onClick={() => setFilters(prev => ({ ...prev, partner: '' }))} aria-label={t('common.clearPartnerFilter')} className="ml-1">
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

      {/* Cases Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : fetchError ? (
        <EmptyState
          icon={<AlertCircle className="h-12 w-12" />}
          title={t('cases.failedToLoad')}
          description={fetchError}
          action={<Button variant="outline" onClick={fetchCases}>{t('common.tryAgain')}</Button>}
        />
      ) : cases.length === 0 ? (
        <EmptyState
          title={
            searchTerm || filters.status || filters.type || filters.country || filters.category || filters.partner
              ? t('cases.noCasesMatchCriteria')
              : t('cases.noCasesFound')
          }
          action={
            (searchTerm || filters.status || filters.type || filters.country || filters.category || filters.partner) && (
              <Button variant="outline" onClick={clearFilters}>{t('common.clearFilters')}</Button>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((caseItem) => (
              <CaseCard
                key={caseItem.id}
                caseData={caseItem}
                onClick={setSelectedCase}
              />
            ))}
          </div>

          {/* Pagination */}
          {renderPagination()}

          {/* Results count */}
          <div className="text-center mt-4 text-sm text-stone-500">
            {t('cases.showingResults', { from: (currentPage - 1) * 9 + 1, to: Math.min(currentPage * 9, totalCases), total: totalCases })}
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
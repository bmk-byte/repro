import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, TriangleAlert as AlertTriangle, FileText, ChevronDown, ChevronUp, X, Shield, CircleAlert as AlertCircle, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sanitizeOrFilterTerm } from '../lib/sanitize';
import { toast } from '../lib/toast';
import RapidResponseCaseForm from './RapidResponseCaseForm';
import RapidResponseCaseDetails from './RapidResponseCaseDetails';
import RapidResponseDashboard from './RapidResponseDashboard';
import { useModeratorStatus } from '../hooks/useModeratorStatus';
import { can } from '../lib/permissions';
import { LoadingState, Badge } from './ui';
import type { BadgeProps } from './ui';

const RESTRICTED_ORGANIZATIONS = [
  'Women with a Mission',
  'Islamic Women\'s Initiative for Justice Law and Peace',
  'SPRINGS PUBLIC INTEREST HUB',
  'Center for Health, Human Rights and Development',
  'THE AFRICAN INSTITUTE FOR INVESTIGATIVE JOURNALISM',
  'Centre for Women Justice Uganda',
  'FEMME FORTE',
  'Ubuntu Justice center',
  'Dumaic Global Health'
];

const PAGE_SIZE = 50;

const RapidResponseCasesPage: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'list'>('dashboard');
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCase, setEditingCase] = useState<any>(null);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priority: '',
    status: '',
    category: '',
    partner: '', // Added partner filter
    country: '', // Filter by country
    myCases: false, // Filter for cases uploaded by current user
    dateRange: { start: '', end: '' },
    timePeriod: 'all' // Time-based filter: week, month, quarter, year, all
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCases, setTotalCases] = useState(0);
  const [teamMembers, setTeamMembers] = useState<{id: string, name: string}[]>([]);
  const [partnerOrganizations, setPartnerOrganizations] = useState<string[]>([]);
  const [countries, setCountries] = useState<{id: string, name: string}[]>([]);
  const [userOrganization, setUserOrganization] = useState<string | null>(null);
  const [accessScope, setAccessScope] = useState<'global' | 'organization'>('global');

  // Use the moderator status hook to check if the user is a moderator
  const { isModerator, isAdmin, loading: moderatorLoading, error: moderatorError } = useModeratorStatus();

  useEffect(() => {
    if (isModerator) {
      fetchCurrentUser();
      fetchTeamMembers();
      fetchPartnerOrganizations();
      fetchCountries();
      fetchCases();
    }
  }, [isModerator]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);

        // Fetch user's organization and access level
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
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  useEffect(() => {
    if (isModerator && view === 'list') {
      fetchCases();
    }
  }, [view, filters, isModerator, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, view]);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  const fetchPartnerOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('partner')
        .eq('case_type', 'rapid-response')
        .not('partner', 'is', null);

      if (error) throw error;

      // Extract unique partner organizations
      const partners = Array.from(new Set(data.map(item => item.partner).filter(Boolean)));
      setPartnerOrganizations(partners.sort());
    } catch (err) {
      console.error('Error fetching partner organizations:', err);
    }
  };

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCountries(data || []);
    } catch (err) {
      console.error('Error fetching countries:', err);
    }
  };

  // Calculate date range based on time period selection
  const getDateRangeFromTimePeriod = (timePeriod: string) => {
    const now = new Date();
    let startDate = '';

    switch (timePeriod) {
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo.toISOString();
        break;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        startDate = monthAgo.toISOString();
        break;
      }
      case 'quarter': {
        const quarterAgo = new Date(now);
        quarterAgo.setDate(now.getDate() - 90);
        startDate = quarterAgo.toISOString();
        break;
      }
      case 'year': {
        const yearAgo = new Date(now);
        yearAgo.setDate(now.getDate() - 365);
        startDate = yearAgo.toISOString();
        break;
      }
      case 'all':
      default:
        startDate = '';
        break;
    }

    return startDate;
  };

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('cases')
        .select(`
          id,
          case_filed,
          case_summary,
          case_type,
          status,
          created_at,
          priority_level,
          key_deadlines,
          client_name,
          client_email,
          client_phone,
          rapid_response_stage,
          case_categories,
          partner,
          countries (name),
          profiles:user_id (full_name, organization),
          user_id
        `, { count: 'exact' })
        .eq('case_type', 'rapid-response')
        .eq('moderation_status', 'approved');

      // Apply access control based on organization
      if (isModerator && RESTRICTED_ORGANIZATIONS.includes(userOrganization || '')) {
        // Restricted organization moderators can only see their own cases
        query = query.eq('user_id', currentUserId);
      } else if (!isModerator && currentUserId) {
        // Regular users can only see their own cases
        query = query.eq('user_id', currentUserId);
      }
      // afyanahaki.org moderators and other moderators see all cases (no additional filter needed)

      // Apply filters
      if (filters.priority) {
        query = query.eq('priority_level', filters.priority);
      }

      if (filters.status) {
        query = query.eq('rapid_response_stage', filters.status);
      }

      if (filters.category) {
        query = query.contains('case_categories', [filters.category]);
      }

      if (filters.partner) {
        query = query.eq('partner', filters.partner);
      }

      if (filters.country) {
        query = query.eq('country_id', filters.country);
      }

      if (filters.myCases && currentUserId) {
        query = query.eq('user_id', currentUserId);
      }

      // Apply time period filter (overrides custom date range if set)
      if (filters.timePeriod && filters.timePeriod !== 'all') {
        const startDate = getDateRangeFromTimePeriod(filters.timePeriod);
        if (startDate) {
          query = query.gte('created_at', startDate);
        }
      } else if (filters.dateRange.start || filters.dateRange.end) {
        // Use custom date range only if no time period is selected
        if (filters.dateRange.start) {
          query = query.gte('created_at', filters.dateRange.start);
        }

        if (filters.dateRange.end) {
          // Add one day to include the end date
          const endDate = new Date(filters.dateRange.end);
          endDate.setDate(endDate.getDate() + 1);
          query = query.lt('created_at', endDate.toISOString());
        }
      }

      // Apply search term
      if (searchTerm) {
        const term = sanitizeOrFilterTerm(searchTerm);
        query = query.or(`case_filed.ilike.%${term}%,case_summary.ilike.%${term}%,client_name.ilike.%${term}%`);
      }

      // Order by priority and creation date, and page through results —
      // mirrors the same count-then-range pagination CasesPage.tsx uses.
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      query = query
        .order('priority_level', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;
      setCases(data || []);

      if (count !== null) {
        setTotalCases(count);
        setTotalPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
      }
    } catch (err) {
      console.error('Error fetching rapid response cases:', err);
      setError('Failed to load rapid response cases');
      toast.error('Failed to load rapid response cases');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = () => {
    setShowForm(true);
    setEditingCase(null);
    setSelectedCase(null);
  };

  const handleEditCase = (caseData: any) => {
    setEditingCase(caseData);
    setShowForm(true);
    setSelectedCase(null);
  };

  const handleCaseCreated = () => {
    setShowForm(false);
    setEditingCase(null);
    fetchCases();
    toast.success(editingCase ? 'Rapid response case updated successfully' : 'Rapid response case created successfully');
  };

  const handleCaseClick = (caseId: string) => {
    setSelectedCase(caseId);
    setShowForm(false);
  };

  const handleBackToList = () => {
    setSelectedCase(null);
  };

  const handleClearFilters = () => {
    setFilters({
      priority: '',
      status: '',
      category: '',
      partner: '',
      country: '',
      myCases: false,
      dateRange: { start: '', end: '' },
      timePeriod: 'all'
    });
    setSearchTerm('');
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 3;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md ${
            currentPage === i
              ? 'bg-primary text-white'
              : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
          }`}
        >
          {i}
        </button>
      );
    }

    const navButtonClass = 'px-3 py-1.5 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed';

    return (
      <div className="p-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-sm text-stone-500">
          Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, totalCases)} of {totalCases} cases
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button className={navButtonClass} onClick={() => handlePageChange(1)} disabled={currentPage === 1}>First</button>
          <button className={navButtonClass} onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
          {pages}
          <button className={navButtonClass} onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
          <button className={navButtonClass} onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}>Last</button>
        </div>
      </div>
    );
  };

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

  const getCategoryColor = (category: string) => {
    if (!category) return 'bg-stone-100 text-stone-800';
    
    if (category.includes('Abortion')) return 'bg-stone-100 text-stone-800';
    if (category.includes('Rape')) return 'bg-danger-light text-danger-dark';
    if (category.includes('Defilement')) return 'bg-stone-100 text-stone-800';
    if (category.includes('SGBV')) return 'bg-warning-light text-warning-dark';
    if (category.includes('Incest')) return 'bg-stone-100 text-stone-800';
    
    return 'bg-stone-100 text-stone-800';
  };

  const exportToCSV = () => {
    if (cases.length === 0) {
      toast.error('No cases to export');
      return;
    }

    const escape = (val: unknown) => {
      const str = val == null ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const headers = [
      'Case Title', 'Summary', 'Priority', 'Status', 'Stage',
      'Category', 'Partner', 'Country', 'Date Filed',
      'Submitted By', 'Organization'
    ];

    const rows = cases.map(c => [
      escape(c.case_filed),
      escape(c.case_summary),
      escape(c.priority_level),
      escape(c.status),
      escape(c.rapid_response_stage),
      escape(Array.isArray(c.case_categories) ? c.case_categories.join('; ') : c.case_categories),
      escape(c.partner),
      escape(c.countries?.name),
      escape(c.created_at ? new Date(c.created_at).toLocaleDateString() : ''),
      escape(c.profiles?.full_name),
      escape(c.profiles?.organization),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapid-response-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${cases.length} case${cases.length !== 1 ? 's' : ''}`);
  };

  const renderContent = () => {
    if (selectedCase) {
      return (
        <RapidResponseCaseDetails
          caseId={selectedCase}
          onBack={handleBackToList}
          onUpdate={fetchCases}
          isModerator={isModerator}
          onEditCase={handleEditCase}
          currentUserId={currentUserId}
        />
      );
    }

    if (showForm) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-stone-900 mb-6">
            {editingCase ? 'Edit Rapid Response Case' : 'Create Rapid Response Case'}
          </h2>
          <RapidResponseCaseForm
            onSuccess={handleCaseCreated}
            onCancel={() => {
              setShowForm(false);
              setEditingCase(null);
            }}
            caseData={editingCase}
            teamMembers={teamMembers}
          />
        </div>
      );
    }

    if (view === 'dashboard') {
      return (
        <RapidResponseDashboard 
          onViewAllCases={() => setView('list')}
          onCreateCase={handleCreateCase}
          onCaseClick={handleCaseClick}
        />
      );
    }

    return (
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="text"
                placeholder="Search cases by title, description, or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                onClick={exportToCSV}
                title="Export the current page of results to CSV"
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button
                onClick={handleCreateCase}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark"
              >
                <Plus className="h-4 w-4" />
                <span>New Case</span>
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 space-y-4">
              {/* Time Period Filter */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Time Period</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, timePeriod: 'week' }))}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      filters.timePeriod === 'week'
                        ? 'bg-primary text-white'
                        : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, timePeriod: 'month' }))}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      filters.timePeriod === 'month'
                        ? 'bg-primary text-white'
                        : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, timePeriod: 'quarter' }))}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      filters.timePeriod === 'quarter'
                        ? 'bg-primary text-white'
                        : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    This Quarter
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, timePeriod: 'year' }))}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      filters.timePeriod === 'year'
                        ? 'bg-primary text-white'
                        : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    This Year
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, timePeriod: 'all' }))}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      filters.timePeriod === 'all'
                        ? 'bg-primary text-white'
                        : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    All Time
                  </button>
                </div>
              </div>

              {/* Other Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Priorities</option>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Statuses</option>
                  <option value="intake">Intake</option>
                  <option value="review">Review</option>
                  <option value="action">Action</option>
                  <option value="resolution">Resolution</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Partner Organization</label>
                <select
                  value={filters.partner}
                  onChange={(e) => setFilters(prev => ({ ...prev, partner: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Partners</option>
                  {partnerOrganizations.map(partner => (
                    <option key={partner} value={partner}>{partner}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Country</label>
                <select
                  value={filters.country}
                  onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Countries</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>{country.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Categories</option>
                  <option value="Abortion">Abortion</option>
                  <option value="Rape">Rape</option>
                  <option value="Defilement">Defilement</option>
                  <option value="SGBV (Sexual and Gender-Based Violence)">SGBV</option>
                  <option value="Incest">Incest</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Case Owner</label>
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    id="myCases"
                    checked={filters.myCases}
                    onChange={(e) => setFilters(prev => ({ ...prev, myCases: e.target.checked }))}
                    className="h-4 w-4 text-primary focus:ring-primary border-stone-300 rounded"
                  />
                  <label htmlFor="myCases" className="text-sm text-stone-700 cursor-pointer">
                    Show only my cases
                  </label>
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, start: e.target.value } 
                    }))}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, end: e.target.value } 
                    }))}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              </div>
            </div>
          )}

          {/* Active filters */}
          {(filters.priority || filters.status || filters.category || filters.partner || filters.country || filters.myCases || filters.dateRange.start || filters.dateRange.end || filters.timePeriod !== 'all' || searchTerm) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {searchTerm && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info-light text-info-dark">
                  Search: {searchTerm}
                  <button onClick={() => setSearchTerm('')} className="ml-1 text-info hover:text-info-dark">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.timePeriod !== 'all' && (
                <Badge tone="primary">
                  Time: {filters.timePeriod === 'week' ? 'This Week' : filters.timePeriod === 'month' ? 'This Month' : filters.timePeriod === 'quarter' ? 'This Quarter' : 'This Year'}
                  <button onClick={() => setFilters(prev => ({ ...prev, timePeriod: 'all' }))} aria-label="Clear time period filter" className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.priority && (
                <Badge tone="primary">
                  Priority: {filters.priority}
                  <button onClick={() => setFilters(prev => ({ ...prev, priority: '' }))} aria-label="Clear priority filter" className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.status && (
                <Badge tone="primary">
                  Status: {filters.status}
                  <button onClick={() => setFilters(prev => ({ ...prev, status: '' }))} aria-label="Clear status filter" className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.partner && (
                <Badge tone="primary">
                  Partner: {filters.partner}
                  <button onClick={() => setFilters(prev => ({ ...prev, partner: '' }))} aria-label="Clear partner filter" className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.country && (
                <Badge tone="primary">
                  Country: {countries.find(c => c.id === filters.country)?.name || filters.country}
                  <button onClick={() => setFilters(prev => ({ ...prev, country: '' }))} aria-label="Clear country filter" className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.category && (
                <Badge tone="primary">
                  Category: {filters.category}
                  <button onClick={() => setFilters(prev => ({ ...prev, category: '' }))} aria-label="Clear category filter" className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filters.myCases && (
                <Badge tone="primary">
                  My Cases Only
                  <button onClick={() => setFilters(prev => ({ ...prev, myCases: false }))} aria-label="Clear my cases filter" className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {(filters.dateRange.start || filters.dateRange.end) && (
                <Badge tone="primary">
                  Date Range: {filters.dateRange.start || 'Any'} to {filters.dateRange.end || 'Any'}
                  <button onClick={() => setFilters(prev => ({ ...prev, dateRange: { start: '', end: '' } }))} aria-label="Clear date range filter" className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              <button
                onClick={handleClearFilters}
                className="text-sm text-primary hover:text-primary-dark"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Cases List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <LoadingState label="Loading cases…" />
          ) : error ? (
            <div className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-danger mx-auto mb-2" />
              <p className="text-danger">{error}</p>
              <button
                onClick={fetchCases}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
              >
                Retry
              </button>
            </div>
          ) : cases.length === 0 ? (
            <div className="p-6 text-center">
              <FileText className="h-8 w-8 text-stone-400 mx-auto mb-2" />
              <p className="text-stone-500">No rapid response cases found</p>
              <button
                onClick={handleCreateCase}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
              >
                Create New Case
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200">
                <thead className="bg-stone-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Case
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Filed
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Country
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Partner
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                      Submitted By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                  {cases.map((caseItem) => (
                    <tr 
                      key={caseItem.id} 
                      className="hover:bg-stone-50 cursor-pointer"
                      onClick={() => handleCaseClick(caseItem.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-stone-900">{caseItem.case_filed}</div>
                          <div className="text-sm text-stone-500 truncate max-w-xs">{caseItem.case_summary}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge tone={getPriorityTone(caseItem.priority_level)}>
                          {caseItem.priority_level || 'Not set'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge tone={getStageTone(caseItem.rapid_response_stage)}>
                          {caseItem.rapid_response_stage || 'Not set'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryColor(caseItem.case_categories?.[0])}`}>
                          {caseItem.case_categories?.[0] || 'Not set'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-stone-900">{caseItem.client_name || 'N/A'}</div>
                        <div className="text-sm text-stone-500">{caseItem.client_email || 'No email'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {new Date(caseItem.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {caseItem.countries?.name || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                        {caseItem.partner || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {caseItem.profiles?.full_name ? (
                            <span className="text-sm text-stone-900">{caseItem.profiles.full_name}</span>
                          ) : (
                            <span className="text-sm text-stone-400">Unknown</span>
                          )}
                          {caseItem.profiles?.organization && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-stone-100 text-stone-600 border border-stone-200 w-fit">
                              {caseItem.profiles.organization}
                            </span>
                          )}
                          {caseItem.user_id === currentUserId && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-info-light text-info-dark w-fit">
                              Mine
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && cases.length > 0 && renderPagination()}
        </div>
      </div>
    );
  };

  // If moderator status is loading, show loading indicator
  if (moderatorLoading) {
    return <LoadingState label="Checking access…" />;
  }

  // If user is not a moderator, show access denied message
  if (!can({ isModerator, isAdmin }, 'rapid_response:manage')) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-stone-400" />
          <h3 className="mt-2 text-sm font-medium text-stone-900">Access Denied</h3>
          <p className="mt-1 text-sm text-stone-500">
            You do not have permission to access the Rapid Response system.
          </p>
          {moderatorError && (
            <p className="mt-4 text-sm text-danger">
              Error: {moderatorError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-900">Rapid Response Cases</h1>
          <p className="mt-1 text-sm text-stone-500">
            Track and manage time-sensitive legal response cases
          </p>
          {accessScope === 'organization' && userOrganization && (
            <div className="mt-3 p-3 bg-info-light border border-info/30 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
              <p className="text-sm text-info-dark">
                You are viewing cases uploaded by <strong>{userOrganization}</strong> only. Cases from other organizations are not visible.
              </p>
            </div>
          )}
        </div>
        
        {!selectedCase && !showForm && (
          <div className="flex space-x-2">
            <button
              onClick={() => setView('dashboard')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                view === 'dashboard' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                view === 'list' 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
              }`}
            >
              All Cases
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      {renderContent()}
    </div>
  );
};

export default RapidResponseCasesPage;
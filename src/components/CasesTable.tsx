import React from 'react';
import { Search, Calendar, MapPin, Gavel, User, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { sanitizeSearchTerm } from '../lib/sanitize';

interface Case {
  id: string;
  case_filed: string;
  tracking_period: string;
  jurisdiction: string;
  themes: string[];
  outcome: string;
  court_level: string;
  created_at: string;
  case_type: string;
  status: string;
  next_steps: string;
  client_satisfaction: number;
  pdf_url: string;
  document_title: string;
  countries: {
    name: string;
  };
}

interface CasesTableProps {
  onUpdateStage?: (caseData: Case) => void;
}

const PAGE_SIZE = 10;

const CasesTable: React.FC<CasesTableProps> = () => {
  const [cases, setCases] = React.useState<Case[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [selectedCase, setSelectedCase] = React.useState<Case | null>(null);
  const [showCaseDetails, setShowCaseDetails] = React.useState(false);

  React.useEffect(() => {
    fetchCases();
  }, [currentPage, searchTerm]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('cases')
        .select('*, countries(name)', { count: 'exact' });

      if (searchTerm) {
        const sanitized = sanitizeSearchTerm(searchTerm);
        query = query.or(`case_filed.ilike.%${sanitized}%,jurisdiction.ilike.%${sanitized}%`);
      }

      query = query.order('created_at', { ascending: false });

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      setCases(data || []);
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE));
    } catch (error) {
      console.error('Error fetching cases:', error);
      toast.error('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const CaseDetails = () => {
    if (!selectedCase) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col m-4">
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{selectedCase.case_filed}</h2>
                <p className="text-gray-600 mt-1">{selectedCase.tracking_period}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedCase(null);
                  setShowCaseDetails(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className={`mt-1 inline-flex px-2 py-1 rounded-full text-sm ${getStatusColor(selectedCase.status)}`}>
                    {selectedCase.status}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Country</h3>
                  <p className="mt-1 text-gray-900">{selectedCase.countries?.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Case Type</h3>
                  <p className="mt-1 text-gray-900">{selectedCase.case_type}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Court Level</h3>
                  <p className="mt-1 text-gray-900">{selectedCase.court_level}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Next Steps</h3>
                <p className="mt-2 text-gray-900 whitespace-pre-line">{selectedCase.next_steps}</p>
              </div>

              {selectedCase.themes && selectedCase.themes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Themes</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedCase.themes.map((theme, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedCase.pdf_url && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Case Document</h3>
                  <div className="mt-2">
                    <iframe
                      src={selectedCase.pdf_url}
                      className="w-full h-[400px] rounded-lg border border-gray-200"
                      title="Case Document"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search cases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Cases List */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No cases found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {cases.map((caseItem) => (
              <button
                key={caseItem.id}
                onClick={() => {
                  setSelectedCase(caseItem);
                  setShowCaseDetails(true);
                }}
                className="w-full text-left p-6 hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    {caseItem.case_filed}
                  </h3>
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(caseItem.created_at)}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {caseItem.countries?.name}
                    </div>
                    <div className="flex items-center">
                      <Gavel className="h-4 w-4 mr-1" />
                      {caseItem.court_level}
                    </div>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {caseItem.case_type}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(caseItem.status)}`}>
                      {caseItem.status}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t flex items-center justify-between">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{totalPages}</span>
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Case Details Modal */}
      {showCaseDetails && <CaseDetails />}
    </div>
  );
};

export default CasesTable;
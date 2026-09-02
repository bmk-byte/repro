import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, FileText, CreditCard as Edit2, TriangleAlert as AlertTriangle, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import DocumentModal from './DocumentModal';
import CaseProgressTracker from './CaseProgressTracker';
import { LoadingState } from './ui';

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

interface RapidResponseCaseDetailsProps {
  caseId: string;
  onBack: () => void;
  isModerator?: boolean;
  onEditCase?: (caseData: any) => void;
  onUpdate?: () => void;
  currentUserId?: string | null;
}

const RapidResponseCaseDetails: React.FC<RapidResponseCaseDetailsProps> = ({
  caseId,
  onBack,
  isModerator = false,
  onEditCase,
  onUpdate,
  currentUserId
}) => {
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userOrganization, setUserOrganization] = useState<string | null>(null);

  useEffect(() => {
    const initializeAndFetch = async () => {
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
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
      await fetchCaseDetails();
    };

    initializeAndFetch();
  }, [caseId]);

  const fetchCaseDetails = async () => {
    try {
      console.log('Fetching case details for ID:', caseId);
      setLoading(true);
      setError(null);
      setAccessDenied(false);

      const { data, error } = await supabase
        .from('cases')
        .select(`
          *,
          countries (name),
          case_documents (
            id,
            title,
            document_type,
            file_url,
            created_at
          ),
          case_stages (
            id,
            stage_group,
            stage_name,
            status,
            timestamp,
            notes
          )
        `)
        .eq('id', caseId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching case details:', error);
        throw error;
      }

      if (!data) {
        setAccessDenied(true);
        return;
      }

      // Check authorization
      if (isModerator && RESTRICTED_ORGANIZATIONS.includes(userOrganization || '')) {
        // Restricted organization moderators can only see their own cases
        if (data.user_id !== currentUserId) {
          setAccessDenied(true);
          return;
        }
      } else if (!isModerator && currentUserId) {
        // Regular users can only see their own cases
        if (data.user_id !== currentUserId) {
          setAccessDenied(true);
          return;
        }
      }

      console.log('Case details fetched:', data);
      setCaseData(data);
    } catch (error) {
      console.error('Error fetching case details:', error);
      setError('Failed to load case details');
      toast.error('Failed to load case details');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-blue-100 text-blue-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-stone-100 text-stone-800';
    }
  };
  
  const getCategoryColor = (category: string) => {
    if (!category) return 'bg-stone-100 text-stone-800';
    
    if (category.includes('Abortion')) return 'bg-purple-100 text-purple-800';
    if (category.includes('Rape')) return 'bg-red-100 text-red-800';
    if (category.includes('Defilement')) return 'bg-pink-100 text-pink-800';
    if (category.includes('SGBV')) return 'bg-orange-100 text-orange-800';
    if (category.includes('Incest')) return 'bg-indigo-100 text-indigo-800';
    
    return 'bg-stone-100 text-stone-800';
  };

  if (loading) {
    return <LoadingState label="Loading case details…" />;
  }

  if (accessDenied || !caseData) {
    return (
      <div className="text-center py-12">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <p className="text-stone-900 font-medium mb-2">
          {accessDenied ? 'Access Denied' : 'Case not found'}
        </p>
        <p className="text-stone-500 mb-6">
          {accessDenied
            ? 'You do not have permission to view this case. It may belong to another organization.'
            : 'The case you are looking for does not exist.'}
        </p>
        <button
          onClick={onBack}
          className="text-primary hover:text-primary-dark flex items-center justify-center"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Cases
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-light border border-danger/30 text-danger-dark px-4 py-3 rounded relative">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
        <button
          onClick={onBack}
          className="mt-4 text-primary hover:text-primary-dark flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Cases
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md"
    >
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex justify-between items-start">
          <button
            onClick={onBack}
            className="text-stone-500 hover:text-stone-700 flex items-center mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Cases
          </button>
          
          {isModerator && onEditCase && caseData?.user_id === currentUserId && caseData?.case_type === 'rapid-response' && (
            <button
              onClick={() => onEditCase(caseData)}
              className="text-primary hover:text-primary-dark flex items-center"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Edit Case
            </button>
          )}
        </div>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-semibold text-stone-900">{caseData.case_filed}</h1>
              {caseData.case_reference && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-stone-100 text-stone-800">
                  Ref: {caseData.case_reference}
                </span>
              )}
            </div>
            <div className="flex items-center mt-2 text-stone-500">
              <Calendar className="h-4 w-4 mr-1" />
              <span className="text-sm">
                {new Date(caseData.created_at).toLocaleDateString()}
              </span>
              <span className="mx-2">•</span>
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">{caseData.countries?.name}</span>
            </div>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              caseData.status === 'completed' ? 'bg-green-100 text-green-800' :
              caseData.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {caseData.status}
            </span>
            {caseData.priority_level && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(caseData.priority_level)}`}>
                {caseData.priority_level}
              </span>
            )}
            {caseData.case_category && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(caseData.case_category)}`}>
                {caseData.case_category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Case Information */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-stone-900 mb-3">Case Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-stone-500">Client Name</label>
                  <p className="mt-1">{caseData.client_name || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-500">Client Contact</label>
                  <div className="mt-1 space-y-1">
                    {caseData.client_email && (
                      <p className="text-sm">{caseData.client_email}</p>
                    )}
                    {caseData.client_phone && (
                      <p className="text-sm">{caseData.client_phone}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-500">Nature of Case</label>
                  <p className="mt-1">{caseData.nature_of_case}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-500">Partner Organization</label>
                  <p className="mt-1">{caseData.partner || 'Not specified'}</p>
                </div>
                {caseData.case_categories && caseData.case_categories.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-stone-500">Categories</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {caseData.case_categories.map((category: string, idx: number) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Case Summary */}
            <div>
              <h2 className="text-lg font-medium text-stone-900 mb-3">Case Summary</h2>
              <p className="text-stone-600 whitespace-pre-line">{caseData.case_summary}</p>
            </div>

            {/* Key Deadlines */}
            <div>
              <h2 className="text-lg font-medium text-stone-900 mb-3">Key Deadlines</h2>
              {caseData.key_deadlines && caseData.key_deadlines.length > 0 ? (
                <div className="space-y-3">
                  {caseData.key_deadlines.map((deadline: any, index: number) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-stone-50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-stone-900">{deadline.description}</p>
                        <p className="text-sm text-stone-500">{new Date(deadline.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500 text-sm">No deadlines specified</p>
              )}
            </div>
          </div>

          {/* Documents and Progress */}
          <div className="space-y-6">
            {/* Documents */}
            <div>
              <h2 className="text-lg font-medium text-stone-900 mb-3">Case Documents</h2>
              {caseData.pdf_url && (
                <div className="bg-stone-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-stone-400 mr-2" />
                      <span className="text-sm text-stone-900">Main Case Document</span>
                    </div>
                    <button
                      onClick={() => setShowDocumentModal(true)}
                      className="text-sm text-primary hover:text-primary-dark"
                    >
                      View Document
                    </button>
                  </div>
                </div>
              )}
              
              {caseData.case_documents?.length > 0 ? (
                <div className="space-y-3">
                  {caseData.case_documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-start p-3 bg-stone-50 rounded-lg"
                    >
                      <FileText className="h-5 w-5 text-stone-400 mt-1" />
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-stone-900">{doc.title}</h4>
                        <p className="text-xs text-stone-500 mt-1">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                        <button
                          onClick={() => {
                            setCaseData({...caseData, pdf_url: doc.file_url});
                            setShowDocumentModal(true);
                          }}
                          className="text-xs text-primary hover:text-primary-dark mt-2 inline-block"
                        >
                          View Document
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !caseData.pdf_url ? (
                <p className="text-stone-500 text-sm">No documents uploaded</p>
              ) : null}
            </div>

            {/* Progress Tracking */}
            <div>
              <h2 className="text-lg font-medium text-stone-900 mb-3">Case Progress</h2>
              <CaseProgressTracker
                caseId={caseData.id}
                onUpdate={onUpdate || fetchCaseDetails}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Document Modal */}
      {showDocumentModal && (
        <DocumentModal
          isOpen={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
          documentUrl={caseData.pdf_url}
          title={caseData.case_filed}
        />
      )}
    </motion.div>
  );
};

export default RapidResponseCaseDetails;
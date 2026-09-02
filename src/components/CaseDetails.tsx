import React from 'react';
import { ArrowLeft, Calendar, MapPin, FileText, CreditCard as Edit2, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { toast } from '../lib/toast';
import DocumentModal from './DocumentModal';
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

interface CaseDetailsProps {
  caseId: string;
  onBack: () => void;
  isModerator?: boolean;
  onEditCase?: (caseData: any) => void;
}

const CaseDetails: React.FC<CaseDetailsProps> = ({
  caseId,
  onBack,
  isModerator = false,
  onEditCase
}) => {
  const [caseData, setCaseData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [showDocumentModal, setShowDocumentModal] = React.useState(false);
  const [accessDenied, setAccessDenied] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [userOrganization, setUserOrganization] = React.useState<string | null>(null);
  const [isAfyanahakiModerator, setIsAfyanahakiModerator] = React.useState(false);

  React.useEffect(() => {
    const initializeAndFetch = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);

          const { data: profile } = await supabase
            .from('profiles')
            .select('organization, email, is_moderator')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            setUserOrganization(profile.organization);
            const isAfyanahaki = profile.is_moderator && (profile.email?.endsWith('@afyanahaki.org') || false);
            setIsAfyanahakiModerator(isAfyanahaki);
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        toast.error('Failed to load your access permissions. Some features may be restricted.');
      }
      await fetchCaseDetails();
    };

    initializeAndFetch();
  }, [caseId]);

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
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

      if (error) throw error;

      if (!data) {
        setAccessDenied(true);
        return;
      }

      // Check authorization
      if (isModerator && !isAfyanahakiModerator && RESTRICTED_ORGANIZATIONS.includes(userOrganization || '')) {
        // Restricted organization moderators can only see their own cases
        // (afyanahaki.org moderators are exempt from this, matching
        // CasesPage.tsx/RapidResponseCasesPage.tsx's access-scope logic)
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
      // afyanahaki.org moderators and other moderators can see all cases

      setCaseData(data);
    } catch (error) {
      console.error('Error fetching case details:', error);
      toast.error('Failed to load case details');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-danger-light text-danger-dark';
      case 'High':
        return 'bg-warning-light text-warning-dark';
      case 'Medium':
        return 'bg-info-light text-info-dark';
      case 'Low':
        return 'bg-success-light text-success-dark';
      default:
        return 'bg-stone-100 text-stone-800';
    }
  };

  const getCategoryColor = (category: string) => {
    if (!category) return 'bg-stone-100 text-stone-800';

    if (category.includes('Abortion') || category.includes('Contraceptive') || category.includes('Reproductive')) return 'bg-info-light text-info-dark';
    if (category.includes('Maternal') || category.includes('Mortality')) return 'bg-danger-light text-danger-dark';
    if (category.includes('SGBV') || category.includes('Sexual and Gender')) return 'bg-warning-light text-warning-dark';
    if (category.includes('Child Marriage') || category.includes('Forced Marriage')) return 'bg-warning-light text-warning-dark';
    if (category.includes('Menstrual') || category.includes('Hygiene')) return 'bg-stone-100 text-stone-800';
    if (category.includes('Education')) return 'bg-success-light text-success-dark';
    if (category.includes('Criminalization')) return 'bg-danger-light text-danger-dark';
    if (category.includes('Marginalized') || category.includes('Discrimination')) return 'bg-warning-light text-warning-dark';
    if (category.includes('Sterilization')) return 'bg-stone-100 text-stone-800';
    if (category.includes('Consent') || category.includes('Adolescent') || category.includes('Minor')) return 'bg-stone-100 text-stone-800';
    if (category.includes('Confidentiality') || category.includes('Privacy')) return 'bg-stone-100 text-stone-800';
    if (category.includes('Conflict') || category.includes('Humanitarian')) return 'bg-danger-light text-danger-dark';
    if (category.includes('Environmental')) return 'bg-stone-100 text-stone-800';
    if (category.includes('Religious') || category.includes('Cultural')) return 'bg-stone-100 text-stone-800';

    return 'bg-stone-100 text-stone-800';
  };

  if (loading) {
    return (
      <LoadingState label="Loading case details…" />
    );
  }

  if (accessDenied || !caseData) {
    return (
      <div className="text-center py-12">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-danger" />
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
          
          {isModerator && onEditCase && (
            <button
              onClick={() => onEditCase(caseData)}
              className="text-primary hover:text-primary-dark flex items-center transition-colors duration-200 px-3 py-2 rounded-md hover:bg-primary/10 active:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Edit Case"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              <span className="font-medium">Edit Case</span>
            </button>
          )}
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">{caseData.case_filed}</h1>
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
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              caseData.status === 'completed' ? 'bg-success-light text-success-dark' :
              caseData.status === 'in_progress' ? 'bg-info-light text-info-dark' :
              'bg-warning-light text-warning-dark'
            }`}>
              {caseData.status}
            </span>

            {caseData.case_type === 'rapid-response' && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-danger-light text-danger-dark flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                Rapid Response
              </span>
            )}
            
            {caseData.priority_level && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(caseData.priority_level)}`}>
                {caseData.priority_level}
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
                  <label className="text-sm font-medium text-stone-500">Court</label>
                  <p className="mt-1">{caseData.court}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-500">Nature of Case</label>
                  <p className="mt-1">{caseData.nature_of_case}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-500">Case Type</label>
                  <p className="mt-1 capitalize">{caseData.case_type?.replace('-', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-500">Partner Organization</label>
                  <p className="mt-1">{caseData.partner}</p>
                </div>
                {caseData.case_categories && caseData.case_categories.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-stone-500">Categories</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {caseData.case_categories.map((category: string, idx: number) => (
                        <span 
                          key={idx}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(category)}`}
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

            {/* Action Details */}
            <div>
              <h2 className="text-lg font-medium text-stone-900 mb-3">Action Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-stone-500">Action Taken</label>
                  <p className="mt-1">{caseData.action_taken}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-500">Action Timeframe</label>
                  <p className="mt-1">{caseData.action_timeframe}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-500">Next Steps</label>
                  <p className="mt-1">{caseData.next_steps}</p>
                </div>
              </div>
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
              {caseData.case_stages?.length > 0 ? (
                <div className="space-y-4">
                  {caseData.case_stages.map((stage: any) => (
                    <div
                      key={stage.id}
                      className="relative pl-6 pb-4 border-l-2 border-stone-200 last:pb-0"
                    >
                      <div className="absolute -left-[9px] top-0">
                        <div className={`h-4 w-4 rounded-full ${
                          stage.status === 'Completed' ? 'bg-success' :
                          stage.status === 'In Progress' ? 'bg-info' :
                          'bg-stone-300'
                        }`} />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-stone-900">{stage.stage_name}</h4>
                        <p className="text-xs text-stone-500 mt-1">
                          {new Date(stage.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        {stage.notes && (
                          <p className="text-sm text-stone-600 mt-2">{stage.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500 text-sm">No progress stages defined</p>
              )}
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

export default CaseDetails;
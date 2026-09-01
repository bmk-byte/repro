import React from 'react';
import { ArrowLeft, Calendar, Gavel, FileText, User, MapPin, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import DocumentModal from './DocumentModal';

interface JudgmentDetailsProps {
  judgmentId: string;
  onBack: () => void;
  isModerator?: boolean;
  onEditJudgment?: (judgmentData: any) => void;
}

const JudgmentDetails: React.FC<JudgmentDetailsProps> = ({ 
  judgmentId, 
  onBack,
  isModerator = false,
  onEditJudgment
}) => {
  const [judgment, setJudgment] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [showDocumentModal, setShowDocumentModal] = React.useState(false);

  React.useEffect(() => {
    fetchJudgmentDetails();
  }, [judgmentId]);

  const fetchJudgmentDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('judgments')
        .select(`
          *,
          countries (name)
        `)
        .eq('id', judgmentId)
        .single();

      if (error) throw error;
      setJudgment(data);
    } catch (error) {
      console.error('Error fetching judgment details:', error);
      toast.error('Failed to load judgment details');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Final Judgment':
        return 'bg-green-100 text-green-800';
      case 'Interim Order':
        return 'bg-yellow-100 text-yellow-800';
      case 'Ruling':
        return 'bg-blue-100 text-blue-800';
      case 'Consent Judgment':
      case 'Consent':
        return 'bg-purple-100 text-purple-800';
      case 'Default Judgment':
      case 'Default':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-stone-100 text-stone-800';
    }
  };

  const getTimelineStatusColor = (status: string) => {
    switch (status) {
      case 'filed':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-stone-100 text-stone-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!judgment) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-500">Judgment not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-primary hover:text-primary-dark flex items-center justify-center"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Judgments
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
            Back to Judgments
          </button>
          
          {isModerator && onEditJudgment && (
            <button
              onClick={() => onEditJudgment(judgment)}
              className="text-primary hover:text-primary-dark flex items-center transition-colors duration-200 px-3 py-2 rounded-md hover:bg-primary/10 active:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Edit Judgment"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              <span className="font-medium">Edit Judgment</span>
            </button>
          )}
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">{judgment.citation}</h1>
            <p className="text-stone-500 mt-1">{judgment.media_neutral_citation}</p>
            <div className="flex items-center mt-2 text-stone-500">
              <Calendar className="h-4 w-4 mr-1" />
              <span className="text-sm">
                {new Date(judgment.judgment_date).toLocaleDateString()}
              </span>
              <span className="mx-2">•</span>
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">{judgment.countries?.name}</span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(judgment.type)}`}>
            {judgment.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-stone-900 mb-3">Case Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-stone-500">Court</label>
                  <p className="mt-1">{judgment.court}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-500">Case Number</label>
                  <p className="mt-1">{judgment.case_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-500">Judges</label>
                  <p className="mt-1">{judgment.judges}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-500">Language</label>
                  <p className="mt-1">{judgment.language}</p>
                </div>
                {judgment.timeline_status && (
                  <div>
                    <label className="text-sm font-medium text-stone-500">Timeline Status</label>
                    <p className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTimelineStatusColor(judgment.timeline_status)}`}>
                        {judgment.timeline_status}
                      </span>
                    </p>
                  </div>
                )}
                {judgment.case_categories && judgment.case_categories.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-stone-500">Categories</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {judgment.case_categories.map((category: string, idx: number) => (
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

            {/* Flynote */}
            <div>
              <h2 className="text-lg font-medium text-stone-900 mb-3">Flynote</h2>
              <p className="text-stone-600 whitespace-pre-line">{judgment.flynote}</p>
            </div>

            {/* Parties Involved */}
            {(judgment.litigants?.length > 0 || judgment.defending_institutions?.length > 0) && (
              <div>
                <h2 className="text-lg font-medium text-stone-900 mb-3">Parties Involved</h2>
                {judgment.litigants?.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-stone-500">Litigants</label>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {judgment.litigants.map((litigant: string, idx: number) => (
                        <li key={idx} className="text-stone-700">{litigant}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {judgment.defending_institutions?.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-stone-500">Defending Institutions</label>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {judgment.defending_institutions.map((institution: string, idx: number) => (
                        <li key={idx} className="text-stone-700">{institution}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Judicial Body Details */}
            {(judgment.judicial_body_type || judgment.judicial_body || judgment.regional_appeals) && (
              <div>
                <h2 className="text-lg font-medium text-stone-900 mb-3">Judicial Body Details</h2>
                {judgment.judicial_body_type && (
                  <div className="mb-2">
                    <label className="text-sm font-medium text-stone-500">Judicial Body Type</label>
                    <p className="mt-1">{judgment.judicial_body_type}</p>
                  </div>
                )}
                {judgment.judicial_body && (
                  <div className="mb-2">
                    <label className="text-sm font-medium text-stone-500">Judicial Body</label>
                    <p className="mt-1">{judgment.judicial_body}</p>
                  </div>
                )}
                {judgment.regional_appeals && (
                  <div className="mb-2">
                    <label className="text-sm font-medium text-stone-500">Regional Appeals</label>
                    <p className="mt-1">Yes</p>
                    
                    {judgment.regional_bodies?.length > 0 && (
                      <div className="mt-2">
                        <label className="text-sm font-medium text-stone-500">Regional Bodies</label>
                        <ul className="mt-1 list-disc list-inside space-y-1">
                          {judgment.regional_bodies.map((body: string, idx: number) => (
                            <li key={idx} className="text-stone-700">{body}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Case Summary and Document */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-stone-900 mb-3">Case Summary</h2>
              <p className="text-stone-600 whitespace-pre-line">{judgment.case_summary}</p>
            </div>

            {/* Legal Framework */}
            {judgment.legal_framework_type && (
              <div>
                <h2 className="text-lg font-medium text-stone-900 mb-3">Legal Framework</h2>
                <div className="mb-2">
                  <label className="text-sm font-medium text-stone-500">Framework Type</label>
                  <p className="mt-1">{judgment.legal_framework_type}</p>
                </div>
                
                {judgment.domestic_laws?.length > 0 && (
                  <div className="mb-2">
                    <label className="text-sm font-medium text-stone-500">Domestic Laws</label>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {judgment.domestic_laws.map((law: string, idx: number) => (
                        <li key={idx} className="text-stone-700">{law}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {judgment.international_laws?.length > 0 && (
                  <div className="mb-2">
                    <label className="text-sm font-medium text-stone-500">International Laws</label>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {judgment.international_laws.map((law: string, idx: number) => (
                        <li key={idx} className="text-stone-700">{law}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {judgment.protocols?.length > 0 && (
                  <div className="mb-2">
                    <label className="text-sm font-medium text-stone-500">Protocols</label>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {judgment.protocols.map((protocol: string, idx: number) => (
                        <li key={idx} className="text-stone-700">{protocol}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Case Impact */}
            {judgment.case_impact && (
              <div>
                <h2 className="text-lg font-medium text-stone-900 mb-3">Case Impact</h2>
                <p className="text-stone-600 whitespace-pre-line">{judgment.case_impact}</p>
              </div>
            )}

            {/* Document */}
            <div>
              <h2 className="text-lg font-medium text-stone-900 mb-3">Judgment Document</h2>
              {judgment.file_url ? (
                <div className="bg-stone-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-stone-400" />
                      <span className="ml-2 text-sm text-stone-900">Full Judgment</span>
                    </div>
                    <button
                      onClick={() => setShowDocumentModal(true)}
                      className="text-sm text-primary hover:text-primary-dark"
                    >
                      View Document
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-stone-500 text-sm">No document available</p>
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
          documentUrl={judgment.file_url}
          title={judgment.citation}
        />
      )}
    </motion.div>
  );
};

export default JudgmentDetails;
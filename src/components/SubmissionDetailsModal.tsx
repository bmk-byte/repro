import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import CaseDetails from './CaseDetails';
import JudgmentDetails from './JudgmentDetails';
import { LoadingState } from './ui';

interface SubmissionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: any;
}

const SubmissionDetailsModal: React.FC<SubmissionDetailsModalProps> = ({
  isOpen,
  onClose,
  submission
}) => {
  const { t } = useTranslation('moderation');
  const [loading, setLoading] = React.useState(true);
  const [recordId, setRecordId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && submission) {
      checkForExistingRecord();
    }
  }, [isOpen, submission]);

  const checkForExistingRecord = async () => {
    try {
      setLoading(true);
      setError(null);

      if (submission.status === 'approved') {
        // For approved submissions, check if a record was created
        const table = submission.type === 'case' ? 'cases' : 'judgments';
        
        // Try to find a record with matching title/citation
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .eq(submission.type === 'case' ? 'case_filed' : 'citation', submission.title)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setRecordId(data.id);
        }
      }
    } catch (error) {
      console.error('Error checking for existing record:', error);
      setError(t('submissionDetailsModal.failedToCheckRecord'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = () => {
    if (!submission.document_url) return;
    
    const link = document.createElement('a');
    link.href = submission.document_url;
    link.download = submission.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(t('submissionDetailsModal.documentDownloadStarted'));
  };

  if (!isOpen || !submission) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-stone-900 break-words">{submission.title}</h2>
              <p className="text-stone-600 mt-1">
                {submission.type === 'case' ? t('submissionDetailsModal.caseSubmission') : t('submissionDetailsModal.judgmentSubmission')} -{' '}
                {submission.status === 'pending' ? t('submissionDetailsModal.pendingReview') :
                 submission.status === 'approved' ? t('submissionDetailsModal.approved') :
                 submission.status === 'rejected' ? t('submissionDetailsModal.rejected') : t('submissionDetailsModal.failed')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-500 hover:text-stone-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <LoadingState label={t('submissionDetailsModal.loadingDetails')} />
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          ) : recordId ? (
            // If we have a record ID, show the actual case/judgment details
            submission.type === 'case' ? (
              <CaseDetails caseId={recordId} onBack={() => {}} />
            ) : (
              <JudgmentDetails judgmentId={recordId} onBack={() => {}} />
            )
          ) : (
            // Otherwise, show the submission details
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-stone-900 mb-3">{t('submissionDetailsModal.submissionInformation')}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.titleLabel')}</label>
                      <p className="mt-1">{submission.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.submissionDate')}</label>
                      <p className="mt-1">{new Date(submission.submission_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.status')}</label>
                      <p className="mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                          submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-stone-100 text-stone-800'
                        }`}>
                          {submission.status === 'pending' ? t('submissionDetailsModal.pendingReview') :
                           submission.status === 'approved' ? t('submissionDetailsModal.approved') :
                           submission.status === 'rejected' ? t('submissionDetailsModal.rejected') :
                           submission.status === 'failed' ? t('submissionDetailsModal.failed') : submission.status}
                        </span>
                      </p>
                    </div>
                    {submission.feedback && (
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.feedback')}</label>
                        <p className="mt-1">{submission.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-stone-900 mb-3">{t('submissionDetailsModal.content')}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.summary')}</label>
                      <p className="mt-1 whitespace-pre-line">{submission.summary}</p>
                    </div>
                    {submission.case_categories && submission.case_categories.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.categories')}</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {submission.case_categories.map((category: string, idx: number) => (
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
              </div>

              {/* Additional details based on submission type */}
              {submission.type === 'case' ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-stone-900 mb-3">{t('submissionDetailsModal.caseDetails')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.timelineStatus')}</label>
                        <p className="mt-1">{submission.timeline_status}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.judicialBody')}</label>
                        <p className="mt-1">{submission.judicial_body}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.caseOutcome')}</label>
                        <p className="mt-1">{submission.case_outcome}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.legalFramework')}</label>
                        <p className="mt-1">{submission.legal_framework_type}</p>
                      </div>
                    </div>
                  </div>

                  {submission.litigants && submission.litigants.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-stone-900 mb-3">{t('submissionDetailsModal.parties')}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.litigants')}</label>
                          <ul className="mt-1 list-disc list-inside">
                            {submission.litigants.map((litigant: string, idx: number) => (
                              <li key={idx}>{litigant}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.defendingInstitutions')}</label>
                          <ul className="mt-1 list-disc list-inside">
                            {submission.defending_institutions?.map((institution: string, idx: number) => (
                              <li key={idx}>{institution}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {submission.case_impact && (
                    <div>
                      <h3 className="text-lg font-medium text-stone-900 mb-3">{t('submissionDetailsModal.impact')}</h3>
                      <p className="whitespace-pre-line">{submission.case_impact}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-stone-900 mb-3">{t('submissionDetailsModal.judgmentDetails')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.mediaNeutralCitation')}</label>
                        <p className="mt-1">{submission.media_neutral_citation}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.court')}</label>
                        <p className="mt-1">{submission.court_judgment}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.caseNumber')}</label>
                        <p className="mt-1">{submission.case_number_judgment}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.judges')}</label>
                        <p className="mt-1">{submission.judges_judgment}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.judgmentDate')}</label>
                        <p className="mt-1">{submission.judgment_date_judgment ? new Date(submission.judgment_date_judgment).toLocaleDateString() : t('submissionDetailsModal.notSpecified')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.language')}</label>
                        <p className="mt-1">{submission.language_judgment || t('submissionDetailsModal.notSpecified')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-stone-500">{t('submissionDetailsModal.type')}</label>
                        <p className="mt-1">{submission.type_judgment || t('submissionDetailsModal.notSpecified')}</p>
                      </div>
                    </div>
                  </div>

                  {submission.flynote_judgment && (
                    <div>
                      <h3 className="text-lg font-medium text-stone-900 mb-3">{t('submissionDetailsModal.flynote')}</h3>
                      <p className="whitespace-pre-line">{submission.flynote_judgment}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Document section */}
              {submission.document_url && (
                <div>
                  <h3 className="text-lg font-medium text-stone-900 mb-3">{t('submissionDetailsModal.document')}</h3>
                  <div className="bg-stone-50 p-6 rounded-lg flex flex-col items-center justify-center">
                    <p className="mb-4 text-stone-600">{t('submissionDetailsModal.downloadPrompt')}</p>
                    <button
                      onClick={handleDownloadDocument}
                      className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      {t('submissionDetailsModal.downloadDocument')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetailsModal;
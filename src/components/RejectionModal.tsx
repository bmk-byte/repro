import React, { useState } from 'react';
import { XCircle, Trash2 } from 'lucide-react';
import { Modal, Button } from './ui';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: any;
  onReject: (id: string, feedback: string, originalTable?: string) => void;
  loading?: boolean;
}

const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
  onReject,
  loading = false
}) => {
  const [rejectionFeedback, setRejectionFeedback] = useState('');

  const quickReasons = [
    "Missing required information in the submission",
    "Document quality is poor or unreadable",
    "Insufficient detail in case summary",
    "Incorrect formatting or structure",
    "Missing supporting documentation",
    "Information appears to be incomplete or inaccurate",
    "Does not meet submission guidelines",
    "Duplicate submission already exists"
  ];

  const handleQuickReasonClick = (reason: string) => {
    if (rejectionFeedback.trim()) {
      setRejectionFeedback(prev => prev + '\n\n• ' + reason);
    } else {
      setRejectionFeedback('• ' + reason);
    }
  };

  const handleClearFeedback = () => {
    setRejectionFeedback('');
  };

  const handleSubmit = () => {
    if (rejectionFeedback.trim().length < 10) {
      return;
    }
    onReject(selectedItem.id, rejectionFeedback, selectedItem.originalTable);
    setRejectionFeedback('');
    onClose();
  };

  const handleClose = () => {
    setRejectionFeedback('');
    onClose();
  };

  if (!selectedItem) return null;

  const feedbackLength = rejectionFeedback.trim().length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Rejection Feedback"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={feedbackLength < 10}
            loading={loading}
          >
            {loading
              ? 'Processing…'
              : feedbackLength < 10
                ? 'Provide feedback to reject'
                : 'Reject Submission'
            }
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-shrink-0 w-8 h-8 bg-danger-light rounded-full flex items-center justify-center">
          <XCircle className="h-5 w-5 text-danger" aria-hidden="true" />
        </div>
        <p className="text-sm text-stone-500">Help the submitter understand what needs to be improved</p>
      </div>

      {/* Quick Reasons Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="block text-sm font-medium text-stone-700">
            Quick Reasons (click to add)
          </span>
          {rejectionFeedback && (
            <button
              onClick={handleClearFeedback}
              className="flex items-center gap-1 text-xs text-stone-500 hover:text-danger transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quickReasons.map((reason, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleQuickReasonClick(reason)}
              className="text-left p-3 text-sm bg-stone-50 hover:bg-info-light border border-stone-200 hover:border-info/40 rounded-md transition-colors"
            >
              {reason}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="rejection-feedback" className="block text-sm font-medium text-stone-700 mb-2">
          Detailed feedback <span className="text-danger" aria-hidden="true">*</span>
        </label>
        <textarea
          id="rejection-feedback"
          value={rejectionFeedback}
          onChange={(e) => setRejectionFeedback(e.target.value)}
          placeholder="• Be specific about what's missing or incorrect
• Suggest concrete steps for improvement
• Reference specific sections that need attention
• Maintain a constructive and professional tone"
          aria-describedby="rejection-feedback-hint"
          className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-1 min-h-[120px] resize-y transition-colors ${
            feedbackLength < 10
              ? 'border-danger focus:border-danger focus:ring-danger'
              : 'border-stone-300 focus:border-primary focus:ring-primary'
          }`}
          autoFocus
        />

        <div id="rejection-feedback-hint" className="flex justify-between items-center mt-2">
          <div className={`text-xs ${
            feedbackLength < 10
              ? 'text-danger'
              : feedbackLength < 20
                ? 'text-warning'
                : 'text-success'
          }`}>
            {feedbackLength < 10
              ? `${10 - feedbackLength} more characters needed (minimum 10)`
              : feedbackLength < 20
                ? 'Good length - consider adding more detail'
                : 'Excellent - detailed feedback provided'
            }
          </div>
          <div className="text-xs text-stone-500 font-mono tabular-nums">
            {rejectionFeedback.length} characters
          </div>
        </div>
      </div>

      <div className="p-3 bg-info-light border border-info/20 rounded-md">
        <h4 className="text-sm font-medium text-info-dark mb-2">Tips for helpful feedback</h4>
        <ul className="text-xs text-info-dark/90 space-y-1">
          <li>• Be specific about what's missing or incorrect</li>
          <li>• Suggest concrete steps for improvement</li>
          <li>• Reference specific sections that need attention</li>
          <li>• Maintain a constructive and professional tone</li>
        </ul>
      </div>
    </Modal>
  );
};

export default RejectionModal;

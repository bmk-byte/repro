import React, { useState } from 'react';
import { XCircle, X, Trash2 } from 'lucide-react';

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

  // Quick rejection reasons
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

  if (!isOpen || !selectedItem) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center space-x-2 mb-4">
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Rejection Feedback</h3>
            <p className="text-sm text-gray-500">Help the submitter understand what needs to be improved</p>
          </div>
        </div>

        {/* Quick Reasons Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Quick Reasons (click to add)
            </label>
            {rejectionFeedback && (
              <button
                onClick={handleClearFeedback}
                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
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
                className="text-left p-3 text-sm bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-md transition-colors"
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detailed feedback *
          </label>
          <textarea
            value={rejectionFeedback}
            onChange={(e) => setRejectionFeedback(e.target.value)}
            placeholder="• Be specific about what's missing or incorrect
• Suggest concrete steps for improvement  
• Reference specific sections that need attention
• Maintain a constructive and professional tone"
            className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 min-h-[120px] resize-y transition-colors ${
              rejectionFeedback.trim().length < 10 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:border-primary focus:ring-primary'
            }`}
            autoFocus
          />
          
          {/* Character counter and validation */}
          <div className="flex justify-between items-center mt-2">
            <div className={`text-xs ${
              rejectionFeedback.trim().length < 10 
                ? 'text-red-500' 
                : rejectionFeedback.trim().length < 20 
                  ? 'text-amber-500' 
                  : 'text-green-500'
            }`}>
              {rejectionFeedback.trim().length < 10 
                ? `${10 - rejectionFeedback.trim().length} more characters needed (minimum 10)`
                : rejectionFeedback.trim().length < 20 
                  ? 'Good length - consider adding more detail'
                  : 'Excellent - detailed feedback provided'
              }
            </div>
            <div className="text-xs text-gray-500">
              {rejectionFeedback.length} characters
            </div>
          </div>
        </div>
        
        {/* Helpful tips */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips for helpful feedback:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Be specific about what's missing or incorrect</li>
            <li>• Suggest concrete steps for improvement</li>
            <li>• Reference specific sections that need attention</li>
            <li>• Maintain a constructive and professional tone</li>
          </ul>
        </div>
        
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={rejectionFeedback.trim().length < 10 || loading}
            className={`px-4 py-2 text-sm font-medium border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              rejectionFeedback.trim().length < 10
                ? 'text-gray-400 bg-gray-200 cursor-not-allowed'
                : 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }`}
          >
            {loading 
              ? 'Processing...' 
              : rejectionFeedback.trim().length < 10 
                ? 'Provide feedback to reject' 
                : 'Reject Submission'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;
import React from 'react';
import { X } from 'lucide-react';
import CaseProgressTracker from './CaseProgressTracker';

interface RapidResponseStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: any;
  onUpdate: () => void;
}

const RapidResponseStageModal: React.FC<RapidResponseStageModalProps> = ({
  isOpen,
  onClose,
  caseData,
  onUpdate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white pb-4 mb-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Case Progress Tracker</h2>
              <p className="mt-1 text-sm text-stone-500">{caseData.case_filed}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-stone-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-stone-500" />
            </button>
          </div>
        </div>

        <CaseProgressTracker
          caseId={caseData.id}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
};

export default RapidResponseStageModal;
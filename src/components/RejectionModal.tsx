import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XCircle, Trash2 } from 'lucide-react';
import { Modal, Button, Textarea } from './ui';

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
  const { t } = useTranslation('moderation');
  const [rejectionFeedback, setRejectionFeedback] = useState('');

  const quickReasons = t('rejectionModal.quickReasons', { returnObjects: true }) as string[];

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
      title={t('rejectionModal.title')}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t('rejectionModal.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={feedbackLength < 10}
            loading={loading}
          >
            {loading
              ? t('rejectionModal.processing')
              : feedbackLength < 10
                ? t('rejectionModal.provideFeedback')
                : t('rejectionModal.rejectSubmission')
            }
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-shrink-0 w-8 h-8 bg-danger-light rounded-full flex items-center justify-center">
          <XCircle className="h-5 w-5 text-danger" aria-hidden="true" />
        </div>
        <p className="text-sm text-stone-500">{t('rejectionModal.helpText')}</p>
      </div>

      {/* Quick Reasons Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="block text-sm font-medium text-stone-700">
            {t('rejectionModal.quickReasonsLabel')}
          </span>
          {rejectionFeedback && (
            <button
              onClick={handleClearFeedback}
              className="flex items-center gap-1 text-xs text-stone-500 hover:text-danger transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>{t('rejectionModal.clear')}</span>
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
        <Textarea
          label={t('rejectionModal.detailedFeedbackLabel')}
          id="rejection-feedback"
          required
          rows={5}
          value={rejectionFeedback}
          onChange={(e) => setRejectionFeedback(e.target.value)}
          placeholder={t('rejectionModal.placeholder')}
          autoFocus
          error={feedbackLength < 10 ? t('rejectionModal.charactersNeeded', { count: 10 - feedbackLength }) : undefined}
          helperText={
            feedbackLength >= 10
              ? feedbackLength < 20
                ? t('rejectionModal.goodLength')
                : t('rejectionModal.excellentFeedback')
              : undefined
          }
        />
        <div className="mt-1 text-right text-xs text-stone-500 font-mono tabular-nums">
          {t('rejectionModal.charactersCount', { count: rejectionFeedback.length })}
        </div>
      </div>

      <div className="p-3 bg-info-light border border-info/20 rounded-md">
        <h4 className="text-sm font-medium text-info-dark mb-2">{t('rejectionModal.tipsTitle')}</h4>
        <ul className="text-xs text-info-dark/90 space-y-1">
          {(t('rejectionModal.tips', { returnObjects: true }) as string[]).map((tip, idx) => (
            <li key={idx}>• {tip}</li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};

export default RejectionModal;

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import type { ScorecardIndicator as Indicator, ScorecardIndicatorScore as IndicatorScore } from '../types/database';
import { Modal, Button } from '../../components/ui';

interface EvidenceModalProps {
  indicator: Indicator;
  score?: IndicatorScore;
  onSave: (evidenceNotes: string, evidenceComplete: boolean) => void;
  onClose: () => void;
}

export function EvidenceModal({ indicator, score, onSave, onClose }: EvidenceModalProps) {
  const { t } = useTranslation('scorecard');
  const [notes, setNotes] = useState(score?.evidence_notes || '');
  const [complete, setComplete] = useState(score?.evidence_complete || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(notes, complete);
      onClose();
    } catch (error) {
      console.error('Failed to save evidence:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${indicator.code} — ${indicator.title}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {t('evidenceModal.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            loading={isSaving}
            className="!bg-green-600 hover:!bg-green-700"
            icon={<Save className="w-4 h-4" />}
          >
            {t('evidenceModal.saveEvidence')}
          </Button>
        </>
      }
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          {t('evidenceModal.suggestedSources')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {indicator.evidence_sources.map((source, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-primary-50 border border-primary-200 rounded-full text-xs text-primary-700"
            >
              {source}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t('evidenceModal.notesLabel')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('evidenceModal.notesPlaceholder')}
          rows={10}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
        />
        <p className="mt-2 text-xs text-gray-500">
          {t('evidenceModal.notesHint')}
        </p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={complete}
          onChange={(e) => setComplete(e.target.checked)}
          className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
        />
        <span className="text-sm font-medium text-gray-700">
          {t('evidenceModal.evidenceComplete')}
        </span>
      </label>
    </Modal>
  );
}

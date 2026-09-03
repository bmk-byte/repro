import React from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { toast } from '../lib/toast';
import { Modal, Textarea, Select, Button } from './ui';

interface UpdateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: any;
  onUpdate: () => void;
}

const UpdateCaseModal: React.FC<UpdateCaseModalProps> = ({ isOpen, onClose, caseData, onUpdate }) => {
  const { t } = useTranslation('moderation');
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    status: caseData.status || '',
    issues_faced: '',
    next_steps: caseData.next_steps || '',
    comments: caseData.comments || '',
    client_satisfaction: caseData.client_satisfaction || 0,
    satisfaction_notes: caseData.satisfaction_notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('cases')
        .update({
          status: formData.status,
          next_steps: formData.next_steps,
          comments: formData.comments,
          client_satisfaction: formData.client_satisfaction || null,
          satisfaction_notes: formData.satisfaction_notes
        })
        .eq('id', caseData.id);

      if (error) throw error;

      toast.success(t('updateCaseModal.updateSuccess'));
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating case:', error);
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSatisfactionClick = (score: number) => {
    setFormData(prev => ({ ...prev, client_satisfaction: score }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('updateCaseModal.title')}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('updateCaseModal.cancel')}
          </Button>
          <Button type="submit" form="update-case-form" loading={loading}>
            {loading ? t('updateCaseModal.updating') : t('updateCaseModal.updateCase')}
          </Button>
        </>
      }
    >
      <form id="update-case-form" onSubmit={handleSubmit} className="space-y-6">
        <Select
          label={t('updateCaseModal.status')}
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="">{t('updateCaseModal.selectStatus')}</option>
          <option value="pending">{t('updateCaseModal.statusPending')}</option>
          <option value="in_progress">{t('updateCaseModal.statusInProgress')}</option>
          <option value="completed">{t('updateCaseModal.statusCompleted')}</option>
          <option value="on_hold">{t('updateCaseModal.statusOnHold')}</option>
        </Select>

        <div>
          <span className="block text-sm font-medium text-stone-700 mb-2">
            {t('updateCaseModal.clientSatisfactionScore')}
          </span>
          <div role="radiogroup" aria-label={t('updateCaseModal.satisfactionAriaLabel')} className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                role="radio"
                aria-checked={formData.client_satisfaction === score}
                aria-label={t('updateCaseModal.starAriaLabel', { score })}
                onClick={() => handleSatisfactionClick(score)}
                className={`p-2 rounded-full transition-colors ${
                  formData.client_satisfaction >= score
                    ? 'text-warning hover:text-warning-dark'
                    : 'text-stone-300 hover:text-stone-400'
                }`}
              >
                <Star className="h-6 w-6 fill-current" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label={t('updateCaseModal.satisfactionNotes')}
          name="satisfaction_notes"
          rows={2}
          value={formData.satisfaction_notes}
          onChange={handleChange}
          placeholder={t('updateCaseModal.satisfactionNotesPlaceholder')}
        />

        <Textarea
          label={t('updateCaseModal.nextSteps')}
          name="next_steps"
          rows={3}
          value={formData.next_steps}
          onChange={handleChange}
        />

        <Textarea
          label={t('updateCaseModal.additionalComments')}
          name="comments"
          rows={3}
          value={formData.comments}
          onChange={handleChange}
        />
      </form>
    </Modal>
  );
};

export default UpdateCaseModal;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { toast } from '../lib/toast';
import { Modal, Input, Textarea, Select, Button } from './ui';

interface EditCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: any;
  onUpdate: () => void;
}

const EditCaseModal: React.FC<EditCaseModalProps> = ({
  isOpen,
  onClose,
  caseData,
  onUpdate
}) => {
  const { t } = useTranslation('moderation');
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    case_filed: caseData?.case_filed || '',
    case_summary: caseData?.case_summary || '',
    status: caseData?.status || '',
    court: caseData?.court || '',
    nature_of_case: caseData?.nature_of_case || '',
    action_taken: caseData?.action_taken || '',
    next_steps: caseData?.next_steps || ''
  });

  React.useEffect(() => {
    if (caseData) {
      setFormData({
        case_filed: caseData.case_filed || '',
        case_summary: caseData.case_summary || '',
        status: caseData.status || '',
        court: caseData.court || '',
        nature_of_case: caseData.nature_of_case || '',
        action_taken: caseData.action_taken || '',
        next_steps: caseData.next_steps || ''
      });
    }
  }, [caseData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('cases')
        .update(formData)
        .eq('id', caseData.id);

      if (error) throw error;

      toast.success(t('editCaseModal.updateSuccess'));
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('editCaseModal.title')}
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('editCaseModal.cancel')}
          </Button>
          <Button type="submit" form="edit-case-form" loading={loading}>
            {loading ? t('editCaseModal.saving') : t('editCaseModal.saveChanges')}
          </Button>
        </>
      }
    >
      <form id="edit-case-form" onSubmit={handleSubmit} className="space-y-6">
        <Input
          label={t('editCaseModal.caseTitle')}
          name="case_filed"
          value={formData.case_filed}
          onChange={handleChange}
          required
        />

        <Textarea
          label={t('editCaseModal.caseSummary')}
          name="case_summary"
          value={formData.case_summary}
          onChange={handleChange}
          rows={4}
        />

        <Select
          label={t('editCaseModal.status')}
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="pending">{t('editCaseModal.statusPending')}</option>
          <option value="in_progress">{t('editCaseModal.statusInProgress')}</option>
          <option value="completed">{t('editCaseModal.statusCompleted')}</option>
          <option value="on_hold">{t('editCaseModal.statusOnHold')}</option>
        </Select>

        <Input
          label={t('editCaseModal.court')}
          name="court"
          value={formData.court}
          onChange={handleChange}
        />

        <Input
          label={t('editCaseModal.natureOfCase')}
          name="nature_of_case"
          value={formData.nature_of_case}
          onChange={handleChange}
        />

        <Textarea
          label={t('editCaseModal.actionTaken')}
          name="action_taken"
          value={formData.action_taken}
          onChange={handleChange}
          rows={3}
        />

        <Textarea
          label={t('editCaseModal.nextSteps')}
          name="next_steps"
          value={formData.next_steps}
          onChange={handleChange}
          rows={3}
        />
      </form>
    </Modal>
  );
}

export default EditCaseModal;

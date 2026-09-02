import React from 'react';
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

      toast.success('Case updated successfully');
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
      title="Edit Case"
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="edit-case-form" loading={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form id="edit-case-form" onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Case Title"
          name="case_filed"
          value={formData.case_filed}
          onChange={handleChange}
          required
        />

        <Textarea
          label="Case Summary"
          name="case_summary"
          value={formData.case_summary}
          onChange={handleChange}
          rows={4}
        />

        <Select
          label="Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
        </Select>

        <Input
          label="Court"
          name="court"
          value={formData.court}
          onChange={handleChange}
        />

        <Input
          label="Nature of Case"
          name="nature_of_case"
          value={formData.nature_of_case}
          onChange={handleChange}
        />

        <Textarea
          label="Action Taken"
          name="action_taken"
          value={formData.action_taken}
          onChange={handleChange}
          rows={3}
        />

        <Textarea
          label="Next Steps"
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

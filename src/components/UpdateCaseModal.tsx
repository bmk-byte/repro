import React from 'react';
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

  const handleSatisfactionClick = (score: number) => {
    setFormData(prev => ({ ...prev, client_satisfaction: score }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Case Status"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="update-case-form" loading={loading}>
            {loading ? 'Updating…' : 'Update Case'}
          </Button>
        </>
      }
    >
      <form id="update-case-form" onSubmit={handleSubmit} className="space-y-6">
        <Select
          label="Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="">Select status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
        </Select>

        <div>
          <span className="block text-sm font-medium text-stone-700 mb-2">
            Client Satisfaction Score
          </span>
          <div role="radiogroup" aria-label="Client satisfaction score" className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                role="radio"
                aria-checked={formData.client_satisfaction === score}
                aria-label={`${score} out of 5 stars`}
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
          label="Satisfaction Notes"
          name="satisfaction_notes"
          rows={2}
          value={formData.satisfaction_notes}
          onChange={handleChange}
          placeholder="Add any feedback or notes about the client's satisfaction"
        />

        <Textarea
          label="Next Steps"
          name="next_steps"
          rows={3}
          value={formData.next_steps}
          onChange={handleChange}
        />

        <Textarea
          label="Additional Comments"
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

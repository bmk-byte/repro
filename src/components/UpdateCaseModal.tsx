import React from 'react';
import { X, Star } from 'lucide-react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import toast from 'react-hot-toast';

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
      // Update case data - this will trigger the notification
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
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSatisfactionClick = (score: number) => {
    setFormData(prev => ({
      ...prev,
      client_satisfaction: score
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Update Case Status</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              id="status"
              value={formData.status}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            >
              <option value="">Select status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Satisfaction Score
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => handleSatisfactionClick(score)}
                  className={`p-2 rounded-full transition-colors ${
                    formData.client_satisfaction >= score
                      ? 'text-yellow-400 hover:text-yellow-500'
                      : 'text-gray-300 hover:text-gray-400'
                  }`}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="satisfaction_notes" className="block text-sm font-medium text-gray-700">
              Satisfaction Notes
            </label>
            <textarea
              name="satisfaction_notes"
              id="satisfaction_notes"
              rows={2}
              value={formData.satisfaction_notes}
              onChange={handleChange}
              placeholder="Add any feedback or notes about the client's satisfaction"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="next_steps" className="block text-sm font-medium text-gray-700">
              Next Steps
            </label>
            <textarea
              name="next_steps"
              id="next_steps"
              rows={3}
              value={formData.next_steps}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
              Additional Comments
            </label>
            <textarea
              name="comments"
              id="comments"
              rows={3}
              value={formData.comments}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {loading ? 'Updating...' : 'Update Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateCaseModal;
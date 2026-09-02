import React from 'react';
import { toast } from '../lib/toast';
import SubmitCaseForm from './forms/SubmitCaseForm';
import SubmitJudgmentForm from './forms/SubmitJudgmentForm';

interface SubmissionFormProps {
  type: 'case' | 'judgment';
  onSuccess?: () => void;
  onCancel?: () => void;
  isDirectUpload?: boolean;
}

const SubmissionForm: React.FC<SubmissionFormProps> = ({ type, onSuccess, onCancel, isDirectUpload = false }) => {
  const handleSuccess = () => {
    toast.success(`${type === 'case' ? 'Case' : 'Judgment'} ${isDirectUpload ? 'uploaded' : 'submitted'} successfully`);
    onSuccess?.();
  };

  const handleCancel = () => {
    onCancel?.();
  };

  // Render the appropriate form based on type
  switch (type) {
    case 'case':
      return (
        <SubmitCaseForm 
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          isDirectUpload={isDirectUpload}
        />
      );
    case 'judgment':
      return (
        <SubmitJudgmentForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          isDirectUpload={isDirectUpload}
        />
      );
    default:
      return null;
  }
};

export default SubmissionForm;
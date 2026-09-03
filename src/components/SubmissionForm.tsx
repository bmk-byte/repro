import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('forms');

  const handleSuccess = () => {
    const messageKey = type === 'case'
      ? (isDirectUpload ? 'submissionForm.messages.caseUploaded' : 'submissionForm.messages.caseSubmitted')
      : (isDirectUpload ? 'submissionForm.messages.judgmentUploaded' : 'submissionForm.messages.judgmentSubmitted');
    toast.success(t(messageKey));
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
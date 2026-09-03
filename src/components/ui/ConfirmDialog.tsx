import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button, type ButtonProps } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonProps['variant'];
  loading?: boolean;
}

/**
 * Shared confirmation modal for destructive or high-stakes actions
 * (publishing content live, granting/revoking elevated access, etc).
 * Wraps the accessible `Modal` primitive so every confirm step in the app
 * gets the same focus-trap/Escape/backdrop behavior instead of a bespoke
 * dialog (or, worse, a native `confirm()`).
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'primary',
  loading = false,
}) => {
  const { t } = useTranslation();
  return (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel ?? t('common.cancel')}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
          {confirmLabel ?? t('common.confirm')}
        </Button>
      </>
    }
  >
    <p className="text-sm text-stone-600">{description}</p>
  </Modal>
  );
};

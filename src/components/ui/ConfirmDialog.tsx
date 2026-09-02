import React from 'react';
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
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-sm text-stone-600">{description}</p>
  </Modal>
);

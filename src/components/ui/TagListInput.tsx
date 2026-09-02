import React, { useId, useState } from 'react';
import { X } from 'lucide-react';

export interface TagListInputProps {
  label: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  addButtonLabel?: string;
}

/**
 * Add-an-item-to-a-list field: a text input + Add button that appends to a
 * list of removable chips. Replaces the near-identical bespoke "litigants /
 * defending institutions / domestic laws / ..." blocks that used to be
 * copy-pasted across the case/judgment submission forms. The parent still
 * owns the `items` array (same as before); this component only owns the
 * transient text-input value and clears it after each add.
 */
export const TagListInput: React.FC<TagListInputProps> = ({
  label,
  items,
  onAdd,
  onRemove,
  placeholder,
  required,
  error,
  helperText,
  disabled,
  addButtonLabel = 'Add',
}) => {
  const [inputValue, setInputValue] = useState('');
  const autoId = useId();
  const inputId = `${autoId}-input`;
  const helperId = `${autoId}-helper`;
  const errorId = `${autoId}-error`;

  const commit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-stone-700">
        {label}
        {required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={[
            'h-10 flex-1 rounded-md border px-3 text-sm text-stone-900 placeholder:text-stone-400',
            'bg-white transition-colors',
            error
              ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger'
              : 'border-stone-300 focus:border-primary focus:ring-1 focus:ring-primary',
            'disabled:bg-stone-50 disabled:text-stone-400',
          ].join(' ')}
        />
        <button
          type="button"
          onClick={commit}
          disabled={disabled}
          className="h-10 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addButtonLabel}
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-dark"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${item}`}
                className="text-primary-dark/70 hover:text-primary-dark"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-sm text-stone-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

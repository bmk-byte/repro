import React, { useId } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, required, id, className = '', rows = 4, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-stone-700">
          {label}
          {required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={[
            'rounded-md border px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400',
            'bg-white transition-colors resize-y',
            error
              ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger'
              : 'border-stone-300 focus:border-primary focus:ring-1 focus:ring-primary',
            'disabled:bg-stone-50 disabled:text-stone-400',
            className,
          ].join(' ')}
          {...props}
        />
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
  }
);

Textarea.displayName = 'Textarea';

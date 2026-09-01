import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, required, id, className = '', children, ...props }, ref) => {
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
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={[
              'h-10 w-full appearance-none rounded-md border bg-white pl-3 pr-9 text-sm text-stone-900',
              'transition-colors',
              error
                ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger'
                : 'border-stone-300 focus:border-primary focus:ring-1 focus:ring-primary',
              'disabled:bg-stone-50 disabled:text-stone-400',
              className,
            ].join(' ')}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
        </div>
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

Select.displayName = 'Select';

import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  /** Optional overlay on the right edge of the field (icon button, tooltip trigger, etc). */
  rightElement?: React.ReactNode;
}

/**
 * Always-labeled input with error/helper text wired up via aria-describedby
 * so screen readers announce them, and error state uses both color and text
 * (never color alone). Matches the pattern already used in the app's larger
 * forms so this can replace bespoke input markup 1:1.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, required, id, className = '', rightElement, ...props }, ref) => {
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
          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={[
              'h-10 w-full rounded-md border px-3 text-sm text-stone-900 placeholder:text-stone-400',
              'bg-white transition-colors',
              rightElement && 'pr-10',
              error
                ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger'
                : 'border-stone-300 focus:border-primary focus:ring-1 focus:ring-primary',
              'disabled:bg-stone-50 disabled:text-stone-400',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">{rightElement}</div>
          )}
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

Input.displayName = 'Input';

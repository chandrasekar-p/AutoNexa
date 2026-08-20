import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-xs font-medium text-ink-secondary">
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            'h-10 rounded border border-line bg-surface px-3 text-sm text-ink',
            'focus:border-accent-400',
            error && 'border-danger-500 dark:border-danger-400',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p id={errorId} className="text-xs text-danger-600 dark:text-danger-400">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Select.displayName = 'Select';

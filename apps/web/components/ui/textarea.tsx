import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, rows = 3, ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            'rounded border border-line bg-surface px-3 py-2 text-sm text-ink',
            'placeholder:text-ink-muted',
            'focus:border-accent-400',
            error && 'border-danger-500 dark:border-danger-400',
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={errorId} className="text-xs text-danger-600 dark:text-danger-400">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

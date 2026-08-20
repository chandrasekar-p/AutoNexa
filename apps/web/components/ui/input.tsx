import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const isPassword = type === 'password';
    const [isRevealed, setIsRevealed] = useState(false);

    const inputEl = (
      <input
        ref={ref}
        id={inputId}
        type={isPassword ? (isRevealed ? 'text' : 'password') : type}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(
          'h-10 rounded border border-line bg-surface px-3 text-sm text-ink',
          'placeholder:text-ink-muted',
          'focus:border-accent-400',
          error && 'border-danger-500 dark:border-danger-400',
          isPassword && 'pr-10',
          className,
        )}
        {...props}
      />
    );

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-xs font-medium text-ink-secondary">
            {label}
          </label>
        ) : null}
        {isPassword ? (
          <div className="relative">
            {inputEl}
            <button
              type="button"
              onClick={() => setIsRevealed((v) => !v)}
              aria-label={isRevealed ? 'Hide password' : 'Show password'}
              className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-ink-muted hover:text-ink-secondary"
            >
              {isRevealed ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          inputEl
        )}
        {error ? (
          <p id={errorId} className="text-xs text-danger-600 dark:text-danger-400">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

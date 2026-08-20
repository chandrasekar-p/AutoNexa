import { Button } from './button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-danger-100 bg-danger-50 px-5 py-4 dark:border-danger-500/30 dark:bg-danger-500/10">
      <p className="text-sm text-danger-700 dark:text-danger-400">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

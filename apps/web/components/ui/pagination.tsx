import { Button } from './button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * Shared across every module's list page (Customers, Vehicles, ...) — they
 * all page through GET /<resource> the same way (page/pageSize/total from
 * the backend's PaginatedResult<T>), so this is built once here rather
 * than re-derived per module.
 */
export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-line px-1 pt-3">
      <span className="num text-xs text-ink-secondary">
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

import { Button } from './button';
import { Select } from './select';
import { cn } from '@/lib/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  /**
   * Both optional and only meaningful together — when omitted, this
   * renders exactly as before (Previous/Next only, no numbered pages, no
   * size selector), so every existing caller is unaffected. Pass both to
   * opt a page into the richer control (currently just Estimates).
   */
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
// Cap on how many numbered page buttons render directly — beyond this,
// Previous/Next-only still works (never hidden), just without a full
// number line for a huge page count.
const MAX_NUMBERED_PAGES = 7;

/**
 * Shared across every module's list page (Customers, Vehicles, ...) — they
 * all page through GET /<resource> the same way (page/pageSize/total from
 * the backend's PaginatedResult<T>), so this is built once here rather
 * than re-derived per module.
 */
export function Pagination({ page, totalPages, total, onPageChange, pageSize, onPageSizeChange, pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS }: PaginationProps) {
  if (total === 0) return null;

  const showPageSize = pageSize !== undefined && onPageSizeChange !== undefined;
  const pageNumbers = totalPages <= MAX_NUMBERED_PAGES ? Array.from({ length: totalPages }, (_, i) => i + 1) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-1 pt-3">
      <span className="num text-xs text-ink-secondary">
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        {pageNumbers ? (
          <div className="flex gap-1">
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onPageChange(n)}
                className={cn(
                  'num flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors',
                  n === page ? 'bg-accent-500 text-white' : 'text-ink-secondary hover:bg-surface-hover',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}
        <Button type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
        {showPageSize ? (
          <div className="w-28">
            <Select
              aria-label="Rows per page"
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
    </div>
  );
}

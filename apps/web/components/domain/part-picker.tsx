'use client';

import { useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { formatMoney, formatQuantity } from '@/lib/format';
import { Input } from '@/components/ui/input';
import type { PaginatedResult, PartRef } from '@/lib/api-types';

interface PartPickerProps {
  value: PartRef | null;
  onChange: (part: PartRef | null) => void;
}

const EMPTY_RESULT: PaginatedResult<PartRef> = { items: [], total: 0, page: 1, pageSize: 8, totalPages: 0 };

/** Search-and-select from the parts catalogue — same shape as CustomerPicker, for the Job Card "Add Part Line" form. */
export function PartPicker({ value, onChange }: PartPickerProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query);

  const search = useApiQuery<PaginatedResult<PartRef>>(
    () =>
      debouncedQuery
        ? apiGet(`/parts?search=${encodeURIComponent(debouncedQuery)}&isActive=true&pageSize=8`)
        : Promise.resolve(EMPTY_RESULT),
    [debouncedQuery],
  );

  if (value) {
    return (
      <div className="flex h-9 items-center justify-between rounded border border-line bg-surface-hover px-3">
        <span className="text-sm text-ink">
          {value.partNumber} <span className="text-ink-muted">— {value.name}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} className="text-xs text-accent-600 hover:underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex-1">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        placeholder="Search the parts catalogue…"
        className="h-9"
      />
      {isOpen && debouncedQuery ? (
        <div className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-card">
          {search.data && search.data.items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-ink-muted">No matching parts.</p>
          ) : null}
          {search.data?.items.map((part) => (
            <button
              key={part.id}
              type="button"
              onMouseDown={() => {
                onChange(part);
                setQuery('');
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-hover"
            >
              <span className="text-ink">
                {part.partNumber} <span className="text-ink-muted">— {part.name}</span>
              </span>
              <span className="num text-xs text-ink-muted">
                {formatMoney(part.sellingPrice)} · {formatQuantity(part.currentStock, part.unit)} in stock
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

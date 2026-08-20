'use client';

import { useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { formatMoney } from '@/lib/format';
import { Input } from '@/components/ui/input';
import type { LabourItemRef, PaginatedResult } from '@/lib/api-types';

interface LabourItemPickerProps {
  value: LabourItemRef | null;
  onChange: (item: LabourItemRef | null) => void;
}

const EMPTY_RESULT: PaginatedResult<LabourItemRef> = { items: [], total: 0, page: 1, pageSize: 8, totalPages: 0 };

/** Search-and-select from the labour catalogue — same shape as CustomerPicker, for the Job Card "Add Labour Line" form. */
export function LabourItemPicker({ value, onChange }: LabourItemPickerProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query);

  const search = useApiQuery<PaginatedResult<LabourItemRef>>(
    () =>
      debouncedQuery
        ? apiGet(`/labour-items?search=${encodeURIComponent(debouncedQuery)}&isActive=true&pageSize=8`)
        : Promise.resolve(EMPTY_RESULT),
    [debouncedQuery],
  );

  if (value) {
    return (
      <div className="flex h-9 items-center justify-between rounded border border-line bg-surface-hover px-3">
        <span className="text-sm text-ink">
          {value.code} <span className="text-ink-muted">— {value.description}</span>
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
        placeholder="Search the labour catalogue…"
        className="h-9"
      />
      {isOpen && debouncedQuery ? (
        <div className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-card">
          {search.data && search.data.items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-ink-muted">No matching labour items.</p>
          ) : null}
          {search.data?.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={() => {
                onChange(item);
                setQuery('');
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-hover"
            >
              <span className="text-ink">
                {item.code} <span className="text-ink-muted">— {item.description}</span>
              </span>
              <span className="num text-xs text-ink-muted">{formatMoney(item.labourRate)}/hr</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

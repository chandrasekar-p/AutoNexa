'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import type { CustomerRef, PaginatedResult, Customer } from '@/lib/api-types';

interface CustomerPickerProps {
  value: CustomerRef | null;
  onChange: (customer: CustomerRef | null) => void;
  error?: string;
}

const EMPTY_RESULT: PaginatedResult<Customer> = { items: [], total: 0, page: 1, pageSize: 8, totalPages: 0 };

/**
 * A search-and-select for "which customer does this belong to" — first
 * built for the vehicle form (creating a vehicle needs an owning
 * customer), but written generically since Appointments/Estimates/Job
 * Cards will all need the exact same picker in later phases.
 */
export function CustomerPicker({ value, onChange, error }: CustomerPickerProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const debouncedQuery = useDebouncedValue(query);

  const search = useApiQuery<PaginatedResult<Customer>>(
    () =>
      debouncedQuery
        ? apiGet(`/customers?search=${encodeURIComponent(debouncedQuery)}&pageSize=8`)
        : Promise.resolve(EMPTY_RESULT),
    [debouncedQuery],
  );

  const items = search.data?.items ?? [];

  // A fresh set of results (new query, or the debounce finally landing)
  // always re-starts the highlight at the top — otherwise a stale index
  // from the previous result set could point at the wrong row, or past
  // the end of a shorter one.
  useEffect(() => {
    setHighlightedIndex(0);
  }, [items.length, debouncedQuery]);

  function select(customer: Customer) {
    onChange(customer);
    setQuery('');
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || items.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((i) => (i + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((i) => (i - 1 + items.length) % items.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = items[highlightedIndex] ?? items[0];
      if (chosen) select(chosen);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-secondary">Customer</span>
        <div className="flex h-10 items-center justify-between rounded border border-line bg-surface px-3">
          <span className="text-sm text-ink">
            {value.name} <span className="num text-ink-muted">· {value.mobile}</span>
          </span>
          <button type="button" onClick={() => onChange(null)} className="text-xs text-accent-600 hover:underline">
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <Input
        label="Customer"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-activedescendant={isOpen && items[highlightedIndex] ? `customer-picker-option-${items[highlightedIndex].id}` : undefined}
        placeholder="Search by name or mobile"
        error={error}
      />
      {isOpen && debouncedQuery ? (
        <div role="listbox" className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-card">
          {search.isLoading ? <p className="px-3 py-2 text-xs text-ink-muted">Searching…</p> : null}
          {search.data && search.data.items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-ink-muted">No customers found.</p>
          ) : null}
          {items.map((customer, index) => (
            <button
              key={customer.id}
              id={`customer-picker-option-${customer.id}`}
              role="option"
              aria-selected={index === highlightedIndex}
              type="button"
              // onMouseDown, not onClick — fires before the input's onBlur
              // closes this dropdown, so the click actually registers.
              onMouseDown={() => select(customer)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-left text-sm',
                index === highlightedIndex ? 'bg-accent-50 dark:bg-accent-500/15' : 'hover:bg-surface-hover',
              )}
            >
              <span className="text-ink">{customer.name}</span>
              <span className="num text-xs text-ink-muted">{customer.mobile}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

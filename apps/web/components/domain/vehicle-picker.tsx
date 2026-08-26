'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import type { PaginatedResult, VehicleListItem } from '@/lib/api-types';

interface VehiclePickerProps {
  value: VehicleListItem | null;
  onChange: (vehicle: VehicleListItem | null) => void;
  error?: string;
}

const EMPTY_RESULT: PaginatedResult<VehicleListItem> = { items: [], total: 0, page: 1, pageSize: 8, totalPages: 0 };

/** Search-and-select for "which vehicle" — same search-dropdown pattern as CustomerPicker, searching by registration number/brand/model. */
export function VehiclePicker({ value, onChange, error }: VehiclePickerProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const debouncedQuery = useDebouncedValue(query);

  const search = useApiQuery<PaginatedResult<VehicleListItem>>(
    () =>
      debouncedQuery
        ? apiGet(`/vehicles?search=${encodeURIComponent(debouncedQuery)}&pageSize=8`)
        : Promise.resolve(EMPTY_RESULT),
    [debouncedQuery],
  );

  const items = search.data?.items ?? [];

  useEffect(() => {
    setHighlightedIndex(0);
  }, [items.length, debouncedQuery]);

  function select(vehicle: VehicleListItem) {
    onChange(vehicle);
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
        <span className="text-xs font-medium text-ink-secondary">Vehicle</span>
        <div className="flex h-10 items-center justify-between rounded border border-line bg-surface px-3">
          <span className="text-sm text-ink">
            <span className="num">{value.registrationNo}</span>{' '}
            <span className="text-ink-muted">
              · {value.brand} {value.model} · {value.customerName}
            </span>
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
        label="Vehicle"
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
        aria-activedescendant={isOpen && items[highlightedIndex] ? `vehicle-picker-option-${items[highlightedIndex].id}` : undefined}
        placeholder="Search by registration number, brand, or model"
        error={error}
      />
      {isOpen && debouncedQuery ? (
        <div role="listbox" className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-card">
          {search.isLoading ? <p className="px-3 py-2 text-xs text-ink-muted">Searching…</p> : null}
          {search.data && search.data.items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-ink-muted">No vehicles found.</p>
          ) : null}
          {items.map((vehicle, index) => (
            <button
              key={vehicle.id}
              id={`vehicle-picker-option-${vehicle.id}`}
              role="option"
              aria-selected={index === highlightedIndex}
              type="button"
              // onMouseDown, not onClick — fires before the input's onBlur
              // closes this dropdown, so the click actually registers.
              onMouseDown={() => select(vehicle)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-left text-sm',
                index === highlightedIndex ? 'bg-accent-50 dark:bg-accent-500/15' : 'hover:bg-surface-hover',
              )}
            >
              <span className="num text-ink">{vehicle.registrationNo}</span>
              <span className="text-xs text-ink-muted">
                {vehicle.brand} {vehicle.model} · {vehicle.customerName}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

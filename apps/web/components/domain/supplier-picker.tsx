'use client';

import { useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { Input } from '@/components/ui/input';
import type { PaginatedResult, Supplier, SupplierRef } from '@/lib/api-types';

interface SupplierPickerProps {
  value: SupplierRef | null;
  onChange: (supplier: SupplierRef | null) => void;
  error?: string;
}

const EMPTY_RESULT: PaginatedResult<Supplier> = { items: [], total: 0, page: 1, pageSize: 8, totalPages: 0 };

/** Search-and-select for suppliers — same shape as CustomerPicker, for the Purchase Order form. */
export function SupplierPicker({ value, onChange, error }: SupplierPickerProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query);

  const search = useApiQuery<PaginatedResult<Supplier>>(
    () =>
      debouncedQuery
        ? apiGet(`/suppliers?search=${encodeURIComponent(debouncedQuery)}&isActive=true&pageSize=8`)
        : Promise.resolve(EMPTY_RESULT),
    [debouncedQuery],
  );

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-secondary">Supplier</span>
        <div className="flex h-10 items-center justify-between rounded border border-line bg-surface px-3">
          <span className="text-sm text-ink">{value.name}</span>
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
        label="Supplier"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        placeholder="Search suppliers by name"
        error={error}
      />
      {isOpen && debouncedQuery ? (
        <div className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-card">
          {search.data && search.data.items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-ink-muted">No suppliers found.</p>
          ) : null}
          {search.data?.items.map((supplier) => (
            <button
              key={supplier.id}
              type="button"
              onMouseDown={() => {
                onChange(supplier);
                setQuery('');
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-hover"
            >
              <span className="text-ink">{supplier.name}</span>
              <span className="text-xs text-ink-muted">{supplier.mobile ?? supplier.email ?? ''}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

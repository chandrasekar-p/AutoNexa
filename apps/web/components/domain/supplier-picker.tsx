'use client';

import { useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { Input } from '@/components/ui/input';
import type { PaginatedResult, Supplier } from '@/lib/api-types';

interface SupplierPickerProps {
  value: Supplier | null;
  onChange: (supplier: Supplier | null) => void;
  error?: string;
}

const EMPTY_RESULT: PaginatedResult<Supplier> = { items: [], total: 0, page: 1, pageSize: 8, totalPages: 0 };

/**
 * Search-and-select for suppliers — same shape as CustomerPicker, for the
 * Purchase Order form. Its search results are already full `Supplier`
 * objects (GSTIN/contactPerson/address included, not just the leaner
 * SupplierRef), so the "selected" summary below can show real contact/GST
 * details without a second fetch.
 */
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
        <div className="flex flex-col gap-2 rounded border border-line bg-surface px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">{value.name}</span>
            <button type="button" onClick={() => onChange(null)} className="text-xs text-accent-600 hover:underline">
              Change Supplier
            </button>
          </div>
          {value.contactPerson || value.mobile || value.gstin ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary">
              {value.contactPerson ? <span>{value.contactPerson}</span> : null}
              {value.mobile ? <span className="num">{value.mobile}</span> : null}
              {value.gstin ? <span className="num">{value.gstin}</span> : null}
            </div>
          ) : null}
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

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { apiGet } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { formatMoney } from '@/lib/format';
import type { SearchResults } from '@/lib/api-types';

interface ResultGroup {
  label: string;
  rows: Array<{ key: string; primary: string; secondary: string; href: string }>;
}

function buildGroups(results: SearchResults): ResultGroup[] {
  return [
    {
      label: 'Customers',
      rows: results.customers.map((c) => ({ key: c.id, primary: c.name, secondary: c.mobile, href: `/customers/${c.id}` })),
    },
    {
      label: 'Vehicles',
      rows: results.vehicles.map((v) => ({
        key: v.id,
        primary: v.registrationNo,
        secondary: `${v.brand} ${v.model}`,
        href: `/vehicles/${v.id}`,
      })),
    },
    {
      label: 'Job Cards',
      rows: results.jobCards.map((j) => ({ key: j.id, primary: j.jobCardNumber, secondary: j.status, href: `/job-cards/${j.id}` })),
    },
    {
      label: 'Invoices',
      rows: results.invoices.map((i) => ({
        key: i.id,
        primary: i.invoiceNumber,
        secondary: `${formatMoney(i.grandTotal)} · ${i.status}`,
        href: `/invoices/${i.id}`,
      })),
    },
    {
      label: 'Parts',
      rows: results.parts.map((p) => ({ key: p.id, primary: p.partNumber, secondary: p.name, href: `/parts-inventory/${p.id}` })),
    },
  ].filter((group) => group.rows.length > 0);
}

const EMPTY_RESULTS: SearchResults = { customers: [], vehicles: [], jobCards: [], invoices: [], parts: [] };

/** Global search box — GET /search?q=..., each category independently permission-gated server-side (see SearchService), so results naturally vary by role without any client-side filtering. */
export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query);

  const search = useApiQuery<SearchResults>(
    () => (debouncedQuery.length >= 2 ? apiGet(`/search?q=${encodeURIComponent(debouncedQuery)}`) : Promise.resolve(EMPTY_RESULTS)),
    [debouncedQuery],
  );

  const groups = search.data ? buildGroups(search.data) : [];

  function handleSelect(href: string) {
    setQuery('');
    setIsOpen(false);
    router.push(href);
  }

  // Ctrl+K (Cmd+K on Mac) jumps straight to the search box from anywhere
  // in the app shell — a global listener, not a focus-trap/command palette;
  // this is the same input already on screen, just given a keyboard shortcut.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full min-w-0 max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Search customers, vehicles, job cards…"
          className="h-9 w-full rounded border border-line bg-surface-hover pl-9 pr-14 text-sm text-ink placeholder:text-ink-muted focus:border-accent-400"
          aria-label="Global search"
        />
        {!query ? (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 text-micro font-medium text-ink-muted sm:block">
            Ctrl K
          </kbd>
        ) : null}
      </div>

      {isOpen && debouncedQuery.length >= 2 ? (
        <div className="absolute top-full z-30 mt-1 max-h-96 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-card">
          {search.isLoading ? <p className="px-3 py-3 text-xs text-ink-muted">Searching…</p> : null}
          {search.data && groups.length === 0 ? (
            <p className="px-3 py-3 text-xs text-ink-muted">No results for &ldquo;{debouncedQuery}&rdquo;.</p>
          ) : null}
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pt-2 text-micro font-semibold uppercase tracking-wide text-ink-muted">{group.label}</p>
              {group.rows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onMouseDown={() => handleSelect(row.href)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-hover"
                >
                  <span className="num text-ink">{row.primary}</span>
                  <span className="text-xs text-ink-muted">{row.secondary}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

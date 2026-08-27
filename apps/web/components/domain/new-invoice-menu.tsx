'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Plus } from 'lucide-react';

/**
 * There is no direct "create invoice" flow in this system — every field
 * on an Invoice is system-computed and the only way one comes into being
 * is POST /job-cards/:id/generate-invoice (see InvoicesController's own
 * doc comment). Rather than a fake create form, this is a real dropdown
 * to the one place that flow actually lives.
 */
export function NewInvoiceMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex h-9 items-center gap-1.5 rounded bg-accent-500 px-3.5 text-sm font-medium text-white hover:bg-accent-600 active:bg-accent-700"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        New Invoice
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>

      {isOpen ? (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-card">
          <Link
            href="/job-cards?status=READY_FOR_DELIVERY"
            role="menuitem"
            className="block px-3 py-2 text-left text-xs text-ink hover:bg-surface-hover"
            onClick={() => setIsOpen(false)}
          >
            Create from Completed Job Card
          </Link>
          <Link
            href="/job-cards?status=READY_FOR_DELIVERY"
            role="menuitem"
            className="block px-3 py-2 text-left text-xs text-ink hover:bg-surface-hover"
            onClick={() => setIsOpen(false)}
          >
            View Completed Job Cards
          </Link>
        </div>
      ) : null}
    </div>
  );
}

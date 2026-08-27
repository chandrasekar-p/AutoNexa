'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { apiGetBlob, ApiError } from '@/lib/api-client';
import { downloadBlob } from '@/lib/export/csv';
import { usePermission } from '@/lib/hooks/use-permission';
import { useMenuPosition } from '@/lib/hooks/use-menu-position';
import type { InvoiceListItem } from '@/lib/api-types';

interface InvoiceActionsMenuProps {
  invoice: Pick<InvoiceListItem, 'id' | 'invoiceNumber' | 'jobCard' | 'customerId' | 'status'>;
  onError: (message: string) => void;
}

/**
 * View / Download PDF / Print / Send / Record Payment / View Job Card /
 * View Customer / View Vehicle. No Cancel Invoice or Create Credit Note —
 * this system generates invoices already-final from a job card, with no
 * cancellation/credit-note flow anywhere in the backend (confirmed by
 * reading InvoicesController's own doc comment) — showing either would be
 * inventing backend behavior that doesn't exist. Record Payment links to
 * the detail page's own payments section rather than duplicating
 * RecordPaymentForm's logic in a second place.
 */
export function InvoiceActionsMenu({ invoice, onError }: InvoiceActionsMenuProps) {
  const canRecordPayment = usePermission('payment:create');
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const position = useMenuPosition(triggerRef, isOpen, () => setIsOpen(false));

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  async function handleDownload() {
    setIsOpen(false);
    setIsDownloading(true);
    try {
      const blob = await apiGetBlob(`/invoices/${invoice.id}/pdf`);
      downloadBlob(blob, `${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not download the invoice.');
    } finally {
      setIsDownloading(false);
    }
  }

  async function handlePrint() {
    setIsOpen(false);
    setIsPrinting(true);
    try {
      // Fetched the same authenticated way as Download (a plain
      // window.open on the raw API URL wouldn't carry the bearer token —
      // it lives in memory, not a cookie, so a bare navigation would just
      // 401) — then opened as a local blob URL so the browser's own PDF
      // viewer and its native print button can take over. No separate
      // print pipeline, just the existing PDF endpoint.
      const blob = await apiGetBlob(`/invoices/${invoice.id}/pdf`);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not open the invoice for printing.');
    } finally {
      setIsPrinting(false);
    }
  }

  const canPay = canRecordPayment && invoice.status !== 'PAID' && invoice.status !== 'REFUNDED';

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        disabled={isDownloading || isPrinting}
        aria-label="Invoice actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex h-7 w-7 items-center justify-center rounded text-ink-muted hover:bg-surface-hover hover:text-ink disabled:opacity-50"
      >
        <MoreVertical className="h-3.5 w-3.5" aria-hidden />
      </button>

      {isOpen && position ? (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ top: position.top, right: position.right }}
          className="fixed z-30 w-44 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-card"
        >
          <Link href={`/invoices/${invoice.id}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
            View Invoice
          </Link>
          <button type="button" role="menuitem" onClick={handleDownload} className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover">
            Download PDF
          </button>
          <button type="button" role="menuitem" onClick={handlePrint} className="block w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover">
            Print
          </button>
          <Link href={`/invoices/${invoice.id}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
            Send to Customer
          </Link>
          {canPay ? (
            <Link href={`/invoices/${invoice.id}#payments`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
              Record Payment
            </Link>
          ) : null}
          {invoice.jobCard ? (
            <Link href={`/job-cards/${invoice.jobCard.id}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
              View Job Card
            </Link>
          ) : null}
          <Link href={`/customers/${invoice.customerId}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
            View Customer
          </Link>
          {invoice.jobCard ? (
            <Link href={`/vehicles/${invoice.jobCard.vehicle.id}`} role="menuitem" className="block px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-hover" onClick={() => setIsOpen(false)}>
              View Vehicle
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

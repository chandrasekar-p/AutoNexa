'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/** No modal/dialog primitive existed anywhere in this app before — a minimal, reusable one (backdrop + centered panel, Escape-to-close, click-outside-to-close) rather than a one-off just for Stock Adjustment. */
export function Modal({ title, onClose, children, className }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-panel', className)}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-muted hover:text-ink">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

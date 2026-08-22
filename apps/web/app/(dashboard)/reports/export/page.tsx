'use client';

import { useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { apiGet, apiGetFile, ApiError } from '@/lib/api-client';
import { downloadBlob } from '@/lib/export/csv';
import { formatMoney } from '@/lib/format';
import type { GstExportFormat, GstExportPurchasesPreview, GstExportSalesPreview, GstExportSide } from '@/lib/api-types';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

function isSalesPreview(preview: GstExportSalesPreview | GstExportPurchasesPreview): preview is GstExportSalesPreview {
  return 'gstTotals' in preview;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro font-semibold uppercase tracking-wide text-ink-secondary">{label}</span>
      <span className="num text-lg font-semibold text-ink">{value}</span>
    </div>
  );
}

export default function GstExportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [side, setSide] = useState<GstExportSide>('sales');
  const [format, setFormat] = useState<GstExportFormat>('gstr-csv');

  const [preview, setPreview] = useState<GstExportSalesPreview | GstExportPurchasesPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [lastBatch, setLastBatch] = useState<{ batchNumber: string; warningCount: number; amendedCount: number } | null>(null);

  function buildQuery(extra?: Record<string, string>): string {
    return new URLSearchParams({ from, to, side, format, ...extra }).toString();
  }

  async function handlePreview() {
    if (!from || !to) {
      setPreviewError('Pick a period first.');
      return;
    }
    setIsPreviewing(true);
    setPreviewError(null);
    try {
      const data = await apiGet<GstExportSalesPreview | GstExportPurchasesPreview>(`/reports/export/gst?${buildQuery({ preview: 'true' })}`);
      setPreview(data);
    } catch (err) {
      setPreviewError(err instanceof ApiError ? err.message : 'Could not preview this export.');
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleDownload() {
    if (!from || !to) {
      setDownloadError('Pick a period first.');
      return;
    }
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const { blob, filename, headers } = await apiGetFile(`/reports/export/gst?${buildQuery()}`);
      downloadBlob(blob, filename ?? `gst-export-${side}.${format === 'gstr-csv' ? 'csv' : 'xml'}`);
      setLastBatch({
        batchNumber: headers.get('X-Export-Batch-Number') ?? '',
        warningCount: Number(headers.get('X-Export-Warning-Count') ?? '0'),
        amendedCount: Number(headers.get('X-Export-Amended-Count') ?? '0'),
      });
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : 'Could not generate this export.');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">GST / Tally Export</h1>
        <p className="text-sm text-ink-secondary">
          Reconciled export files for your accountant — a GSTR-1/3B-ready CSV, or Tally-importable vouchers. This doesn&rsquo;t sync
          live with Tally; you import the downloaded file yourself.
        </p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4 pt-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
            <Select label="Side" value={side} onChange={(e) => setSide(e.target.value as GstExportSide)}>
              <option value="sales">Sales</option>
              <option value="purchases">Purchases</option>
            </Select>
            <Select label="Format" value={format} onChange={(e) => setFormat(e.target.value as GstExportFormat)}>
              <option value="gstr-csv">GSTR-ready CSV</option>
              <option value="tally-xml">Tally XML</option>
            </Select>
          </div>

          {side === 'purchases' ? (
            <p className="text-xs text-ink-muted">
              Purchase-side figures are approximate — see the warnings after previewing/downloading for what&rsquo;s affected.
            </p>
          ) : null}

          <div className="flex gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={handlePreview} isLoading={isPreviewing}>
              <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Preview
            </Button>
            <Button type="button" onClick={handleDownload} isLoading={isDownloading}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Download
            </Button>
          </div>

          {previewError ? <ErrorState message={previewError} /> : null}
          {downloadError ? <ErrorState message={downloadError} /> : null}

          {lastBatch ? (
            <p className="rounded border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
              Downloaded as batch <span className="num font-medium">{lastBatch.batchNumber}</span>
              {lastBatch.warningCount > 0 ? ` — ${lastBatch.warningCount} warning(s)` : ''}
              {lastBatch.amendedCount > 0 ? `, ${lastBatch.amendedCount} amended voucher(s)` : ''}. Check the downloaded file for
              details.
            </p>
          ) : null}
        </CardBody>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            {preview.supersedesBatchNumber ? (
              <p className="rounded border border-warning-100 bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400">
                Supersedes batch <span className="num font-medium">{preview.supersedesBatchNumber}</span> — re-importing into Tally
                will duplicate vouchers already there unless you remove those first.
              </p>
            ) : null}

            {isSalesPreview(preview) ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat label="Invoices" value={preview.gstTotals.invoiceCount} />
                <Stat label="Subtotal" value={formatMoney(preview.gstTotals.subtotal)} />
                <Stat label="CGST" value={formatMoney(preview.gstTotals.cgstAmount)} />
                <Stat label="SGST" value={formatMoney(preview.gstTotals.sgstAmount)} />
                <Stat label="IGST" value={formatMoney(preview.gstTotals.igstAmount)} />
                <Stat label="Grand Total" value={formatMoney(preview.gstTotals.grandTotal)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat label="Purchase Invoices" value={preview.itcTotals.invoiceCount} />
                <Stat label="Taxable Value" value={formatMoney(preview.itcTotals.taxableValue)} />
                <Stat label="ITC Available" value={formatMoney(preview.itcTotals.taxAmount)} />
              </div>
            )}

            {preview.warnings.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-secondary">Warnings</span>
                <ul className="flex flex-col gap-1">
                  {preview.warnings.map((warning, i) => (
                    <li key={i} className="text-xs text-warning-700 dark:text-warning-400">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {preview.amended.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-secondary">Amended since last export</span>
                <ul className="flex flex-col divide-y divide-line">
                  {preview.amended.map((entry) => (
                    <li key={entry.sourceId} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-ink">{entry.referenceNumber}</span>
                      <span className="num text-ink-secondary">
                        {formatMoney(entry.previousAmount)} → {formatMoney(entry.currentAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

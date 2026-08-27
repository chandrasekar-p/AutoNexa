'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, Download, Link2, Printer, Send } from 'lucide-react';
import { apiGet, apiGetBlob, apiPost, ApiError } from '@/lib/api-client';
import { downloadBlob } from '@/lib/export/csv';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { usePermission } from '@/lib/hooks/use-permission';
import { formatDate, formatMoney } from '@/lib/format';
import type { DeliveryChannel, DeliveryStatus, InvoiceDetail, PaymentMethod } from '@/lib/api-types';
import { InvoiceDisplayStatusBadge } from '@/components/domain/invoice-display-status-badge';
import { RecordPaymentForm } from '@/components/domain/record-payment-form';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/table';

const CHANNEL_LABEL: Record<DeliveryChannel, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  SLACK: 'Slack',
};

function summarizeSendAttempts(attempts: { channel: DeliveryChannel; status: DeliveryStatus }[]): {
  tone: 'success' | 'warning' | 'danger';
  message: string;
} {
  const sent = attempts.filter((a) => a.status === 'SENT').map((a) => CHANNEL_LABEL[a.channel]);
  const failed = attempts.filter((a) => a.status === 'FAILED').map((a) => CHANNEL_LABEL[a.channel]);
  const skipped = attempts.every((a) => a.status === 'SKIPPED');

  if (skipped) {
    return {
      tone: 'warning',
      message: 'Not sent — no Email/SMS/WhatsApp provider is configured, or this customer has no email or mobile on file.',
    };
  }
  if (sent.length > 0 && failed.length === 0) {
    return { tone: 'success', message: `Sent via ${sent.join(' and ')}.` };
  }
  if (sent.length > 0 && failed.length > 0) {
    return { tone: 'warning', message: `Sent via ${sent.join(', ')} — ${failed.join(', ')} failed.` };
  }
  return { tone: 'danger', message: `Could not send via ${failed.join(', ')}.` };
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  credit: 'Credit',
  razorpay: 'Razorpay',
};

function SummaryRow({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={emphasized ? 'text-sm font-medium text-ink' : 'text-sm text-ink-secondary'}>{label}</span>
      <span className={emphasized ? 'num text-base font-semibold text-ink' : 'num text-sm text-ink'}>{value}</span>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const canRecordPayment = usePermission('payment:create');
  const canSend = usePermission('invoice:read');
  // Same permission as manual payment recording, matching the backend's
  // POST /invoices/:id/payment-link gate — anyone who can record a payment
  // can also generate/send a link for one.
  const canSendPaymentLink = usePermission('payment:create');

  const query = useApiQuery<InvoiceDetail>(() => apiGet(`/invoices/${params.id}`), [params.id]);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ tone: 'success' | 'warning' | 'danger'; message: string } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [linkResult, setLinkResult] = useState<{ tone: 'success' | 'warning' | 'danger'; message: string } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  async function handleSend() {
    setIsSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const result = await apiPost<{ attempts: { channel: DeliveryChannel; status: DeliveryStatus }[] }>(
        `/invoices/${params.id}/send`,
      );
      setSendResult(summarizeSendAttempts(result.attempts));
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Could not send the invoice.');
    } finally {
      setIsSending(false);
    }
  }

  // Independent of Email/SMS/WhatsApp — this is the fallback when nothing
  // is configured or the customer has no email/mobile on file: the owner
  // can always grab the PDF directly instead of depending on delivery.
  async function handleDownload() {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const blob = await apiGetBlob(`/invoices/${params.id}/pdf`);
      downloadBlob(blob, `${query.data?.invoiceNumber ?? 'invoice'}.pdf`);
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : 'Could not download the invoice.');
    } finally {
      setIsDownloading(false);
    }
  }

  async function handlePrint() {
    setIsPrinting(true);
    setPrintError(null);
    try {
      const blob = await apiGetBlob(`/invoices/${params.id}/pdf`);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setPrintError(err instanceof ApiError ? err.message : 'Could not open the invoice for printing.');
    } finally {
      setIsPrinting(false);
    }
  }

  async function handleSendPaymentLink() {
    setIsSendingLink(true);
    setLinkError(null);
    setLinkResult(null);
    try {
      const result = await apiPost<{ attempts: { channel: DeliveryChannel; status: DeliveryStatus }[] }>(
        `/invoices/${params.id}/payment-link`,
      );
      setLinkResult(summarizeSendAttempts(result.attempts));
      query.refetch(); // picks up the invoice's new pendingGatewayOrderId, if that ever needs surfacing later
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.message : 'Could not send the payment link.');
    } finally {
      setIsSendingLink(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.error) {
    return <ErrorState message={query.error} onRetry={query.refetch} />;
  }

  const invoice = query.data;
  if (!invoice) return null;

  // Server-computed — never re-derived client-side, same discipline as
  // every other module's derived-field rule (see paidAmount/dueAmount on
  // InvoiceFields).
  const totalPaid = invoice.paidAmount;
  const outstanding = Number(invoice.dueAmount);
  const hasDiscount = Number(invoice.loyaltyDiscountAmount) > 0;
  // subtotal is already post-discount (the proportional discount is baked
  // into line totals before the GST split, see applyProRataDiscount in
  // discount.ts) — reconstruct the pre-discount figure for display only.
  const preDiscountSubtotal = Number(invoice.subtotal) + Number(invoice.loyaltyDiscountAmount);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="num text-2xl font-semibold text-ink">{invoice.invoiceNumber}</h1>
            <InvoiceDisplayStatusBadge status={invoice.displayStatus} />
          </div>
          <p className="text-sm text-ink-secondary">
            {formatDate(invoice.createdAt)}
            {invoice.dueDate ? <span className="text-ink-muted"> · Due {formatDate(invoice.dueDate)}</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canSend ? (
            <Button variant="secondary" size="sm" onClick={handlePrint} isLoading={isPrinting}>
              <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Print
            </Button>
          ) : null}
          {canSend ? (
            <Button variant="secondary" size="sm" onClick={handleDownload} isLoading={isDownloading}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Download PDF
            </Button>
          ) : null}
          {canSend ? (
            <Button variant="secondary" size="sm" onClick={handleSend} isLoading={isSending}>
              <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Send Invoice
            </Button>
          ) : null}
          {canSendPaymentLink && outstanding > 0 ? (
            <Button variant="secondary" size="sm" onClick={handleSendPaymentLink} isLoading={isSendingLink}>
              <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Send Payment Link
            </Button>
          ) : null}
          <Link href="/invoices" className="text-sm text-ink-secondary hover:text-ink">
            &larr; Back to invoices
          </Link>
        </div>
      </div>

      {downloadError ? <ErrorState message={downloadError} /> : null}
      {printError ? <ErrorState message={printError} /> : null}
      {sendError ? <ErrorState message={sendError} /> : null}
      {linkError ? <ErrorState message={linkError} /> : null}

      {invoice.displayStatus === 'OVERDUE' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 dark:border-warning-500/30 dark:bg-warning-500/10">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" aria-hidden />
            <p className="text-sm text-warning-800 dark:text-warning-300">
              This invoice is <span className="num font-medium">{invoice.overdueDays}</span> day{invoice.overdueDays === 1 ? '' : 's'} past its due
              date ({invoice.dueDate ? formatDate(invoice.dueDate) : '—'}), with <span className="num font-medium">{formatMoney(outstanding)}</span>{' '}
              still outstanding.
            </p>
          </div>
          {canSend ? (
            <Button variant="secondary" size="sm" onClick={handleSend} isLoading={isSending}>
              <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Send Reminder
            </Button>
          ) : null}
        </div>
      ) : null}
      {linkResult ? (
        <p
          className={
            linkResult.tone === 'success'
              ? 'rounded border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400'
              : linkResult.tone === 'warning'
                ? 'rounded border border-warning-100 bg-warning-50 px-3 py-2 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400'
                : 'rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400'
          }
        >
          {linkResult.message}
        </p>
      ) : null}
      {sendResult ? (
        <p
          className={
            sendResult.tone === 'success'
              ? 'rounded border border-success-100 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400'
              : sendResult.tone === 'warning'
                ? 'rounded border border-warning-100 bg-warning-50 px-3 py-2 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400'
                : 'rounded border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400'
          }
        >
          {sendResult.message}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={`/customers/${invoice.customer.id}`}
          className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-card hover:border-accent-400"
        >
          <span className="text-sm font-medium text-ink">{invoice.customer.name}</span>
          <span className="num text-xs text-ink-muted">{invoice.customer.mobile}</span>
        </Link>
        {invoice.jobCard ? (
          <Link
            href={`/vehicles/${invoice.jobCard.vehicle.id}`}
            className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-card hover:border-accent-400"
          >
            <span className="num text-sm font-medium text-ink">{invoice.jobCard.vehicle.registrationNo}</span>
            <span className="text-xs text-ink-muted">
              {invoice.jobCard.vehicle.brand} {invoice.jobCard.vehicle.model}
            </span>
          </Link>
        ) : null}
        {invoice.jobCard ? (
          <Link
            href={`/job-cards/${invoice.jobCard.id}`}
            className="flex flex-col gap-0.5 rounded-lg border border-line bg-surface px-4 py-3 shadow-card hover:border-accent-400"
          >
            <span className="num text-sm font-medium text-ink">{invoice.jobCard.jobCardNumber}</span>
            <span className="text-xs text-ink-muted">Source job card · {formatDate(invoice.jobCard.createdAt)}</span>
          </Link>
        ) : null}
      </div>

      {invoice.jobCard && (invoice.jobCard.serviceAdvisor || invoice.jobCard.technician) ? (
        <Card>
          <CardHeader>
            <CardTitle>Job Information</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-ink-muted">Service Advisor</p>
              <p className="text-sm text-ink">{invoice.jobCard.serviceAdvisor?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Technician</p>
              <p className="text-sm text-ink">{invoice.jobCard.technician?.user.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Job Date</p>
              <p className="text-sm text-ink">{formatDate(invoice.jobCard.createdAt)}</p>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardBody>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell>HSN/SAC</TableHeaderCell>
                <TableHeaderCell>Qty</TableHeaderCell>
                <TableHeaderCell>Unit Price</TableHeaderCell>
                <TableHeaderCell>GST %</TableHeaderCell>
                <TableHeaderCell>Line Total</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {invoice.lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="num text-ink-secondary">{item.hsnSac ?? '—'}</TableCell>
                  <TableCell className="num">{item.quantity}</TableCell>
                  <TableCell className="num">{formatMoney(item.unitPrice)}</TableCell>
                  <TableCell className="num">{item.gstRate}%</TableCell>
                  <TableCell className="num font-medium">{formatMoney(item.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Billing Breakdown</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            {hasDiscount ? (
              <>
                <SummaryRow label="Subtotal (before discount)" value={formatMoney(preDiscountSubtotal)} />
                <SummaryRow label="Loyalty Discount" value={`− ${formatMoney(invoice.loyaltyDiscountAmount)}`} />
                <div className="border-t border-line pt-2">
                  <SummaryRow label="Taxable Amount" value={formatMoney(invoice.subtotal)} />
                </div>
              </>
            ) : (
              <SummaryRow label="Subtotal" value={formatMoney(invoice.subtotal)} />
            )}
            {Number(invoice.cgstAmount) > 0 ? <SummaryRow label="CGST" value={formatMoney(invoice.cgstAmount)} /> : null}
            {Number(invoice.sgstAmount) > 0 ? <SummaryRow label="SGST" value={formatMoney(invoice.sgstAmount)} /> : null}
            {Number(invoice.igstAmount) > 0 ? <SummaryRow label="IGST" value={formatMoney(invoice.igstAmount)} /> : null}
            <SummaryRow label="Round Off" value={formatMoney(invoice.roundOff)} />
            <div className="border-t border-line pt-2">
              <SummaryRow label="Grand Total" value={formatMoney(invoice.grandTotal)} emphasized />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <SummaryRow label="Paid" value={formatMoney(totalPaid)} />
              <SummaryRow label="Outstanding" value={formatMoney(outstanding)} emphasized />
            </div>

            {invoice.payments.length === 0 ? (
              <p className="text-sm text-ink-muted">No payments recorded yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {invoice.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-ink">
                      {formatDate(payment.paymentDate)} · {METHOD_LABEL[payment.method]}
                      {payment.referenceNumber ? <span className="text-ink-muted"> ({payment.referenceNumber})</span> : null}
                    </span>
                    <span className="num text-ink">{formatMoney(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            )}

            {canRecordPayment && invoice.status !== 'PAID' && invoice.status !== 'REFUNDED' ? (
              <RecordPaymentForm invoiceId={invoice.id} onRecorded={() => query.refetch()} />
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

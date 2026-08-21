import PDFDocument from 'pdfkit';

const ACCENT = '#c07333'; // matches the app's copper accent (see apps/web's design system + report PDF export)
const INK = '#111111';
const MUTED = '#666666';
const LINE = '#e2e2e2';

export interface InvoicePdfLineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  gstRate: string;
  lineTotal: string;
  hsnSac: string | null;
}

export interface InvoicePdfData {
  workshopName: string;
  logoBuffer: Buffer | null;
  invoiceNumber: string;
  createdAt: Date;
  customerName: string;
  customerMobile: string;
  lineItems: InvoicePdfLineItem[];
  subtotal: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  roundOff: string;
  grandTotal: string;
}

function money(value: string): string {
  return `Rs. ${Number(value).toFixed(2)}`;
}

const COLUMNS = [
  { key: 'description', label: 'Description', x: 40, width: 200 },
  { key: 'hsnSac', label: 'HSN/SAC', x: 240, width: 60 },
  { key: 'quantity', label: 'Qty', x: 300, width: 40 },
  { key: 'unitPrice', label: 'Rate', x: 340, width: 65 },
  { key: 'gstRate', label: 'GST%', x: 405, width: 40 },
  { key: 'lineTotal', label: 'Amount', x: 445, width: 110 },
] as const;
const PAGE_BOTTOM = 750;

/** Server-side invoice PDF, attached to the resend email — see MessagingService.notifyCustomer's attachments param and InvoicesService.resend. */
export function buildInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const textX = 40;
    let headerX = textX;
    if (data.logoBuffer) {
      try {
        doc.image(data.logoBuffer, 40, 40, { width: 48, height: 48 });
        headerX = 100;
      } catch {
        // Logo format pdfkit couldn't decode — skip it rather than failing the whole PDF.
      }
    }

    doc.fontSize(16).fillColor(INK).text(data.workshopName, headerX, 44);
    doc.fontSize(9).fillColor(MUTED).text(`Invoice ${data.invoiceNumber}`, headerX, 66);
    doc.text(`Date: ${data.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, headerX, 79);

    doc.fontSize(9).fillColor(MUTED).text('Bill To', 400, 44, { width: 155, align: 'right' });
    doc.fontSize(11).fillColor(INK).text(data.customerName, 400, 58, { width: 155, align: 'right' });
    doc.fontSize(9).fillColor(MUTED).text(data.customerMobile, 400, 74, { width: 155, align: 'right' });

    let y = 120;
    doc
      .moveTo(40, y)
      .lineTo(555, y)
      .strokeColor(ACCENT)
      .lineWidth(2)
      .stroke();
    y += 12;

    doc.fontSize(9).fillColor('#fff');
    doc.rect(40, y, 515, 20).fill(ACCENT);
    for (const col of COLUMNS) {
      doc.fillColor('#fff').text(col.label, col.x + 4, y + 6, { width: col.width - 8, align: col.key === 'description' ? 'left' : 'right' });
    }
    y += 20;

    doc.fontSize(9);
    for (const item of data.lineItems) {
      if (y > PAGE_BOTTOM) {
        doc.addPage();
        y = 40;
      }
      const rowValues: Record<(typeof COLUMNS)[number]['key'], string> = {
        description: item.description,
        hsnSac: item.hsnSac ?? '—',
        quantity: item.quantity,
        unitPrice: money(item.unitPrice),
        gstRate: `${item.gstRate}%`,
        lineTotal: money(item.lineTotal),
      };
      for (const col of COLUMNS) {
        doc
          .fillColor(INK)
          .text(rowValues[col.key], col.x + 4, y + 5, { width: col.width - 8, align: col.key === 'description' ? 'left' : 'right' });
      }
      y += 22;
      doc.moveTo(40, y).lineTo(555, y).strokeColor(LINE).lineWidth(0.5).stroke();
    }

    y += 14;
    if (y > PAGE_BOTTOM - 100) {
      doc.addPage();
      y = 40;
    }

    const totalsRow = (label: string, value: string, emphasize = false) => {
      doc
        .fontSize(emphasize ? 11 : 9)
        .fillColor(emphasize ? INK : MUTED)
        .text(label, 350, y, { width: 105, align: 'left' });
      doc
        .fontSize(emphasize ? 11 : 9)
        .fillColor(INK)
        .text(value, 445, y, { width: 110, align: 'right' });
      y += emphasize ? 20 : 16;
    };

    totalsRow('Subtotal', money(data.subtotal));
    if (Number(data.cgstAmount) > 0) totalsRow('CGST', money(data.cgstAmount));
    if (Number(data.sgstAmount) > 0) totalsRow('SGST', money(data.sgstAmount));
    if (Number(data.igstAmount) > 0) totalsRow('IGST', money(data.igstAmount));
    if (Number(data.roundOff) !== 0) totalsRow('Round Off', money(data.roundOff));
    doc.moveTo(350, y).lineTo(555, y).strokeColor(LINE).lineWidth(0.5).stroke();
    y += 6;
    totalsRow('Grand Total', money(data.grandTotal), true);

    doc.end();
  });
}

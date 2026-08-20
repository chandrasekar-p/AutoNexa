import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { resolveUploadUrl } from '../uploads';

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error ?? new Error('Could not read logo'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function imageFormatFromDataUrl(dataUrl: string): string {
  const match = /^data:image\/(\w+);/.exec(dataUrl);
  const type = match?.[1]?.toUpperCase() ?? 'PNG';
  return type === 'JPG' ? 'JPEG' : type;
}

interface ExportPdfOptions {
  title: string;
  workshopName: string | null;
  /** The workshop's own logo (TenantSettings.logoUrl, a relative /uploads path) — not the AutoNexa platform logo, per-tenant branding. */
  logoUrl: string | null;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  filename: string;
}

/** Client-side PDF generation — no server round-trip, since the report data is already loaded in the browser. The logo is fetched and inlined as a data URL because jsPDF's addImage needs raw image bytes, not a URL. */
export async function exportRowsAsPdf({ title, workshopName, logoUrl, columns, rows, filename }: ExportPdfOptions): Promise<void> {
  const doc = new jsPDF();
  const startX = 14;
  let cursorY = 18;
  let textX = startX;

  if (logoUrl) {
    const dataUrl = await loadImageAsDataUrl(resolveUploadUrl(logoUrl));
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, imageFormatFromDataUrl(dataUrl), startX, cursorY - 10, 18, 18);
        textX = startX + 22;
      } catch {
        // Logo format jsPDF couldn't decode — skip it rather than failing the whole export.
      }
    }
  }

  doc.setFontSize(14);
  doc.text(workshopName ?? 'AutoNexa', textX, cursorY);
  cursorY += 7;
  doc.setFontSize(11);
  doc.text(title, textX, cursorY);
  cursorY += 5;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, textX, cursorY);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: cursorY + 8,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ''))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [192, 115, 51] }, // accent-500 — matches the app's signature copper accent
  });

  doc.save(filename);
}

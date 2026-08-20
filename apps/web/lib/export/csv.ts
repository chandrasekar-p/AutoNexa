/** Escapes a single CSV field per RFC 4180 — wraps in quotes and doubles any embedded quote whenever the value contains a comma, quote, or newline. */
function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Builds a CSV string from column headers + row objects, then triggers a browser download — no server round-trip, the report data is already loaded client-side. */
export function exportRowsAsCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[], filename: string): void {
  const lines = [
    columns.map((c) => escapeCsvField(c.label)).join(','),
    ...rows.map((row) => columns.map((c) => escapeCsvField(row[c.key])).join(',')),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Minimal RFC-4180 CSV encoding — no library dependency, matching this
 * codebase's preference for small pure functions over pulling in a package
 * for something this narrow. A field is quoted only when it needs to be
 * (contains a comma, quote, or newline); embedded quotes are doubled.
 */
function csvField(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsvRow(fields: (string | number)[]): string {
  return fields.map(csvField).join(',');
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map(toCsvRow).join('\n');
}

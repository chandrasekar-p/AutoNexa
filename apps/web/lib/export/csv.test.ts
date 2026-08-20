import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportRowsAsCsv } from './csv';

describe('exportRowsAsCsv', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * jsdom's Blob has no working .text()/.arrayBuffer(), so instead of
   * round-tripping through a real Blob, this captures exactly what was
   * passed into `new Blob([content], ...)` — the CSV string itself.
   */
  function captureCsvContent(): () => string {
    let captured = '';
    const OriginalBlob = globalThis.Blob;
    vi.stubGlobal(
      'Blob',
      class extends OriginalBlob {
        constructor(parts: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options);
          captured = parts.join('');
        }
      },
    );
    URL.createObjectURL = (() => 'blob:mock') as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    return () => captured;
  }

  it('builds a header row plus one row per record', () => {
    const getContent = captureCsvContent();
    exportRowsAsCsv(
      [
        { key: 'name', label: 'Name' },
        { key: 'total', label: 'Total' },
      ],
      [
        { name: 'Arun Prakash', total: '₹1200' },
        { name: 'Demo Owner', total: '₹500' },
      ],
      'test.csv',
    );
    expect(getContent()).toBe('Name,Total\r\nArun Prakash,₹1200\r\nDemo Owner,₹500');
  });

  it('quotes a field containing a comma (e.g. a formatted money amount)', () => {
    const getContent = captureCsvContent();
    exportRowsAsCsv([{ key: 'total', label: 'Total' }], [{ total: '₹1,200' }], 'test.csv');
    expect(getContent()).toBe('Total\r\n"₹1,200"');
  });

  it('quotes and escapes fields containing commas, quotes, or newlines', () => {
    const getContent = captureCsvContent();
    exportRowsAsCsv([{ key: 'note', label: 'Note' }], [{ note: 'Says "hello", then\nnewline' }], 'test.csv');
    expect(getContent()).toBe('Note\r\n"Says ""hello"", then\nnewline"');
  });

  it('renders null/undefined values as empty fields', () => {
    const getContent = captureCsvContent();
    exportRowsAsCsv([{ key: 'value', label: 'Value' }], [{ value: null }, { value: undefined }], 'test.csv');
    expect(getContent()).toBe('Value\r\n\r\n');
  });
});

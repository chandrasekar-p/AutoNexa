import { resolveConvertedLabourLine } from '../src/modules/job-cards/resolve-converted-labour-line';

describe('resolveConvertedLabourLine', () => {
  it('uses the estimate line rate/gstRate and leaves labourItemId undefined when there is no catalogue match', () => {
    const result = resolveConvertedLabourLine({ unitPrice: 600, gstRate: 18 }, null);
    expect(result).toEqual({ labourItemId: undefined, rate: 600, gstRate: 18 });
  });

  it('populates labourItemId from a catalogue match but still charges the estimate-approved price, not the catalogue rate', () => {
    // Simulates the catalogue price having drifted since the estimate was
    // approved (e.g. labour rates went up) — the customer approved 600 at
    // 18% GST, so that's what must be charged, even though the matched
    // LabourItem now prices this work at 750 / 28%.
    const result = resolveConvertedLabourLine(
      { unitPrice: 600, gstRate: 18 },
      { id: 'labour-item-1' },
    );
    expect(result).toEqual({ labourItemId: 'labour-item-1', rate: 600, gstRate: 18 });
  });
});

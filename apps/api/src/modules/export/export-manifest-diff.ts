import { Prisma } from '@prisma/client';

/** One voucher's footprint in a GstExportBatch.manifest JSON blob. `amount` is stored as a plain string (JSON has no Decimal type). */
export interface ManifestEntry {
  type: string;
  sourceId: string;
  referenceNumber: string;
  amount: string;
}

export interface AmendedEntry {
  sourceId: string;
  referenceNumber: string;
  previousAmount: string;
  currentAmount: string;
}

/**
 * Compares the current export's line-up against a prior batch's manifest
 * for the same (overlapping) period. A voucher present in both with a
 * changed amount means it was edited after the last export — today that's
 * only possible for PurchaseInvoice (Invoice has no edit path at all, see
 * the architecture doc's amendments section). Returned entries are meant
 * to be flagged distinctly in the new export ("AMENDED — was X, now Y"),
 * never silently blended in as if unchanged or newly added.
 */
export function diffManifest(previousEntries: ManifestEntry[], currentEntries: ManifestEntry[]): AmendedEntry[] {
  const previousById = new Map(previousEntries.map((e) => [e.sourceId, e]));
  const amended: AmendedEntry[] = [];

  for (const current of currentEntries) {
    const previous = previousById.get(current.sourceId);
    if (!previous) continue;
    if (!new Prisma.Decimal(previous.amount).equals(new Prisma.Decimal(current.amount))) {
      amended.push({
        sourceId: current.sourceId,
        referenceNumber: current.referenceNumber,
        previousAmount: previous.amount,
        currentAmount: current.amount,
      });
    }
  }

  return amended;
}

/**
 * True when two manifests cover exactly the same set of vouchers at exactly
 * the same amounts — order-independent. Used to make re-exporting an
 * unchanged period idempotent: rather than minting a new batch number every
 * time an accountant re-downloads the same file, the export re-attaches to
 * the existing batch reference so re-importing it into Tally is recognizably
 * "the same batch", not a new one.
 */
export function manifestsAreEqual(a: ManifestEntry[], b: ManifestEntry[]): boolean {
  if (a.length !== b.length) return false;
  const byIdA = new Map(a.map((e) => [e.sourceId, e.amount]));
  return b.every((entry) => {
    const amountA = byIdA.get(entry.sourceId);
    return amountA !== undefined && new Prisma.Decimal(amountA).equals(new Prisma.Decimal(entry.amount));
  });
}

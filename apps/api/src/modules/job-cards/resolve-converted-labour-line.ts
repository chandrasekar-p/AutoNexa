import { Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

export interface EstimateLabourLineInput {
  unitPrice: Decimalish;
  gstRate: Decimalish;
}

export interface MatchedLabourItem {
  id: string;
}

export interface ConvertedLabourLine {
  labourItemId: string | undefined;
  rate: Decimalish;
  gstRate: Decimalish;
}

/**
 * Estimate -> Job Card conversion, LABOUR line resolution. Pure so the
 * approved-price-integrity rule below is unit-testable without a DB —
 * mirrors job-card-status-transitions.ts's approach.
 *
 * `rate`/`gstRate` ALWAYS come from the estimate line's own approved
 * unitPrice/gstRate — that's the price the customer actually approved. A
 * catalogue LabourItem match by description only populates `labourItemId`
 * for reporting/categorization; it must never override the approved price,
 * even if the catalogue rate has since changed. (Live catalogue pricing is
 * what a *direct* POST /job-cards/:id/labour add uses instead — approved-
 * price integrity is the rule specifically for a conversion.)
 */
export function resolveConvertedLabourLine(
  line: EstimateLabourLineInput,
  matchedLabourItem: MatchedLabourItem | null,
): ConvertedLabourLine {
  return {
    labourItemId: matchedLabourItem?.id,
    rate: line.unitPrice,
    gstRate: line.gstRate,
  };
}

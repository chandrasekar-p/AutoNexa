import { Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

export interface PartMarginInput {
  quantity: Decimalish;
  sellingPrice: Decimalish;
  purchasePrice: Decimalish;
}

/**
 * (sellingPrice - purchasePrice) x quantity for one JobCardPart line.
 * `purchasePrice` here is necessarily the Part's CURRENT purchase price —
 * JobCardPart only snapshots the selling price it charged (unitPrice), not
 * a cost basis, so if a part's purchase price has changed since it was
 * consumed, this margin is an approximation, not a precise historical
 * figure. Documented here and in the README, not silently presented as
 * exact.
 */
export function calculatePartMargin(item: PartMarginInput): Prisma.Decimal {
  return new Prisma.Decimal(item.sellingPrice).sub(item.purchasePrice).mul(item.quantity).toDecimalPlaces(2);
}

/**
 * GET /reports/profit-margin's headline number: parts margin (computed,
 * approximate — see calculatePartMargin) plus labour revenue counted at
 * 100% margin, since this system has no per-technician cost/pay-rate data
 * to net against labour revenue. This is NOT a true profit figure — it
 * ignores rent, salaries, overhead, and any technician cost — it's a
 * parts-margin + gross-labour-revenue estimate only. Presented as such in
 * the API response shape (separate `partsMargin`/`labourRevenue` fields
 * alongside the combined total), not collapsed into one unqualified
 * "profit" number.
 */
export function calculateTotalMargin(partsMargin: Decimalish, labourRevenue: Decimalish): Prisma.Decimal {
  return new Prisma.Decimal(partsMargin).add(labourRevenue).toDecimalPlaces(2);
}

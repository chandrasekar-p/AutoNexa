import { BadRequestException } from '@nestjs/common';
import { LoyaltyTransactionType, Prisma } from '@prisma/client';

/**
 * The single place every loyalty balance change goes through — earning
 * (invoices.service.ts), redemption (invoices.service.ts), and manual
 * corrections (loyalty.service.ts) all call this instead of each
 * reimplementing the guarded-decrement + ledger-write pair. Must run
 * inside the caller's own transaction (same requirement as
 * generate-sequence-number.ts's `tx` param) so the balance change and its
 * ledger row commit or roll back together — see
 * Customer.loyaltyPointsBalance's "never write one without the other"
 * doc comment.
 *
 * `delta` negative = spending points (guarded — rejects if it would go
 * negative, same shape as job-cards/stock-guard.ts's part-stock
 * decrement). `delta` positive = adding points (earning, or an upward
 * manual correction) — no guard needed, it can't fail.
 */
export async function adjustLoyaltyBalance(
  tx: Prisma.TransactionClient,
  customerId: string,
  delta: number,
  entry: { invoiceId: string | null; type: LoyaltyTransactionType; note?: string; adjustedByUserId?: string },
) {
  if (delta < 0) {
    const updated = await tx.customer.updateMany({
      where: { id: customerId, loyaltyPointsBalance: { gte: -delta } },
      data: { loyaltyPointsBalance: { decrement: -delta } },
    });
    if (updated.count === 0) throw new BadRequestException('Requested points exceed the customer\'s loyalty balance');
  } else {
    await tx.customer.update({ where: { id: customerId }, data: { loyaltyPointsBalance: { increment: delta } } });
  }

  const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
  return tx.loyaltyTransaction.create({
    data: {
      customerId,
      points: delta,
      balanceAfter: customer.loyaltyPointsBalance,
      ...entry,
    } as unknown as Prisma.LoyaltyTransactionUncheckedCreateInput,
  });
}

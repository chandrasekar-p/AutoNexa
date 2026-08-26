import { InspectionResult, InspectionStatus, Prisma } from '@prisma/client';

/**
 * Only IN_PROGRESS/COMPLETED are ever stored (see InspectionStatus). Pending
 * Review and Overdue are operational labels layered on top of IN_PROGRESS,
 * computed fresh on every read — same "computed status, never persisted"
 * pattern as computeWarrantyStatus/computeServiceDue.
 */
export type InspectionDisplayStatus = 'IN_PROGRESS' | 'PENDING_REVIEW' | 'OVERDUE' | 'COMPLETED';

export const INSPECTION_DISPLAY_STATUSES: InspectionDisplayStatus[] = [
  'IN_PROGRESS',
  'PENDING_REVIEW',
  'OVERDUE',
  'COMPLETED',
];

/** An inspection still open this long after it started is flagged Overdue regardless of checklist progress. */
export const INSPECTION_OVERDUE_THRESHOLD_HOURS = 24;

function overdueCutoff(now: Date): Date {
  return new Date(now.getTime() - INSPECTION_OVERDUE_THRESHOLD_HOURS * 60 * 60 * 1000);
}

/**
 * Single-record version, used to annotate list/detail rows. Precedence:
 * COMPLETED (stored) > OVERDUE (open too long) > PENDING_REVIEW (every
 * checklist item has a result, just not signed off yet) > IN_PROGRESS.
 */
export function computeInspectionDisplayStatus(
  inspection: { status: InspectionStatus; createdAt: Date; items: { result: InspectionResult }[] },
  now: Date = new Date(),
): InspectionDisplayStatus {
  if (inspection.status === InspectionStatus.COMPLETED) return 'COMPLETED';
  if (inspection.createdAt <= overdueCutoff(now)) return 'OVERDUE';
  const hasUncheckedItem = inspection.items.length === 0 || inspection.items.some((i) => i.result === InspectionResult.NOT_CHECKED);
  return hasUncheckedItem ? 'IN_PROGRESS' : 'PENDING_REVIEW';
}

/** completedAt is frozen at completion time so this doesn't keep growing on every later read of an already-completed inspection. */
export function computeInspectionDurationMinutes(createdAt: Date, completedAt: Date | null, now: Date = new Date()): number {
  const end = completedAt ?? now;
  return Math.max(0, Math.round((end.getTime() - createdAt.getTime()) / 60000));
}

/**
 * The aggregate-count mirror of computeInspectionDisplayStatus, expressed as
 * real Prisma where-filters (relational `items.none`/`items.some`, not a
 * fetch-everything-then-reduce-in-JS scan) — kept in sync with that
 * function's precedence by hand since Prisma can't run arbitrary JS inside
 * a count() query. Used by both InspectionsService.summary() and the list
 * endpoint's ?status= filter.
 */
export function inspectionDisplayStatusWhere(displayStatus: InspectionDisplayStatus, now: Date = new Date()): Prisma.InspectionWhereInput {
  const cutoff = overdueCutoff(now);
  switch (displayStatus) {
    case 'COMPLETED':
      return { status: InspectionStatus.COMPLETED };
    case 'OVERDUE':
      return { status: InspectionStatus.IN_PROGRESS, createdAt: { lte: cutoff } };
    case 'PENDING_REVIEW':
      return {
        status: InspectionStatus.IN_PROGRESS,
        createdAt: { gt: cutoff },
        AND: [{ items: { some: {} } }, { items: { none: { result: InspectionResult.NOT_CHECKED } } }],
      };
    case 'IN_PROGRESS':
      return {
        status: InspectionStatus.IN_PROGRESS,
        createdAt: { gt: cutoff },
        OR: [{ items: { none: {} } }, { items: { some: { result: InspectionResult.NOT_CHECKED } } }],
      };
  }
}

import { JobCardStatus } from '@prisma/client';
import {
  JOB_CARD_STATUS_TRANSITIONS,
  isValidJobCardTransition,
} from '../src/modules/job-cards/job-card-status-transitions';

describe('isValidJobCardTransition', () => {
  it('allows each documented forward transition in the pipeline', () => {
    expect(isValidJobCardTransition(JobCardStatus.OPEN, JobCardStatus.DIAGNOSIS)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.DIAGNOSIS, JobCardStatus.WAITING_APPROVAL)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.WAITING_APPROVAL, JobCardStatus.APPROVED)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.APPROVED, JobCardStatus.IN_PROGRESS)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.IN_PROGRESS, JobCardStatus.WAITING_PARTS)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.IN_PROGRESS, JobCardStatus.QUALITY_CHECK)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.WAITING_PARTS, JobCardStatus.IN_PROGRESS)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.QUALITY_CHECK, JobCardStatus.IN_PROGRESS)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.QUALITY_CHECK, JobCardStatus.READY_FOR_DELIVERY)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.READY_FOR_DELIVERY, JobCardStatus.DELIVERED)).toBe(true);
  });

  it('allows cancellation from every non-terminal, non-post-QC state', () => {
    expect(isValidJobCardTransition(JobCardStatus.OPEN, JobCardStatus.CANCELLED)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.DIAGNOSIS, JobCardStatus.CANCELLED)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.WAITING_APPROVAL, JobCardStatus.CANCELLED)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.APPROVED, JobCardStatus.CANCELLED)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.IN_PROGRESS, JobCardStatus.CANCELLED)).toBe(true);
    expect(isValidJobCardTransition(JobCardStatus.WAITING_PARTS, JobCardStatus.CANCELLED)).toBe(true);
  });

  it('rejects skipping stages', () => {
    expect(isValidJobCardTransition(JobCardStatus.OPEN, JobCardStatus.APPROVED)).toBe(false);
    expect(isValidJobCardTransition(JobCardStatus.OPEN, JobCardStatus.IN_PROGRESS)).toBe(false);
    expect(isValidJobCardTransition(JobCardStatus.WAITING_APPROVAL, JobCardStatus.IN_PROGRESS)).toBe(false);
  });

  it('rejects moving backwards out of order', () => {
    expect(isValidJobCardTransition(JobCardStatus.APPROVED, JobCardStatus.OPEN)).toBe(false);
    expect(isValidJobCardTransition(JobCardStatus.IN_PROGRESS, JobCardStatus.DIAGNOSIS)).toBe(false);
  });

  it('rejects cancelling once quality-checked or beyond', () => {
    expect(isValidJobCardTransition(JobCardStatus.QUALITY_CHECK, JobCardStatus.CANCELLED)).toBe(false);
    expect(isValidJobCardTransition(JobCardStatus.READY_FOR_DELIVERY, JobCardStatus.CANCELLED)).toBe(false);
  });

  it('treats DELIVERED and CANCELLED as terminal — zero allowed transitions out', () => {
    expect(JOB_CARD_STATUS_TRANSITIONS[JobCardStatus.DELIVERED]).toHaveLength(0);
    expect(JOB_CARD_STATUS_TRANSITIONS[JobCardStatus.CANCELLED]).toHaveLength(0);

    for (const to of Object.values(JobCardStatus)) {
      expect(isValidJobCardTransition(JobCardStatus.DELIVERED, to)).toBe(false);
      expect(isValidJobCardTransition(JobCardStatus.CANCELLED, to)).toBe(false);
    }
  });
});

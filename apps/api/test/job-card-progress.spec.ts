import { computeJobCardPipelineProgress } from '../src/modules/job-cards/job-card-progress';

describe('computeJobCardPipelineProgress', () => {
  it('is null for CANCELLED — a cancelled job has no pipeline position', () => {
    expect(computeJobCardPipelineProgress('CANCELLED')).toBeNull();
  });

  it('is 100 for DELIVERED (last of 8 pipeline steps)', () => {
    expect(computeJobCardPipelineProgress('DELIVERED')).toBe(100);
  });

  it('is 13 for OPEN (1st of 8 steps, rounded from 12.5)', () => {
    expect(computeJobCardPipelineProgress('OPEN')).toBe(13);
  });

  it('gives WAITING_PARTS the same ordinal as IN_PROGRESS — a lateral branch, not forward motion', () => {
    expect(computeJobCardPipelineProgress('WAITING_PARTS')).toBe(computeJobCardPipelineProgress('IN_PROGRESS'));
  });

  it('increases monotonically through the happy path', () => {
    const order = ['OPEN', 'DIAGNOSIS', 'WAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'QUALITY_CHECK', 'READY_FOR_DELIVERY', 'DELIVERED'] as const;
    const values = order.map((s) => computeJobCardPipelineProgress(s)!);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});

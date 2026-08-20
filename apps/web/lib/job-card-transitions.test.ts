import { describe, expect, it } from 'vitest';
import { getValidJobCardTransitions, JOB_CARD_STATUS_TRANSITIONS } from './job-card-transitions';
import type { JobCardStatus } from './api-types';

describe('getValidJobCardTransitions', () => {
  it('DELIVERED and CANCELLED are terminal — no valid transitions out', () => {
    expect(getValidJobCardTransitions('DELIVERED')).toEqual([]);
    expect(getValidJobCardTransitions('CANCELLED')).toEqual([]);
  });

  it('IN_PROGRESS branches to three possible next states', () => {
    expect(getValidJobCardTransitions('IN_PROGRESS')).toEqual(['WAITING_PARTS', 'QUALITY_CHECK', 'CANCELLED']);
  });

  it('every status is cancellable except the two terminal ones and QUALITY_CHECK/READY_FOR_DELIVERY (matches the backend map exactly)', () => {
    const cancellable: JobCardStatus[] = ['OPEN', 'DIAGNOSIS', 'WAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'WAITING_PARTS'];
    for (const status of cancellable) {
      expect(getValidJobCardTransitions(status)).toContain('CANCELLED');
    }
    expect(getValidJobCardTransitions('QUALITY_CHECK')).not.toContain('CANCELLED');
    expect(getValidJobCardTransitions('READY_FOR_DELIVERY')).not.toContain('CANCELLED');
  });

  it('every status has an entry in the map (no silently-missing status)', () => {
    const allStatuses: JobCardStatus[] = [
      'OPEN',
      'DIAGNOSIS',
      'WAITING_APPROVAL',
      'APPROVED',
      'IN_PROGRESS',
      'WAITING_PARTS',
      'QUALITY_CHECK',
      'READY_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ];
    for (const status of allStatuses) {
      expect(JOB_CARD_STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });
});

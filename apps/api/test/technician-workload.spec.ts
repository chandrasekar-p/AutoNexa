import { deriveTechnicianAvailability, computeWorkloadPercent } from '../src/modules/technicians/technician-workload';

describe('deriveTechnicianAvailability', () => {
  it('is AVAILABLE for an ACTIVE technician with no open job cards', () => {
    expect(deriveTechnicianAvailability('ACTIVE', 0)).toBe('AVAILABLE');
  });

  it('is ON_JOB for an ACTIVE technician with at least one open job card', () => {
    expect(deriveTechnicianAvailability('ACTIVE', 1)).toBe('ON_JOB');
    expect(deriveTechnicianAvailability('ACTIVE', 5)).toBe('ON_JOB');
  });

  it('is ON_LEAVE regardless of open job count', () => {
    expect(deriveTechnicianAvailability('ON_LEAVE', 0)).toBe('ON_LEAVE');
    expect(deriveTechnicianAvailability('ON_LEAVE', 3)).toBe('ON_LEAVE');
  });

  it('is INACTIVE regardless of open job count', () => {
    expect(deriveTechnicianAvailability('INACTIVE', 0)).toBe('INACTIVE');
    expect(deriveTechnicianAvailability('INACTIVE', 3)).toBe('INACTIVE');
  });
});

describe('computeWorkloadPercent', () => {
  it('computes a plain ratio', () => {
    expect(computeWorkloadPercent(2, 4)).toBe(50);
    expect(computeWorkloadPercent(3, 4)).toBe(75);
    expect(computeWorkloadPercent(1, 4)).toBe(25);
  });

  it('clamps at 100 when over-assigned past capacity', () => {
    expect(computeWorkloadPercent(6, 4)).toBe(100);
  });

  it('is 0 for zero open jobs', () => {
    expect(computeWorkloadPercent(0, 4)).toBe(0);
  });

  it('never divides by zero — treats a zero/negative capacity as always-full once any job is open', () => {
    expect(computeWorkloadPercent(0, 0)).toBe(0);
    expect(computeWorkloadPercent(1, 0)).toBe(100);
  });
});

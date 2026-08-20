import { describe, expect, it } from 'vitest';
import { decideOn401 } from './refresh-decision';

function decide(overrides: Partial<Parameters<typeof decideOn401>[0]> = {}) {
  return decideOn401({
    status: 401,
    alreadyRetried: false,
    refreshInFlight: false,
    isAuthEndpoint: false,
    ...overrides,
  });
}

describe('decideOn401', () => {
  it('proceeds for any non-401 status', () => {
    expect(decide({ status: 200 })).toBe('proceed');
    expect(decide({ status: 404 })).toBe('proceed');
    expect(decide({ status: 500 })).toBe('proceed');
  });

  it('fails immediately for a 401 from an auth endpoint (bad login credentials, or refresh itself failing)', () => {
    expect(decide({ isAuthEndpoint: true })).toBe('fail');
    // Even mid-refresh-storm, an auth-endpoint 401 never tries to refresh.
    expect(decide({ isAuthEndpoint: true, refreshInFlight: true })).toBe('fail');
  });

  it('fails if this request has already been retried once and is still 401', () => {
    expect(decide({ alreadyRetried: true })).toBe('fail');
  });

  it('starts a refresh when none is in flight yet', () => {
    expect(decide({ refreshInFlight: false })).toBe('start-refresh');
  });

  it('awaits the in-flight refresh instead of starting a second one — the stampede guard', () => {
    expect(decide({ refreshInFlight: true })).toBe('await-inflight');
  });

  it('prioritizes alreadyRetried over refreshInFlight — a second retry never re-awaits', () => {
    expect(decide({ alreadyRetried: true, refreshInFlight: true })).toBe('fail');
  });
});

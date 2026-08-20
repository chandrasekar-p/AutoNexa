/**
 * Pure decision logic for the api-client's 401-refresh-retry flow —
 * deliberately separated from the actual fetch calls (see api-client.ts)
 * so it's unit-testable without mocking `fetch` at all. Mirrors the
 * backend's own discipline of extracting decision logic into pure,
 * tested functions (e.g. job-card-status-transitions.ts,
 * resolve-converted-labour-line.ts).
 */

export type RefreshAction =
  /** Not a 401 — nothing to do, return the response as-is. */
  | 'proceed'
  /** A refresh is already in flight (some other concurrent request
   *  triggered it) — await that same promise instead of starting a
   *  second one. This is the stampede guard. */
  | 'await-inflight'
  /** No refresh in flight yet — this caller should start one. */
  | 'start-refresh'
  /** Already retried once and still 401, or this was an auth-endpoint
   *  401 (e.g. bad login credentials, or the refresh call itself
   *  failing) — give up, surface the error, and clear auth state. */
  | 'fail';

export interface RefreshDecisionInput {
  status: number;
  /** This is the retried request already (its first attempt already failed once). */
  alreadyRetried: boolean;
  /** A refresh call is currently in flight, shared across callers. */
  refreshInFlight: boolean;
  /** True for /auth/login and /auth/refresh — never worth refreshing off of. */
  isAuthEndpoint: boolean;
}

export function decideOn401(input: RefreshDecisionInput): RefreshAction {
  if (input.status !== 401) return 'proceed';
  if (input.isAuthEndpoint) return 'fail';
  if (input.alreadyRetried) return 'fail';
  if (input.refreshInFlight) return 'await-inflight';
  return 'start-refresh';
}

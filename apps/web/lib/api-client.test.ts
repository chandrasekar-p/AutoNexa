import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const API_URL = 'http://test-api.local';

function mockResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

describe('apiFetch — refresh/retry orchestration', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', API_URL);
    vi.resetModules(); // fresh accessToken/refreshPromise module state per test
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('retries a 401 after a successful refresh, using the new token', async () => {
    const { apiFetch, setAccessToken } = await import('./api-client');
    setAccessToken('stale-token');

    let refreshCalls = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === `${API_URL}/auth/refresh`) {
        refreshCalls += 1;
        return mockResponse(200, { accessToken: 'fresh-token', expiresIn: '15m' });
      }
      const auth = new Headers(init?.headers).get('Authorization');
      if (auth === 'Bearer fresh-token') return mockResponse(200, { ok: true });
      return mockResponse(401, { message: 'Unauthorized' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch<{ ok: boolean }>('/widgets');

    expect(result).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
  });

  it('a stampede of concurrent 401s triggers exactly one refresh call, and every request still succeeds', async () => {
    const { apiFetch, setAccessToken } = await import('./api-client');
    setAccessToken('stale-token');

    let refreshCalls = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === `${API_URL}/auth/refresh`) {
        refreshCalls += 1;
        // Simulate real latency so every concurrent request's 401 lands
        // before the refresh resolves — this is exactly the window where
        // a buggy implementation would fire a refresh per request.
        await new Promise((resolve) => setTimeout(resolve, 10));
        return mockResponse(200, { accessToken: 'fresh-token', expiresIn: '15m' });
      }
      const auth = new Headers(init?.headers).get('Authorization');
      if (auth === 'Bearer fresh-token') return mockResponse(200, { ok: true });
      return mockResponse(401, { message: 'Unauthorized' });
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await Promise.all(
      ['/a', '/b', '/c', '/d', '/e'].map((path) => apiFetch<{ ok: boolean }>(path)),
    );

    expect(results).toEqual(Array(5).fill({ ok: true }));
    expect(refreshCalls).toBe(1);
  });

  it('a later, independent 401 triggers its own fresh refresh cycle (refreshPromise correctly resets, never stuck)', async () => {
    const { apiFetch, setAccessToken } = await import('./api-client');
    setAccessToken('stale-token');

    let refreshCalls = 0;
    let aAttempts = 0;
    let bAttempts = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url === `${API_URL}/auth/refresh`) {
        refreshCalls += 1;
        return mockResponse(200, { accessToken: `token-${refreshCalls}`, expiresIn: '15m' });
      }
      if (url === `${API_URL}/a`) {
        aAttempts += 1;
        // First attempt 401s (stale token); succeeds on retry once refreshed.
        return aAttempts === 1 ? mockResponse(401, { message: 'Unauthorized' }) : mockResponse(200, { ok: true });
      }
      if (url === `${API_URL}/b`) {
        bAttempts += 1;
        // First attempt 401s too, even though a refresh already happened
        // for /a — simulating this token being independently rejected
        // (e.g. expired moments later). This can only succeed if
        // refreshPromise reset to null after cycle 1 and a genuinely new
        // refresh runs for cycle 2, rather than the guard staying "stuck"
        // thinking a refresh is perpetually in flight.
        return bAttempts === 1 ? mockResponse(401, { message: 'Unauthorized' }) : mockResponse(200, { ok: true });
      }
      throw new Error(`unexpected fetch to ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/a');
    expect(refreshCalls).toBe(1);

    await apiFetch('/b');
    expect(refreshCalls).toBe(2);
  });

  it('clears auth and throws when the refresh itself fails', async () => {
    const { apiFetch, setAccessToken, setUnauthorizedHandler } = await import('./api-client');
    setAccessToken('stale-token');

    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    const fetchMock = vi.fn(async (url: string) => {
      if (url === `${API_URL}/auth/refresh`) return mockResponse(401, { message: 'Invalid refresh token' });
      return mockResponse(401, { message: 'Unauthorized' });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/widgets')).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not attempt a refresh for a 401 from /auth/login (bad credentials)', async () => {
    const { apiFetch } = await import('./api-client');

    const fetchMock = vi.fn(async () =>
      mockResponse(401, { message: 'Invalid workshop, email, or password' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      message: 'Invalid workshop, email, or password',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1); // no refresh attempt made
  });

  it('never retries more than once even if the refreshed token is also rejected', async () => {
    const { apiFetch, setAccessToken } = await import('./api-client');
    setAccessToken('stale-token');

    const fetchMock = vi.fn(async (url: string) => {
      if (url === `${API_URL}/auth/refresh`) {
        return mockResponse(200, { accessToken: 'still-bad-token', expiresIn: '15m' });
      }
      return mockResponse(401, { message: 'Unauthorized' });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/widgets')).rejects.toThrow();
    // 1 initial request + 1 refresh call + 1 retry = 3, never an infinite loop.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

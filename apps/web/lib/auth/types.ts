export interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  /**
   * GET /auth/me (used to restore a session after a silent refresh, e.g.
   * on page reload) doesn't return `name` — only `{userId, tenantId,
   * email, permissions, isSuperAdmin}`, since it's decoded straight off
   * the JWT payload. AuthProvider fills this in with a second, best-effort
   * call to GET /users/me right after, so `name` is reliable in practice;
   * it's still optional here because that second call could in principle
   * fail transiently — Topbar falls back to `email` if so.
   */
  name?: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: string;
  user: {
    id: string;
    name: string;
    email: string;
    tenantId: string;
    roles: string[];
  };
}

export interface MeResponse {
  userId: string;
  tenantId: string;
  email: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

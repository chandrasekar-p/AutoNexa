export interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  /**
   * Only reliably populated right after a fresh login this session — the
   * backend's GET /auth/me (used to restore a session after a silent
   * refresh, e.g. on page reload) doesn't currently return `name`, only
   * `{userId, tenantId, email, permissions, isSuperAdmin}`. See
   * apps/web/README.md "Auth architecture" for the full explanation and
   * where the UI falls back to `email` instead. This is a real backend
   * gap worth a tiny follow-up (add `name` to AuthenticatedUser/JWT
   * payload), not something the frontend can fully paper over.
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

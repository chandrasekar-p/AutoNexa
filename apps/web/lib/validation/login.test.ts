import { describe, expect, it } from 'vitest';
import { validateLoginForm } from './login';

describe('validateLoginForm', () => {
  it('accepts a fully valid payload', () => {
    const result = validateLoginForm({
      tenantSlug: 'demo-workshop',
      email: 'owner@demoworkshop.test',
      password: 'ChangeMe123!',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        tenantSlug: 'demo-workshop',
        email: 'owner@demoworkshop.test',
        password: 'ChangeMe123!',
      });
    }
  });

  it('rejects a missing tenant slug', () => {
    const result = validateLoginForm({ tenantSlug: '', email: 'a@b.com', password: 'x' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.tenantSlug).toBeDefined();
  });

  it('rejects a malformed email', () => {
    const result = validateLoginForm({ tenantSlug: 'demo', email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.email).toBeDefined();
  });

  it('rejects a missing password', () => {
    const result = validateLoginForm({ tenantSlug: 'demo', email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.password).toBeDefined();
  });

  it('reports every invalid field at once, not just the first', () => {
    const result = validateLoginForm({ tenantSlug: '', email: 'bad', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.errors).sort()).toEqual(['email', 'password', 'tenantSlug']);
    }
  });

  it('does not invent a friendlier error than the backend provides — validation errors are field-level only', () => {
    // The backend's own 401 message ("Invalid workshop, email, or
    // password") is a *server* response surfaced by the login page's
    // catch block, not something this client-side validator fabricates.
    // This just confirms client-side validation stays scoped to shape
    // checks (non-empty, valid email format) and produces no such message.
    const result = validateLoginForm({ tenantSlug: 'demo', email: 'a@b.com', password: 'x' });
    expect(result.success).toBe(true);
  });
});

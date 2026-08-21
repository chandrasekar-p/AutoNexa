import { describe, expect, it } from 'vitest';
import { validateCreateUserForm } from './user';

const VALID = { name: 'Ravi Tech', email: 'ravi@demoworkshop.test', password: 'ChangeMe123!', roleIds: ['role-1'] };

describe('validateCreateUserForm', () => {
  it('accepts a valid payload with no phone', () => {
    const result = validateCreateUserForm(VALID);
    expect(result.success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = validateCreateUserForm({ ...VALID, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.name).toBeDefined();
  });

  it('rejects a malformed email', () => {
    const result = validateCreateUserForm({ ...VALID, email: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.email).toBeDefined();
  });

  it('rejects a password under 8 characters', () => {
    const result = validateCreateUserForm({ ...VALID, password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.password).toBeDefined();
  });

  it('rejects a malformed phone but accepts a blank one', () => {
    const bad = validateCreateUserForm({ ...VALID, phone: '12345' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.errors.phone).toBeDefined();

    const blank = validateCreateUserForm({ ...VALID, phone: '' });
    expect(blank.success).toBe(true);
  });

  it('rejects no roles selected', () => {
    const result = validateCreateUserForm({ ...VALID, roleIds: [] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.roleIds).toBeDefined();
  });
});

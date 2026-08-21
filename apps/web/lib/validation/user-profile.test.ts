import { describe, expect, it } from 'vitest';
import { validateUserProfileForm } from './user-profile';

describe('validateUserProfileForm', () => {
  it('accepts a name-only payload (phone is optional)', () => {
    const result = validateUserProfileForm({ name: 'Demo Owner' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = validateUserProfileForm({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.name).toBeDefined();
  });

  it('normalizes a blank phone to undefined', () => {
    const result = validateUserProfileForm({ name: 'Demo Owner', phone: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBeUndefined();
  });

  it('accepts a populated phone', () => {
    const result = validateUserProfileForm({ name: 'Demo Owner', phone: '9000011111' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe('9000011111');
  });

  it('rejects a malformed phone', () => {
    const result = validateUserProfileForm({ name: 'Demo Owner', phone: '12345' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.phone).toBeDefined();
  });
});

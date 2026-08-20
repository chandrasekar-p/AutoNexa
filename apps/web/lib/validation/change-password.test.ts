import { describe, expect, it } from 'vitest';
import { validateChangePasswordForm } from './change-password';

describe('validateChangePasswordForm', () => {
  it('accepts a valid payload where both password fields match', () => {
    const result = validateChangePasswordForm({
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass456!',
      confirmPassword: 'NewPass456!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing current password', () => {
    const result = validateChangePasswordForm({
      currentPassword: '',
      newPassword: 'NewPass456!',
      confirmPassword: 'NewPass456!',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.currentPassword).toBeDefined();
  });

  it('rejects a new password under 8 characters', () => {
    const result = validateChangePasswordForm({
      currentPassword: 'OldPass123!',
      newPassword: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.newPassword).toBeDefined();
  });

  it('rejects mismatched new/confirm passwords, attributed to the confirm field', () => {
    const result = validateChangePasswordForm({
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass456!',
      confirmPassword: 'Different789!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.confirmPassword).toBeDefined();
      expect(result.errors.newPassword).toBeUndefined();
    }
  });
});

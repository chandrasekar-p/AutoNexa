import { describe, expect, it } from 'vitest';
import { validateAppointmentForm } from './appointment';

describe('validateAppointmentForm', () => {
  it('accepts a minimal valid payload', () => {
    const result = validateAppointmentForm({
      serviceType: 'General Service',
      appointmentDate: '2026-08-25',
      appointmentTime: '10:30 AM',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing service type, date, or time', () => {
    const result = validateAppointmentForm({ serviceType: '', appointmentDate: '', appointmentTime: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.serviceType).toBeDefined();
      expect(result.errors.appointmentDate).toBeDefined();
      expect(result.errors.appointmentTime).toBeDefined();
    }
  });

  it('normalizes blank optional fields to undefined', () => {
    const result = validateAppointmentForm({
      serviceType: 'General Service',
      appointmentDate: '2026-08-25',
      appointmentTime: '10:30 AM',
      serviceAdvisorId: '',
      technicianId: '',
      notes: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.serviceAdvisorId).toBeUndefined();
      expect(result.data.technicianId).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });
});

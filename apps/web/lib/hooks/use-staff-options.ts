'use client';

import { useApiQuery } from './use-api-query';
import { apiGet } from '../api-client';
import type { StaffRef } from '../api-types';

interface RawUser {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * Best-effort staff list for the service-advisor/technician assignment
 * dropdowns on Appointments/Inspections — GET /users requires `user:read`,
 * which Receptionist and Technician (the roles most likely to be the ones
 * actually creating an appointment or starting an inspection) don't have
 * by default (see default-role-grants.ts). Rather than block the whole
 * form on a permission most of its users won't have, this fails silently
 * — `isAvailable: false` tells the caller to just hide the field, same
 * pattern as Topbar's useWorkshopName for GET /tenants/me.
 */
export function useStaffOptions(): { options: StaffRef[]; isAvailable: boolean; isLoading: boolean } {
  const query = useApiQuery<RawUser[]>(() => apiGet('/users'), []);

  return {
    options: (query.data ?? []).filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name })),
    isAvailable: query.data !== null && !query.error,
    isLoading: query.isLoading,
  };
}

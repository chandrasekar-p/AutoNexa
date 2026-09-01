'use client';

import { useState } from 'react';
import { apiDelete, ApiError } from '@/lib/api-client';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface DeleteRoleModalProps {
  role: { id: string; name: string };
  /** Computed client-side from GET /users, filtered by role id — real data, not a guess. */
  assignedUserCount: number;
  onClose: () => void;
  onDeleted: () => void;
}

/**
 * "Delete "{name}"? This action cannot be undone." Blocks the confirm
 * button when assignedUserCount > 0 (the same rule RolesService.remove()
 * enforces server-side) so the user sees the warning before ever calling
 * the API — the 400 + its exact message is still handled as a fallback in
 * case the client's view of assignments is stale.
 */
export function DeleteRoleModal({ role, assignedUserCount, onClose, onDeleted }: DeleteRoleModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      await apiDelete(`/roles/${role.id}`);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this role.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Modal title={`Delete "${role.name}"?`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-secondary">This action cannot be undone.</p>

        {assignedUserCount > 0 ? (
          <p className="rounded border border-warning-100 bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400">
            This role is currently assigned to {assignedUserCount} user{assignedUserCount === 1 ? '' : 's'}. Reassign
            {assignedUserCount === 1 ? ' them' : ' them'} before deleting.
          </p>
        ) : null}

        {error ? <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={handleDelete} isLoading={isDeleting} disabled={assignedUserCount > 0}>
            Delete Role
          </Button>
        </div>
      </div>
    </Modal>
  );
}

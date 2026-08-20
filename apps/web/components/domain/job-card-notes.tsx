'use client';

import { useState } from 'react';
import { apiPost, ApiError } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { JobCardNoteEntry } from '@/lib/api-types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface JobCardNotesProps {
  jobCardId: string;
  notes: JobCardNoteEntry[];
  canAdd: boolean;
  onAdded: () => void;
}

/** Append-only — no edit/delete endpoint exists (see the schema's own comment on JobCardNote: "never edited or removed"). */
export function JobCardNotes({ jobCardId, notes, canAdd, onAdded }: JobCardNotesProps) {
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!note.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiPost(`/job-cards/${jobCardId}/notes`, { note: note.trim() });
      setNote('');
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add note.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {notes.length === 0 ? (
        <p className="text-sm text-ink-muted">No notes yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {notes.map((n) => (
            <li key={n.id} className="flex flex-col gap-0.5 py-2.5">
              <span className="text-sm text-ink">{n.note}</span>
              <span className="text-xs text-ink-muted">{formatDate(n.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}

      {canAdd ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" rows={2} />
          {error ? <span className="text-xs text-danger-600 dark:text-danger-400">{error}</span> : null}
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={handleAdd} isLoading={isSaving}>
              Add Note
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

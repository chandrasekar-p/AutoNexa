'use client';

import { useRef, useState } from 'react';
import { apiDelete, apiPost, ApiError } from '@/lib/api-client';
import { resolveUploadUrl } from '@/lib/uploads';
import type { InspectionPhoto } from '@/lib/api-types';
import { Button } from '@/components/ui/button';

interface InspectionPhotosProps {
  inspectionId: string;
  photos: InspectionPhoto[];
  readOnly: boolean;
  onUploaded: () => void;
}

export function InspectionPhotos({ inspectionId, photos, readOnly, onUploaded }: InspectionPhotosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'inspection-photo');
      formData.append('entityId', inspectionId);
      const uploaded = await apiPost<{ url: string; fileName: string }>('/uploads', formData);
      await apiPost(`/inspections/${inspectionId}/photos`, { fileUrl: uploaded.url, fileName: uploaded.fileName });
      onUploaded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload photo.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove(photoId: string) {
    if (!window.confirm('Remove this photo? This cannot be undone.')) return;
    setRemovingId(photoId);
    setError(null);
    try {
      await apiDelete(`/inspections/${inspectionId}/photos/${photoId}`);
      onUploaded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove photo.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {photos.length === 0 && readOnly ? <p className="text-sm text-ink-muted">No photos uploaded.</p> : null}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-line">
              <a
                href={resolveUploadUrl(photo.fileUrl)}
                target="_blank"
                rel="noreferrer"
                className="block h-full w-full bg-surface-hover bg-cover bg-center"
                style={{ backgroundImage: `url(${resolveUploadUrl(photo.fileUrl)})` }}
                aria-label={photo.fileName ?? 'Inspection photo'}
              />
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => handleRemove(photo.id)}
                  disabled={removingId === photo.id}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-60"
                  aria-label="Remove photo"
                >
                  {removingId === photo.id ? '…' : 'Remove'}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {!readOnly ? (
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} isLoading={isUploading}>
            Upload Photo
          </Button>
          {error ? <span className="text-xs text-danger-600 dark:text-danger-400">{error}</span> : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';
import { apiPost, ApiError } from '@/lib/api-client';
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

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploaded = await apiPost<{ url: string; fileName: string }>('/uploads', formData);
      await apiPost(`/inspections/${inspectionId}/photos`, { fileUrl: uploaded.url, fileName: uploaded.fileName });
      onUploaded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload photo.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {photos.length === 0 && readOnly ? <p className="text-sm text-ink-muted">No photos uploaded.</p> : null}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <a
              key={photo.id}
              href={resolveUploadUrl(photo.fileUrl)}
              target="_blank"
              rel="noreferrer"
              className="aspect-square overflow-hidden rounded-lg border border-line bg-surface-hover bg-cover bg-center"
              style={{ backgroundImage: `url(${resolveUploadUrl(photo.fileUrl)})` }}
              aria-label={photo.fileName ?? 'Inspection photo'}
            />
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

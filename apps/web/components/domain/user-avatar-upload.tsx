'use client';

import { useRef, useState } from 'react';
import { apiPost, ApiError } from '@/lib/api-client';
import { Avatar } from '@/components/ui/avatar';

interface UserAvatarUploadProps {
  userId: string;
  name: string;
  avatarUrl: string | null;
  canUpdate: boolean;
  /** Persists the newly-uploaded reference — PATCH /users/me or PATCH /users/:id, whichever this call site owns — and refetches. */
  onUploaded: (avatarUrl: string) => Promise<void>;
  size?: 'md' | 'lg';
}

/** Same upload-then-persist-then-refetch shape as VehiclePhotoUpload/WorkshopLogoSetting — this is the third call site for that exact pattern (category differs: 'user-avatar'). */
export function UserAvatarUpload({ userId, name, avatarUrl, canUpdate, onUploaded, size = 'lg' }: UserAvatarUploadProps) {
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
      formData.append('category', 'user-avatar');
      formData.append('entityId', userId);
      const uploaded = await apiPost<{ url: string }>('/uploads', formData);
      await onUploaded(uploaded.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload photo.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar name={name} photoUrl={avatarUrl} size={size} />
      {canUpdate ? (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400"
          >
            {isUploading ? 'Uploading…' : avatarUrl ? 'Change Photo' : 'Upload Photo'}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </>
      ) : null}
      {error ? <span className="text-xs text-danger-600 dark:text-danger-400">{error}</span> : null}
    </div>
  );
}

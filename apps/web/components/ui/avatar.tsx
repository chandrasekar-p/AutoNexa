import { cn } from '@/lib/cn';
import { initialsFor } from '@/lib/format';
import { resolveUploadUrl } from '@/lib/uploads';

interface AvatarProps {
  name: string;
  /** Resolved display URL (e.g. User.avatarUrl) — falls back to an initials circle when null/omitted, same "real photo if uploaded, generated placeholder otherwise" convention as VehicleThumbnail. */
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-7 w-7 text-micro',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

export function Avatar({ name, photoUrl, size = 'md', className }: AvatarProps) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded content on a dynamic host, not a static build-time asset
    return <img src={resolveUploadUrl(photoUrl)} alt={name} className={cn('shrink-0 rounded-full object-cover', SIZE_CLASSES[size], className)} />;
  }
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-accent-500 font-semibold text-white',
        SIZE_CLASSES[size],
        className,
      )}
      aria-hidden
    >
      {initialsFor(name || '?')}
    </span>
  );
}

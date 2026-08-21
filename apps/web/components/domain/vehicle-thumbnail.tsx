import { Car } from 'lucide-react';
import { resolveUploadUrl } from '@/lib/uploads';
import { cn } from '@/lib/cn';

interface VehicleThumbnailProps {
  photoUrl: string | null;
  alt: string;
  className?: string;
}

/**
 * Real vehicle photo when one has been uploaded (Vehicle.photoUrl, set via
 * the vehicle detail page or job-card intake), otherwise a generic car
 * icon stands in — no external placeholder image asset, so nothing to
 * fetch or ship. The moment someone uploads a real photo this renders it
 * automatically everywhere the vehicle appears (dashboard, job cards, ...)
 * since it's the same field read from the same API responses, not a
 * separately-cached thumbnail.
 */
export function VehicleThumbnail({ photoUrl, alt, className }: VehicleThumbnailProps) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded content on a dynamic host, not a static build-time asset
    return <img src={resolveUploadUrl(photoUrl)} alt={alt} className={cn('h-[50px] w-[50px] shrink-0 rounded-xl object-cover', className)} />;
  }
  return (
    <span
      className={cn(
        'flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl bg-graphite-100 text-graphite-500 dark:bg-graphite-800 dark:text-graphite-400',
        className,
      )}
      aria-hidden
    >
      <Car className="h-6 w-6" strokeWidth={1.5} />
    </span>
  );
}

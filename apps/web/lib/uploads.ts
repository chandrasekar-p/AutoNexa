/** POST /uploads returns a relative path (`/uploads/<tenantId>/<uuid>.<ext>`), served by the API, not this Next.js app — resolve it against NEXT_PUBLIC_API_URL before using it in an <img src>/href. Already-absolute URLs (e.g. a VehicleDocument's externally-hosted fileUrl) pass through unchanged. */
export function resolveUploadUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${process.env.NEXT_PUBLIC_API_URL ?? ''}${url}`;
}

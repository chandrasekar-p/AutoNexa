/**
 * A per-browser appearance preference, not a workshop setting — stored in
 * this browser's localStorage only, never sent to the API. Deliberately
 * scoped this way (see apps/web/README.md "Settings" section): a
 * workshop-wide wallpaper shown on the pre-login screen would need a new
 * tenant setting plus a public lookup-by-slug endpoint, since nobody's
 * authenticated yet at that point. This is simpler and ships without any
 * backend change — set it in Settings, it shows on this device's login
 * screen from then on.
 */
const STORAGE_KEY = 'autonexa-login-background';

export const MAX_LOGIN_BACKGROUND_BYTES = 3 * 1024 * 1024; // 3MB — keeps the data URL well inside typical localStorage quotas (~5-10MB/origin)

export function getLoginBackground(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

/** @returns an error message, or null if the file is acceptable. */
export function validateLoginBackgroundFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Please choose an image file.';
  if (file.size > MAX_LOGIN_BACKGROUND_BYTES) return 'Image is too large — please choose one under 3MB.';
  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/** @returns an error message if storing failed (e.g. localStorage quota), or null on success. */
export function setLoginBackground(dataUrl: string): string | null {
  try {
    window.localStorage.setItem(STORAGE_KEY, dataUrl);
    return null;
  } catch {
    return 'Could not save this image — it may be too large for this browser to store. Try a smaller image.';
  }
}

export function clearLoginBackground(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

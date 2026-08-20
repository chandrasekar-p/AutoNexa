'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  clearLoginBackground,
  getLoginBackground,
  readFileAsDataUrl,
  setLoginBackground,
  validateLoginBackgroundFile,
} from '@/lib/settings/login-background';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function LoginBackgroundSetting() {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // localStorage doesn't exist during SSR — read it after mount rather
  // than in useState's initializer, same pattern as ThemeProvider's
  // readInitialTheme (see lib/theme/theme-context.tsx), except here there's
  // no pre-hydration script to race against, so a plain post-mount read is
  // enough.
  useEffect(() => {
    setPreview(getLoginBackground());
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be re-selected later (e.g. after Remove)
    if (!file) return;

    const validationError = validateLoginBackgroundFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const storeError = setLoginBackground(dataUrl);
    if (storeError) {
      setError(storeError);
      return;
    }
    setError(null);
    setPreview(dataUrl);
  }

  function handleRemove() {
    clearLoginBackground();
    setPreview(null);
    setError(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-ink">Login screen wallpaper</p>
          <p className="text-xs text-ink-muted">
            Shown behind the sign-in card — saved to this browser only, not shared with other users or devices.
            JPEG, PNG, or WEBP, up to 3MB.
          </p>
        </div>

        {preview ? (
          <div
            role="img"
            aria-label="Current login wallpaper"
            className="h-32 w-full max-w-xs rounded-lg border border-line bg-cover bg-center"
            style={{ backgroundImage: `url(${preview})` }}
          />
        ) : null}

        {error ? <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p> : null}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            {preview ? 'Change image' : 'Choose image'}
          </Button>
          {preview ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </CardBody>
    </Card>
  );
}

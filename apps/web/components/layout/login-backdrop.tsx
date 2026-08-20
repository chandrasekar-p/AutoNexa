'use client';

import { useEffect, useState } from 'react';
import { getLoginBackground } from '@/lib/settings/login-background';

/**
 * Renders the wallpaper set in Settings → Appearance (see
 * lib/settings/login-background.ts), or the plain canvas color when unset.
 * Always the full backdrop layer itself (not conditionally mounted) — the
 * parent layout carries no background of its own, specifically so there's
 * only ever one `bg-canvas` in the stack and no ambiguity about which one
 * paints on top of the other.
 */
export function LoginBackdrop() {
  const [background, setBackground] = useState<string | null>(null);

  useEffect(() => {
    setBackground(getLoginBackground());
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-canvas" aria-hidden>
      {background ? (
        <>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${background})` }} />
          {/* Tints the photo with the current theme's canvas color so the
              page edges (outside the opaque card) don't compete with the
              sign-in form, in either light or dark mode. */}
          <div className="absolute inset-0 bg-canvas/75" />
        </>
      ) : null}
    </div>
  );
}

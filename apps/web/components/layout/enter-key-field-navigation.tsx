'use client';

import { useEffect } from 'react';

// Text-like inputs only — Enter here is what a form's native
// submit-on-Enter behavior actually fires on. Deliberately excludes
// checkbox/radio/file/hidden/button/submit (Enter on those already does
// something meaningful natively) and textarea (Enter there must stay a
// newline, e.g. Notes/Remarks fields).
const TRIGGER_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]):not([type="button"]):not([type="submit"])';

// What Enter is allowed to land focus on — the same set Tab would stop at,
// minus buttons (landing on a button without the user choosing to click it
// would be a strange place for a "move to the next field" jump to end up).
const FIELD_SELECTOR = `${TRIGGER_SELECTOR}, select, textarea`;

function isVisible(el: HTMLElement): boolean {
  return el.offsetParent !== null || el === document.activeElement;
}

/**
 * A plain HTML form submits the instant Enter is pressed in any text
 * input, which is surprising on anything with more than one field — you'd
 * fire the submit (and its validation errors) before reaching fields
 * further down. This makes Enter behave like Tab instead: move to the next
 * focusable field in the same <form>, and only fall through to the
 * browser's native submit-on-Enter once there's no next field left — i.e.
 * on the last field, Enter still submits, exactly as expected.
 *
 * Mounted once in the root layout — every form gets this for free, no
 * per-form wiring needed.
 */
export function EnterKeyFieldNavigation() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return;
      if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented) return;

      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches(TRIGGER_SELECTOR)) return;

      const form = target.closest('form');
      if (!form) return;

      const fields = Array.from(form.querySelectorAll<HTMLElement>(FIELD_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && isVisible(el),
      );
      const currentIndex = fields.indexOf(target);
      if (currentIndex === -1) return;

      const next = fields[currentIndex + 1];
      if (!next) return; // Last field — let the native submit-on-Enter behavior run.

      event.preventDefault();
      next.focus();
      if (next instanceof HTMLInputElement) next.select();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}

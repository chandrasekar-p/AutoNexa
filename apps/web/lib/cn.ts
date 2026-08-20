import { twMerge } from 'tailwind-merge';

/** Joins conditional class names, then resolves conflicting Tailwind utilities (e.g. a caller's `w-40` overriding a component's own `w-full`) by keeping the last one. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(' '));
}

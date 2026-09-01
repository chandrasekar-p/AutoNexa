import { describe, expect, it } from 'vitest';
import { labelForResource } from './resource-labels';

describe('labelForResource', () => {
  it('returns the mapped label for a known resource', () => {
    expect(labelForResource('job-card')).toBe('Job Cards');
    expect(labelForResource('gst-export')).toBe('GST Export');
    expect(labelForResource('warranty-claim')).toBe('Warranty Claims');
  });

  it('auto-title-cases an unmapped kebab-case resource', () => {
    expect(labelForResource('future-thing')).toBe('Future Thing');
  });

  it('title-cases a single-word unmapped resource', () => {
    expect(labelForResource('widget')).toBe('Widget');
  });
});

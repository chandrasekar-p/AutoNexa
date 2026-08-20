/**
 * Literal hex values for chart data marks (bars/lines/areas) — recharts
 * renders raw SVG fill/stroke attributes, which can't resolve Tailwind
 * classes, so these are duplicated from tailwind.config.ts's palette; keep
 * in sync if that palette ever changes. Chrome around the data (axis text,
 * grid lines, tooltip surface) uses the real CSS custom properties from
 * app/globals.css instead (e.g. `var(--color-ink-secondary)`), so that part
 * still adapts automatically between light/dark — only these data colors
 * are static, since the same mid-saturation brand palette already reads
 * fine on both a light and a dark card surface.
 */
export const CHART_COLORS = {
  accent: '#c07333',
  success: '#0f9d68',
  danger: '#dc3b3b',
  warning: '#d69a1f',
  neutral: '#818b96', // graphite-400
} as const;

export type ChartTone = keyof typeof CHART_COLORS;

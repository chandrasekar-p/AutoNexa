'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { parseTime, formatTime, parseTime24, formatTime24, nearestFive, type ParsedTime } from '@/lib/time-picker';
import { Input } from './input';

// Matches CHART_COLORS.accent (lib/chart-colors.ts) — same reasoning: SVG
// stroke/fill attributes can't resolve Tailwind classes or CSS custom
// properties reliably, so the brand copper is duplicated here as a literal.
const ACCENT_HEX = '#c07333';

interface TimePickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  /**
   * '12h' (default) round-trips the app's free-text "10:30 AM" string
   * (CreateAppointmentDto.appointmentTime, Technician.workingHours*). '24h'
   * round-trips a strict "HH:mm" string instead — for fields a backend
   * validates with @Matches(HH_MM_REGEX) (TenantSettings.businessHours*) or
   * that get spliced straight into a Date-string (Attendance's
   * check-in/out). The dial itself is always a 12-hour face either way —
   * only what gets parsed in and emitted out differs.
   */
  format?: '12h' | '24h';
  disabled?: boolean;
}

const HOUR_LABELS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_LABELS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const DIAL_SIZE = 220;
const DIAL_RADIUS = 84;
const CENTER = DIAL_SIZE / 2;

function pointOnDial(index: number): { x: number; y: number } {
  const angle = ((index * 30 - 90) * Math.PI) / 180;
  return { x: CENTER + DIAL_RADIUS * Math.cos(angle), y: CENTER + DIAL_RADIUS * Math.sin(angle) };
}

/**
 * A Material-style analog clock-face time picker — click an hour, it
 * auto-advances to minutes, then AM/PM, then OK. Emits the same free-text
 * "10:30 AM" string the rest of the app already expects (see
 * CreateAppointmentDto.appointmentTime), so no backend change was needed;
 * this only replaces how that string gets typed in.
 */
export function TimePicker({ label, value, onChange, error, required, format = '12h', disabled }: TimePickerProps) {
  const parse = format === '24h' ? parseTime24 : parseTime;
  const emit = format === '24h' ? formatTime24 : formatTime;

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const [draft, setDraft] = useState<ParsedTime>(() => parse(value));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(parse(value));
      setMode('hour');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function commit() {
    onChange(emit(draft));
    setIsOpen(false);
  }

  function handleDialClick(num: number) {
    if (mode === 'hour') {
      setDraft((d) => ({ ...d, hour12: num }));
      setMode('minute');
    } else {
      setDraft((d) => ({ ...d, minute: num }));
    }
  }

  // The trigger input always reads "2:30 PM" regardless of `format` — the
  // 24h mode only changes what's parsed in / emitted out, not how it's
  // displayed (an admin reads AM/PM more naturally than "14:30").
  const displayValue = value ? formatTime(parse(value)) : '';

  const labels = mode === 'hour' ? HOUR_LABELS : MINUTE_LABELS;
  const selectedLabel = mode === 'hour' ? draft.hour12 : nearestFive(draft.minute);
  const selectedIndex = labels.indexOf(selectedLabel);
  const handPoint = pointOnDial(selectedIndex === -1 ? 0 : selectedIndex);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <div className="relative">
        <Input
          label={label}
          value={displayValue}
          placeholder="Select time"
          readOnly
          required={required}
          error={error}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((v) => !v)}
          className={cn('pr-10', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
        />
        <Clock
          aria-hidden
          className={cn('pointer-events-none absolute right-3 h-4 w-4 text-ink-muted', label ? 'top-[34px]' : 'top-1/2 -translate-y-1/2')}
        />
      </div>

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-[280px] overflow-hidden rounded-lg border border-line bg-surface shadow-card">
          <div className="flex items-center justify-center gap-1 bg-accent-500 px-4 py-5">
            <button
              type="button"
              onClick={() => setMode('hour')}
              className={cn('num text-4xl font-medium', mode === 'hour' ? 'text-white' : 'text-white/60')}
            >
              {draft.hour12}
            </button>
            <span className="num text-4xl font-medium text-white/60">:</span>
            <button
              type="button"
              onClick={() => setMode('minute')}
              className={cn('num text-4xl font-medium', mode === 'minute' ? 'text-white' : 'text-white/60')}
            >
              {String(draft.minute).padStart(2, '0')}
            </button>
            <span className="ml-1 self-start text-sm font-medium text-white/70">{draft.meridiem}</span>
          </div>

          <div className="flex flex-col items-center gap-4 px-4 py-5">
            <div className="relative shrink-0 rounded-full bg-surface-hover" style={{ width: DIAL_SIZE, height: DIAL_SIZE }}>
              <span
                className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: CENTER, top: CENTER, backgroundColor: ACCENT_HEX }}
                aria-hidden
              />
              <svg className="pointer-events-none absolute inset-0" width={DIAL_SIZE} height={DIAL_SIZE} aria-hidden>
                <line x1={CENTER} y1={CENTER} x2={handPoint.x} y2={handPoint.y} stroke={ACCENT_HEX} strokeWidth={2} />
              </svg>
              {labels.map((num, index) => {
                const { x, y } = pointOnDial(index);
                const isSelected = num === selectedLabel;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleDialClick(num)}
                    className={cn(
                      'num absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm transition-colors',
                      isSelected ? 'text-white' : 'text-ink hover:bg-surface',
                    )}
                    style={{ left: x, top: y, backgroundColor: isSelected ? ACCENT_HEX : undefined }}
                  >
                    {mode === 'minute' ? String(num).padStart(2, '0') : num}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              {(['AM', 'PM'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, meridiem: m }))}
                  className={cn(
                    'flex h-9 w-14 items-center justify-center rounded-full border text-sm font-medium transition-colors',
                    draft.meridiem === m ? 'border-accent-500 text-white' : 'border-line text-ink-secondary hover:bg-surface-hover',
                  )}
                  style={{ backgroundColor: draft.meridiem === m ? ACCENT_HEX : undefined }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t border-line px-4 py-3">
            <button type="button" onClick={() => setIsOpen(false)} className="text-sm font-medium text-accent-600 hover:underline">
              Cancel
            </button>
            <button type="button" onClick={commit} className="text-sm font-medium text-accent-600 hover:underline">
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

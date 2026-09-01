'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { DATE_PICKER_PRESETS, resolveDatePickerPreset, type DatePickerPresetKey } from '@/lib/date-picker/date-picker-presets';
import { Input } from './input';

interface DatePickerProps {
  label?: string;
  value: string; // "YYYY-MM-DD" or ''
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toISODate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseISODate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

interface DayCell {
  date: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

function buildCalendarGrid(year: number, month: number, todayISO: string): DayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: DayCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const d = new Date(year, month - 1, day);
    const iso = toISODate(d.getFullYear(), d.getMonth(), day);
    cells.push({ date: iso, day, inCurrentMonth: false, isToday: iso === todayISO });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toISODate(year, month, day);
    cells.push({ date: iso, day, inCurrentMonth: true, isToday: iso === todayISO });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1]!;
    const lastParsed = parseISODate(last.date)!;
    const d = new Date(lastParsed.year, lastParsed.month, lastParsed.day + 1);
    const iso = toISODate(d.getFullYear(), d.getMonth(), d.getDate());
    cells.push({ date: iso, day: d.getDate(), inCurrentMonth: false, isToday: iso === todayISO });
    if (cells.length >= 42) break;
  }

  return cells;
}

/**
 * A calendar-style date picker — preset sidebar + month grid, draft-until-
 * Apply (same commit model as TimePicker). Emits the same "YYYY-MM-DD"
 * string every current call site already used with a native
 * `<input type="date">`, so it's a drop-in replacement with no value-format
 * adapter needed (unlike TimePicker's 12h/24h split).
 */
export function DatePicker({ label, value, onChange, error, required, disabled, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();
  const todayISO = toISODate(today.getFullYear(), today.getMonth(), today.getDate());
  const parsedValue = value ? parseISODate(value) : null;

  const [viewYear, setViewYear] = useState(parsedValue?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedValue?.month ?? today.getMonth());
  const [draftDate, setDraftDate] = useState<string | null>(value || null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const parsed = value ? parseISODate(value) : null;
      setViewYear(parsed?.year ?? today.getFullYear());
      setViewMonth(parsed?.month ?? today.getMonth());
      setDraftDate(value || null);
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

  function goToMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function goToYear(delta: number) {
    setViewYear((y) => y + delta);
  }

  function handlePreset(key: DatePickerPresetKey) {
    const result = resolveDatePickerPreset(key);
    setViewYear(result.year);
    setViewMonth(result.month);
    if (result.date) setDraftDate(result.date);
  }

  function handleClear() {
    setDraftDate(null);
  }

  function commit() {
    onChange(draftDate ?? '');
    setIsOpen(false);
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const cells = buildCalendarGrid(viewYear, viewMonth, todayISO);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <div className="relative">
        <Input
          label={label}
          value={value ? formatDate(value) : ''}
          placeholder="Select date"
          readOnly
          required={required}
          error={error}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((v) => !v)}
          className={cn('pr-10', disabled ? 'cursor-not-allowed' : 'cursor-pointer', className)}
        />
        <CalendarDays
          aria-hidden
          className={cn('pointer-events-none absolute right-3 h-4 w-4 text-ink-muted', label ? 'top-[34px]' : 'top-1/2 -translate-y-1/2')}
        />
      </div>

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-1 flex w-[85vw] max-w-[85vw] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card sm:w-[460px] sm:max-w-[85vw] sm:flex-row">
          <div className="flex shrink-0 flex-wrap gap-1 border-b border-line p-2 sm:w-36 sm:flex-col sm:flex-nowrap sm:gap-0.5 sm:border-b-0 sm:border-r">
            {DATE_PICKER_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePreset(preset.key)}
                className="rounded px-2.5 py-1.5 text-left text-sm text-ink hover:bg-surface-hover"
              >
                {preset.label}
              </button>
            ))}
            <div className="hidden sm:my-1 sm:block sm:border-t sm:border-line" />
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-left text-sm text-ink-secondary hover:bg-surface-hover"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Clear
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button type="button" onClick={() => goToYear(-1)} aria-label="Previous year" className="rounded p-1 text-ink-secondary hover:bg-surface-hover">
                  <ChevronsLeft className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month" className="rounded p-1 text-ink-secondary hover:bg-surface-hover">
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <span className="text-sm font-semibold text-ink">{monthLabel}</span>
              <div className="flex items-center">
                <button type="button" onClick={() => goToMonth(1)} aria-label="Next month" className="rounded p-1 text-ink-secondary hover:bg-surface-hover">
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" onClick={() => goToYear(1)} aria-label="Next year" className="rounded p-1 text-ink-secondary hover:bg-surface-hover">
                  <ChevronsRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center">
              {WEEKDAY_LABELS.map((w) => (
                <span key={w} className="text-micro font-semibold uppercase tracking-wide text-ink-muted">
                  {w}
                </span>
              ))}
              {cells.map((cell) => {
                const isSelected = cell.date === draftDate;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setDraftDate(cell.date)}
                    className={cn(
                      'num mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors',
                      !cell.inCurrentMonth && 'text-ink-muted/50',
                      cell.inCurrentMonth && !isSelected && 'text-ink hover:bg-surface-hover',
                      isSelected && 'bg-accent-500 text-white',
                      cell.isToday && !isSelected && 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400',
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto flex justify-end gap-4 border-t border-line pt-3">
              <button type="button" onClick={() => setIsOpen(false)} className="text-sm font-medium text-accent-600 hover:underline">
                Cancel
              </button>
              <button type="button" onClick={commit} className="text-sm font-medium text-accent-600 hover:underline">
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

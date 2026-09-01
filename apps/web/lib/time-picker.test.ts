import { describe, expect, it } from 'vitest';
import { parseTime, formatTime, nearestFive, parseTime24, formatTime24 } from './time-picker';

describe('parseTime', () => {
  it('parses a well-formed time string', () => {
    expect(parseTime('10:30 AM')).toEqual({ hour12: 10, minute: 30, meridiem: 'AM' });
  });

  it('is case-insensitive on the meridiem', () => {
    expect(parseTime('6:05 pm')).toEqual({ hour12: 6, minute: 5, meridiem: 'PM' });
  });

  it('falls back to 12:00 PM for an unparseable value', () => {
    expect(parseTime('not a time')).toEqual({ hour12: 12, minute: 0, meridiem: 'PM' });
    expect(parseTime('')).toEqual({ hour12: 12, minute: 0, meridiem: 'PM' });
  });

  it('clamps an out-of-range hour or minute rather than producing an invalid time', () => {
    expect(parseTime('13:70 AM')).toEqual({ hour12: 12, minute: 59, meridiem: 'AM' });
  });
});

describe('formatTime', () => {
  it('zero-pads the minute', () => {
    expect(formatTime({ hour12: 9, minute: 5, meridiem: 'AM' })).toBe('9:05 AM');
  });

  it('round-trips through parseTime', () => {
    const formatted = formatTime({ hour12: 11, minute: 45, meridiem: 'PM' });
    expect(parseTime(formatted)).toEqual({ hour12: 11, minute: 45, meridiem: 'PM' });
  });
});

describe('parseTime24', () => {
  it('parses midnight and noon correctly', () => {
    expect(parseTime24('00:00')).toEqual({ hour12: 12, minute: 0, meridiem: 'AM' });
    expect(parseTime24('12:00')).toEqual({ hour12: 12, minute: 0, meridiem: 'PM' });
  });

  it('parses an afternoon 24-hour time', () => {
    expect(parseTime24('14:30')).toEqual({ hour12: 2, minute: 30, meridiem: 'PM' });
  });

  it('parses a morning 24-hour time', () => {
    expect(parseTime24('09:15')).toEqual({ hour12: 9, minute: 15, meridiem: 'AM' });
  });

  it('falls back to 12:00 PM for an unparseable value', () => {
    expect(parseTime24('')).toEqual({ hour12: 12, minute: 0, meridiem: 'PM' });
    expect(parseTime24('not a time')).toEqual({ hour12: 12, minute: 0, meridiem: 'PM' });
  });
});

describe('formatTime24', () => {
  it('formats midnight and noon correctly', () => {
    expect(formatTime24({ hour12: 12, minute: 0, meridiem: 'AM' })).toBe('00:00');
    expect(formatTime24({ hour12: 12, minute: 0, meridiem: 'PM' })).toBe('12:00');
  });

  it('formats and zero-pads an afternoon time', () => {
    expect(formatTime24({ hour12: 2, minute: 5, meridiem: 'PM' })).toBe('14:05');
  });

  it('round-trips every hour through parseTime24', () => {
    for (let h = 0; h < 24; h++) {
      const value = `${String(h).padStart(2, '0')}:30`;
      expect(formatTime24(parseTime24(value))).toBe(value);
    }
  });
});

describe('nearestFive', () => {
  it('rounds to the nearest 5-minute mark', () => {
    expect(nearestFive(0)).toBe(0);
    expect(nearestFive(2)).toBe(0);
    expect(nearestFive(3)).toBe(5);
    expect(nearestFive(47)).toBe(45);
    expect(nearestFive(58)).toBe(0);
  });
});

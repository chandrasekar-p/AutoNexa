import { afterEach, describe, expect, it } from 'vitest';
import {
  clearLoginBackground,
  getLoginBackground,
  MAX_LOGIN_BACKGROUND_BYTES,
  setLoginBackground,
  validateLoginBackgroundFile,
} from './login-background';

function makeFile(type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], 'wallpaper.jpg', { type });
}

describe('validateLoginBackgroundFile', () => {
  it('accepts a small image file', () => {
    expect(validateLoginBackgroundFile(makeFile('image/jpeg', 1024))).toBeNull();
  });

  it('rejects a non-image file', () => {
    expect(validateLoginBackgroundFile(makeFile('application/pdf', 1024))).toMatch(/image/i);
  });

  it('rejects a file over the size limit', () => {
    expect(validateLoginBackgroundFile(makeFile('image/png', MAX_LOGIN_BACKGROUND_BYTES + 1))).toMatch(/large/i);
  });

  it('accepts a file exactly at the size limit', () => {
    expect(validateLoginBackgroundFile(makeFile('image/png', MAX_LOGIN_BACKGROUND_BYTES))).toBeNull();
  });
});

describe('login background storage', () => {
  afterEach(() => {
    clearLoginBackground();
  });

  it('round-trips a value through set/get', () => {
    expect(getLoginBackground()).toBeNull();
    const error = setLoginBackground('data:image/png;base64,abc123');
    expect(error).toBeNull();
    expect(getLoginBackground()).toBe('data:image/png;base64,abc123');
  });

  it('clear removes a previously stored value', () => {
    setLoginBackground('data:image/png;base64,abc123');
    clearLoginBackground();
    expect(getLoginBackground()).toBeNull();
  });
});

import { imageFileFilter, MAX_UPLOAD_BYTES } from '../src/modules/uploads/upload-storage';

function fakeFile(mimetype: string, originalname: string): Express.Multer.File {
  return { mimetype, originalname } as Express.Multer.File;
}

describe('imageFileFilter', () => {
  it('accepts a matching MIME type and extension', (done) => {
    imageFileFilter({} as never, fakeFile('image/jpeg', 'photo.jpg'), (err, accept) => {
      expect(err).toBeNull();
      expect(accept).toBe(true);
      done();
    });
  });

  it('accepts every allowed MIME/extension pairing', (done) => {
    const pairs: [string, string][] = [
      ['image/jpeg', 'a.jpeg'],
      ['image/png', 'a.png'],
      ['image/webp', 'a.webp'],
    ];
    let remaining = pairs.length;
    for (const [mimetype, name] of pairs) {
      imageFileFilter({} as never, fakeFile(mimetype, name), (err, accept) => {
        expect(err).toBeNull();
        expect(accept).toBe(true);
        if (--remaining === 0) done();
      });
    }
  });

  it('rejects a disallowed MIME type', (done) => {
    imageFileFilter({} as never, fakeFile('application/pdf', 'doc.pdf'), (err, accept) => {
      expect(err).not.toBeNull();
      expect(accept).toBe(false);
      done();
    });
  });

  it('rejects an extension that does not match the declared MIME type', (done) => {
    // Content-Type says JPEG but the filename claims to be something else —
    // catches a spoofed/mismatched pairing even when the MIME check alone would pass.
    imageFileFilter({} as never, fakeFile('image/jpeg', 'malicious.exe'), (err, accept) => {
      expect(err).not.toBeNull();
      expect(accept).toBe(false);
      done();
    });
  });

  it('rejects a PNG file wearing a .jpg extension', (done) => {
    imageFileFilter({} as never, fakeFile('image/png', 'photo.jpg'), (err, accept) => {
      expect(err).not.toBeNull();
      expect(accept).toBe(false);
      done();
    });
  });
});

describe('MAX_UPLOAD_BYTES', () => {
  // Oversized-file rejection itself is enforced by Multer's `limits.fileSize`
  // (see uploads.controller.ts), not a pure function to unit-test directly —
  // this guards the constant itself against silent drift.
  it('is 5MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });
});

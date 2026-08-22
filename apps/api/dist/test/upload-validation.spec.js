"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const upload_storage_1 = require("../src/modules/uploads/upload-storage");
function fakeFile(mimetype, originalname) {
    return { mimetype, originalname };
}
describe('imageFileFilter', () => {
    it('accepts a matching MIME type and extension', (done) => {
        (0, upload_storage_1.imageFileFilter)({}, fakeFile('image/jpeg', 'photo.jpg'), (err, accept) => {
            expect(err).toBeNull();
            expect(accept).toBe(true);
            done();
        });
    });
    it('accepts every allowed MIME/extension pairing', (done) => {
        const pairs = [
            ['image/jpeg', 'a.jpeg'],
            ['image/png', 'a.png'],
            ['image/webp', 'a.webp'],
        ];
        let remaining = pairs.length;
        for (const [mimetype, name] of pairs) {
            (0, upload_storage_1.imageFileFilter)({}, fakeFile(mimetype, name), (err, accept) => {
                expect(err).toBeNull();
                expect(accept).toBe(true);
                if (--remaining === 0)
                    done();
            });
        }
    });
    it('rejects a disallowed MIME type', (done) => {
        (0, upload_storage_1.imageFileFilter)({}, fakeFile('application/pdf', 'doc.pdf'), (err, accept) => {
            expect(err).not.toBeNull();
            expect(accept).toBe(false);
            done();
        });
    });
    it('rejects an extension that does not match the declared MIME type', (done) => {
        (0, upload_storage_1.imageFileFilter)({}, fakeFile('image/jpeg', 'malicious.exe'), (err, accept) => {
            expect(err).not.toBeNull();
            expect(accept).toBe(false);
            done();
        });
    });
    it('rejects a PNG file wearing a .jpg extension', (done) => {
        (0, upload_storage_1.imageFileFilter)({}, fakeFile('image/png', 'photo.jpg'), (err, accept) => {
            expect(err).not.toBeNull();
            expect(accept).toBe(false);
            done();
        });
    });
});
describe('MAX_UPLOAD_BYTES', () => {
    it('is 5MB', () => {
        expect(upload_storage_1.MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
    });
});
//# sourceMappingURL=upload-validation.spec.js.map
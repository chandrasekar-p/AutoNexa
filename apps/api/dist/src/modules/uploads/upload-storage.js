"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadStorage = exports.MAX_UPLOAD_BYTES = exports.UPLOAD_ROOT = void 0;
exports.resolveUploadPath = resolveUploadPath;
exports.imageFileFilter = imageFileFilter;
const crypto_1 = require("crypto");
const path_1 = require("path");
const fs_1 = require("fs");
const multer_1 = require("multer");
const common_1 = require("@nestjs/common");
const api_prefix_1 = require("../../common/api-prefix");
exports.UPLOAD_ROOT = (0, path_1.join)(process.cwd(), 'uploads');
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
exports.MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
exports.uploadStorage = (0, multer_1.diskStorage)({
    destination: (req, _file, callback) => {
        const user = req.user;
        const dir = (0, path_1.join)(exports.UPLOAD_ROOT, user.tenantId);
        (0, fs_1.mkdirSync)(dir, { recursive: true });
        callback(null, dir);
    },
    filename: (_req, file, callback) => {
        callback(null, `${(0, crypto_1.randomUUID)()}${(0, path_1.extname)(file.originalname).toLowerCase()}`);
    },
});
function resolveUploadPath(url) {
    const relative = url.replace(new RegExp(`^/(${api_prefix_1.API_PREFIX}/)?uploads/`), '');
    return (0, path_1.join)(exports.UPLOAD_ROOT, relative);
}
function imageFileFilter(_req, file, callback) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        callback(new common_1.BadRequestException('Only JPEG, PNG, or WEBP images are allowed'), false);
        return;
    }
    callback(null, true);
}
//# sourceMappingURL=upload-storage.js.map
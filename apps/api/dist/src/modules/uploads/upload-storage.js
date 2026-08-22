"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_UPLOAD_BYTES = exports.UPLOAD_ROOT = void 0;
exports.resolveUploadPath = resolveUploadPath;
exports.imageFileFilter = imageFileFilter;
const path_1 = require("path");
const common_1 = require("@nestjs/common");
const api_prefix_1 = require("../../common/api-prefix");
exports.UPLOAD_ROOT = (0, path_1.join)(process.cwd(), 'uploads');
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS_BY_MIME = {
    'image/jpeg': new Set(['.jpg', '.jpeg']),
    'image/png': new Set(['.png']),
    'image/webp': new Set(['.webp']),
};
exports.MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
function resolveUploadPath(url) {
    const relative = url.replace(new RegExp(`^/(${api_prefix_1.API_PREFIX}/)?uploads/`), '');
    return (0, path_1.join)(exports.UPLOAD_ROOT, relative);
}
function imageFileFilter(_req, file, callback) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        callback(new common_1.BadRequestException('Only JPEG, PNG, or WEBP images are allowed'), false);
        return;
    }
    const ext = (0, path_1.extname)(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS_BY_MIME[file.mimetype].has(ext)) {
        callback(new common_1.BadRequestException('File extension does not match its content type'), false);
        return;
    }
    callback(null, true);
}
//# sourceMappingURL=upload-storage.js.map
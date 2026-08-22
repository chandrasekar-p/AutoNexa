"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalDiskStorageService = void 0;
const crypto_1 = require("crypto");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const common_1 = require("@nestjs/common");
const upload_storage_1 = require("../uploads/upload-storage");
let LocalDiskStorageService = class LocalDiskStorageService {
    async upload({ buffer, tenantId, filename }) {
        const dir = (0, path_1.join)(upload_storage_1.UPLOAD_ROOT, tenantId);
        await (0, promises_1.mkdir)(dir, { recursive: true });
        const storedName = `${(0, crypto_1.randomUUID)()}${(0, path_1.extname)(filename).toLowerCase()}`;
        await (0, promises_1.writeFile)((0, path_1.join)(dir, storedName), buffer);
        return { key: `/uploads/${tenantId}/${storedName}` };
    }
    async getSignedUrl(key) {
        return key;
    }
    async getBuffer(key) {
        return (0, promises_1.readFile)((0, upload_storage_1.resolveUploadPath)(key));
    }
    async delete(key) {
        try {
            await (0, promises_1.unlink)((0, upload_storage_1.resolveUploadPath)(key));
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
        }
    }
};
exports.LocalDiskStorageService = LocalDiskStorageService;
exports.LocalDiskStorageService = LocalDiskStorageService = __decorate([
    (0, common_1.Injectable)()
], LocalDiskStorageService);
//# sourceMappingURL=local-disk-storage.service.js.map
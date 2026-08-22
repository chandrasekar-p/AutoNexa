"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const storage_types_1 = require("./storage.types");
const local_disk_storage_service_1 = require("./local-disk-storage.service");
const s3_storage_service_1 = require("./s3-storage.service");
let StorageModule = class StorageModule {
};
exports.StorageModule = StorageModule;
exports.StorageModule = StorageModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: storage_types_1.STORAGE_SERVICE,
                useFactory: (config) => {
                    if (config.get('storage.mode') !== 's3')
                        return new local_disk_storage_service_1.LocalDiskStorageService();
                    const bucket = config.get('storage.s3.bucket');
                    const region = config.get('storage.s3.region');
                    const accessKeyId = config.get('storage.s3.accessKeyId');
                    const secretAccessKey = config.get('storage.s3.secretAccessKey');
                    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
                        throw new Error('STORAGE_MODE=s3 requires S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY to be set');
                    }
                    return new s3_storage_service_1.S3StorageService({ bucket, region, accessKeyId, secretAccessKey, endpoint: config.get('storage.s3.endpoint') });
                },
                inject: [config_1.ConfigService],
            },
        ],
        exports: [storage_types_1.STORAGE_SERVICE],
    })
], StorageModule);
//# sourceMappingURL=storage.module.js.map
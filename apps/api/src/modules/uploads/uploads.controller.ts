import { BadRequestException, Body, Controller, Inject, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { imageFileFilter, MAX_UPLOAD_BYTES } from './upload-storage';
import { UploadFileDto } from './dto/upload-file.dto';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.types';

// Generic — any authenticated tenant user may upload a file (no
// @Permissions() gate here, same reasoning as NotificationsController:
// uploading bytes isn't itself a business mutation). The actual business
// write that references the resulting reference (e.g. POST
// /inspections/:id/photos) is what enforces the real resource permission
// (inspection:update).
@ApiBearerAuth()
@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      // memoryStorage in both STORAGE_MODE — the controller no longer
      // knows or cares whether bytes end up on local disk or in S3; that
      // decision lives entirely inside StorageService now.
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadFileDto, @CurrentUser() user: AuthenticatedUser) {
    if (!file) throw new BadRequestException('No file uploaded');

    const { key } = await this.storage.upload({
      buffer: file.buffer,
      tenantId: user.tenantId,
      category: dto.category,
      entityId: dto.entityId,
      filename: file.originalname,
    });

    return {
      // The stored reference — a bare `/uploads/...` path in LOCAL_DISK
      // mode (unchanged from before this phase), an S3 object key in S3
      // mode. Callers persist this as-is; see storage.types.ts's doc
      // comment on why the field is still called `url` for both.
      url: key,
      fileName: file.originalname,
    };
  }
}

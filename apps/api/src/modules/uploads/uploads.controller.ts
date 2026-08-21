import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { imageFileFilter, uploadStorage, MAX_UPLOAD_BYTES } from './upload-storage';

// Generic — any authenticated tenant user may upload a file (no
// @Permissions() gate here, same reasoning as NotificationsController:
// uploading bytes isn't itself a business mutation). The actual business
// write that references the resulting URL (e.g. POST /inspections/:id/photos)
// is what enforces the real resource permission (inspection:update).
@ApiBearerAuth()
@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthenticatedUser) {
    if (!file) throw new BadRequestException('No file uploaded');
    return {
      // Deliberately bare, no API_PREFIX — the frontend's resolveUploadUrl()
      // resolves this against NEXT_PUBLIC_API_URL, which already ends in
      // /api/v1 (every other apiGet/apiPost call relies on that same base
      // to reach its own already-bare path). Prefixing it here as well
      // double-prefixes into .../api/v1/api/v1/uploads/... once the
      // frontend concatenates — a real bug shipped once already this
      // session (fixed by reverting this, not by prefixing it — see
      // main.ts's useStaticAssets, which is the one place that DOES need
      // the prefix, since it's Express-level and bypasses NEXT_PUBLIC_API_URL
      // entirely on the serving side).
      url: `/uploads/${user.tenantId}/${file.filename}`,
      fileName: file.originalname,
    };
  }
}

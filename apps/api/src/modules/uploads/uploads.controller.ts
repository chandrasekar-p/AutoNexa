import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { imageFileFilter, uploadStorage, MAX_UPLOAD_BYTES } from './upload-storage';
import { API_PREFIX } from '../../common/api-prefix';

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
      // Must match main.ts's useStaticAssets prefix exactly, or this URL
      // 404s once the frontend resolves it against NEXT_PUBLIC_API_URL.
      url: `/${API_PREFIX}/uploads/${user.tenantId}/${file.filename}`,
      fileName: file.originalname,
    };
  }
}

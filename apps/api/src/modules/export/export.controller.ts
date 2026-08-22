import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { ExportGstQueryDto } from './dto/export-gst-query.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

// Deliberately its own controller/permission, not folded into
// ReportsController's blanket 'report:read' — that resource is also
// granted to Service Advisor and Inventory Manager, too broad for a raw
// financial export (customer GSTINs, full purchase register). Gated on
// 'gst-export:read' instead, granted only to Workshop Owner/Manager and
// Accountant — see default-role-grants.ts.
@ApiBearerAuth()
@ApiTags('export')
@Controller('reports/export')
@Permissions('gst-export:read')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('gst')
  async exportGst(@Query() query: ExportGstQueryDto, @CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    const result = await this.exportService.exportGst(query, user.userId);

    if (query.preview === 'true') {
      return { warnings: result.warnings, amended: result.amended, supersedesBatchNumber: result.supersedesBatchNumber, ...JSON.parse(result.content) };
    }

    res.set({
      'X-Export-Batch-Number': result.batchNumber ?? '',
      'X-Export-Supersedes-Batch': result.supersedesBatchNumber ?? '',
      'X-Export-Warning-Count': String(result.warnings.length),
      'X-Export-Amended-Count': String(result.amended.length),
    });
    return new StreamableFile(Buffer.from(result.content, 'utf-8'), {
      type: result.contentType,
      disposition: `attachment; filename="${result.filename}"`,
    });
  }
}

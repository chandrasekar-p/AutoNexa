import { PartialType } from '@nestjs/swagger';
import { CreateServicePackageDto } from './create-service-package.dto';

// Included-items arrays, if provided, REPLACE the package's current
// inclusion list wholesale (delete-then-recreate) — not merged/appended.
// Simpler mental model than a separate add/remove-item endpoint pair, and
// consistent with how few packages a tenant is expected to define, versus
// e.g. Role permissionIds which is edited the same way already.
export class UpdateServicePackageDto extends PartialType(CreateServicePackageDto) {}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

// No @Permissions() here by design — unlike every other controller, "can
// you search at all" isn't gated by one resource permission. Each result
// category is independently gated inside SearchService against the
// caller's own resource:read grants, so two users hitting the same query
// can legitimately get different result shapes.
@ApiBearerAuth()
@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@CurrentUser() user: AuthenticatedUser, @Query() query: SearchQueryDto) {
    return this.searchService.search(user, query.q);
  }
}

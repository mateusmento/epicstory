import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Search } from '../features';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';

@Controller('workspaces/:workspaceId/search')
export class SearchController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  search(
    @Param('workspaceId') workspaceId: number,
    @Body() query: Search,
    @Auth() issuer: Issuer,
  ) {
    return this.queryBus.execute(
      new Search({ ...query, workspaceId: +workspaceId, issuerId: issuer.id }),
    );
  }
}

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { FindChannels } from '../features/find-channels.query';

@Controller('workspaces/:workspaceId/channels')
export class ChannelController {
  constructor(private queryBus: QueryBus) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findChannels(
    @Param(':workspaceId') workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.queryBus.execute(new FindChannels({ workspaceId, issuer }));
  }
}

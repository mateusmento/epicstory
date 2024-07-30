import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { CreateGroupChannel } from '../features/create-group-channel.command';
import { FindChannels } from '../features/find-channels.query';

@Controller('workspaces/:workspaceId/channels')
export class ChannelController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findChannels(
    @Param('workspaceId') workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.queryBus.execute(new FindChannels({ workspaceId, issuer }));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createChannel(
    @Param('workspaceId') workspaceId: number,
    @Body() command: CreateGroupChannel,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new CreateGroupChannel({ ...command, workspaceId, issuer }),
    );
  }
}

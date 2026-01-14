import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import {
  AddChannelMember,
  RemoveChannelMember,
  SendDirectMessage,
} from '../features';
import { CreateDirectChannel } from '../features/create-direct-channel.command';
import { CreateGroupChannel } from '../features/create-group-channel.command';
import { FindChannelMembers } from '../features/find-channel-members.query';
import { FindChannel } from '../features/find-channel.query';
import { FindChannels } from '../features/find-channels.query';

@Controller('workspaces/:workspaceId/channels')
export class WorkspaceChannelController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findChannels(
    @Param('workspaceId') workspaceId: number,
    @Query() query: FindChannels,
    @Auth() issuer: Issuer,
  ) {
    return this.queryBus.execute(
      new FindChannels({ ...query, workspaceId, issuer }),
    );
  }

  @Post('group')
  @UseGuards(JwtAuthGuard)
  createGroupChannel(
    @Param('workspaceId') workspaceId: number,
    @Body() command: CreateGroupChannel,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new CreateGroupChannel({ ...command, workspaceId, issuer }),
    );
  }

  @Post('direct')
  @UseGuards(JwtAuthGuard)
  createDirectChannel(
    @Param('workspaceId') workspaceId: number,
    @Body() command: CreateDirectChannel,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new CreateDirectChannel({ ...command, workspaceId, issuer }),
    );
  }

  @Post('direct/message')
  @UseGuards(JwtAuthGuard)
  sendDirectMessage(
    @Param('workspaceId') workspaceId: number,
    @Body() command: SendDirectMessage,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new SendDirectMessage({ ...command, workspaceId, senderId: issuer.id }),
    );
  }
}

@Controller('channels')
export class ChannelController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findChannel(@Param('id') channelId: number, @Auth() issuer: Issuer) {
    return this.queryBus.execute(
      new FindChannel({ channelId, issuerId: issuer.id }),
    );
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  findMembers(@Param('id') channelId: number, @Auth() issuer: Issuer) {
    return this.queryBus.execute(
      new FindChannelMembers({ channelId, issuerId: issuer.id }),
    );
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard)
  addMember(
    @Param('id') channelId: number,
    @Body() command: AddChannelMember,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new AddChannelMember({ ...command, channelId, issuerId: issuer.id }),
    );
  }

  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  removeMember(
    @Param('id') channelId: number,
    @Param('userId') userId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new RemoveChannelMember({ channelId, userId, issuerId: issuer.id }),
    );
  }
}

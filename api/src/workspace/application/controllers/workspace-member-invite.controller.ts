import { Controller, Param, Put, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { AcceptWorkspaceMemberInvite } from '../features';

@Controller('workspace-member-invites')
export class WorkspaceMemberInviteController {
  constructor(private commandBus: CommandBus) {}

  @UseGuards(JwtAuthGuard)
  @Put(':id/accepted')
  acceptInvite(@Param('id') inviteId: number, @Auth() issuer: Issuer) {
    return this.commandBus.execute(
      new AcceptWorkspaceMemberInvite({ inviteId, issuerId: issuer.id }),
    );
  }
}

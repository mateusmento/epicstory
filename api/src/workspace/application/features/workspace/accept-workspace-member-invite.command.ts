import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { WorkspaceMemberInviteRepository } from 'src/workspace/infrastructure/repositories';
import { AddWorkspaceMember } from './add-workspace-member.command';
import { patch } from 'src/core/objects';

export class AcceptWorkspaceMemberInvite {
  issuerId: number;
  inviteId: number;

  constructor(data: Partial<AcceptWorkspaceMemberInvite> = {}) {
    patch(this, data);
  }
}

@CommandHandler(AcceptWorkspaceMemberInvite)
export class AcceptWorkspaceMemberInviteCommand
  implements ICommandHandler<AcceptWorkspaceMemberInvite>
{
  constructor(
    private inviteRepo: WorkspaceMemberInviteRepository,
    private commandBus: CommandBus,
  ) {}

  async execute({ issuerId, inviteId }: AcceptWorkspaceMemberInvite) {
    const invite = await this.inviteRepo.findOneBy({ id: inviteId });
    if (invite.hasExpired())
      throw new BadRequestException('Workspace member invite has expired');
    invite.status = 'accepted';
    return this.commandBus.execute(
      new AddWorkspaceMember({
        issuerId,
        workspaceId: invite.workspaceId,
        userId: invite.userId,
      }),
    );
  }
}

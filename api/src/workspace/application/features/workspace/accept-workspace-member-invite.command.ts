import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import {
  WorkspaceMemberInviteRepository,
  WorkspaceMemberRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

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
    private workspaceRepo: WorkspaceRepository,
    private workspaceMemberRepo: WorkspaceMemberRepository,
  ) {}

  @Transactional()
  async execute({ issuerId, inviteId }: AcceptWorkspaceMemberInvite) {
    const invite = await this.inviteRepo.findOneBy({ id: inviteId });

    if (!invite) throw new NotFoundException('Workspace invite not found');

    if (invite.userId !== issuerId)
      throw new BadRequestException(
        "Issuer user can not accept another user's workspace invite",
      );

    if (invite.hasExpired())
      throw new BadRequestException('Workspace member invite has expired');

    invite.status = 'accepted';

    await this.inviteRepo.save(invite);

    const { workspaceId, userId, role } = invite;

    const workspace = await this.workspaceRepo.findOneBy({ id: workspaceId });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const prerequisites =
      await this.workspaceRepo.findAddWorkspaceMemberPrerequisite(
        issuerId,
        workspaceId,
        userId,
      );

    const member = workspace.addMember(prerequisites, userId, role);

    return this.workspaceMemberRepo.save(member);
  }
}

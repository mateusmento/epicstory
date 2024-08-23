import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { WorkspaceMemberRepository } from 'src/workspace/infrastructure/repositories/workspace-member.repository';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class RemoveWorkspaceMember {
  issuerId: number;
  workspaceId: number;
  memberId: number;

  constructor(data: Partial<RemoveWorkspaceMember>) {
    patch(this, data);
  }
}

@CommandHandler(RemoveWorkspaceMember)
export class RemoveWorkspaceMemberCommand
  implements ICommandHandler<RemoveWorkspaceMember>
{
  constructor(
    private workspaceMemberRepo: WorkspaceMemberRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issuerId, workspaceId, memberId }: RemoveWorkspaceMember) {
    const workspace = await this.workspaceRepo.findOne({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    const issuer = await this.workspaceRepo.findMember(workspaceId, issuerId);
    if (!issuer)
      throw new ForbiddenException('Issuer is not a workspace member');
    if (!issuer.hasRole(WorkspaceRole.ADMIN))
      throw new ForbiddenException('Issuer can not remove workspace member');
    const result = await this.workspaceMemberRepo.delete({ id: memberId });
    if (result.affected === 0)
      throw new NotFoundException('Workspace member not found');
  }
}

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsEnum } from 'class-validator';
import { patch } from 'src/core/objects';
import {
  CannotAssignWorkspaceOwner,
  MustTransferOwnership,
} from 'src/workspace/domain/exceptions';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { WorkspaceMemberRepository } from 'src/workspace/infrastructure/repositories/workspace-member.repository';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class UpdateWorkspaceMember {
  issuerId: number;
  workspaceId: number;
  memberId: number;

  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;

  constructor(data: Partial<UpdateWorkspaceMember>) {
    patch(this, data);
  }
}

@CommandHandler(UpdateWorkspaceMember)
export class UpdateWorkspaceMemberCommand
  implements ICommandHandler<UpdateWorkspaceMember>
{
  constructor(
    private workspaceRepository: WorkspaceRepository,
    private workspaceMemberRepository: WorkspaceMemberRepository,
  ) {}

  async execute({
    memberId,
    issuerId,
    workspaceId,
    role,
  }: UpdateWorkspaceMember) {
    const issuer = await this.workspaceRepository.findMember(
      workspaceId,
      issuerId,
    );

    if (!issuer)
      throw new ForbiddenException('Issuer is not a workspace member');
    if (!issuer.hasRole(WorkspaceRole.ADMIN))
      throw new ForbiddenException('Issuer can not update workspace member');

    if (role === WorkspaceRole.OWNER) {
      throw new CannotAssignWorkspaceOwner();
    }

    const member = await this.workspaceMemberRepository.findOneBy({
      id: memberId,
      workspaceId,
    });
    if (!member) throw new NotFoundException('Workspace member not found');

    if (member.isOwner) {
      throw new MustTransferOwnership(
        'Transfer workspace ownership before changing the owner role',
      );
    }

    member.role = role;
    await this.workspaceMemberRepository.save(member);
  }
}

import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import {
  IssuerUserCanNotAddWorkspaceMember,
  IssuerUserIsNotWorkspaceMember,
} from 'src/workspace/domain/exceptions';
import { IssuerCanNotAddWorkspaceOwner } from 'src/workspace/domain/exceptions/issuer-can-not-add-workspace-owner';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { WorkspaceMemberRepository } from 'src/workspace/infrastructure/repositories/workspace-member.repository';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class AddWorkspaceMember {
  issuerId: number;

  workspaceId: number;

  @IsNumber()
  userId: number;

  @IsOptional()
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;

  constructor(data: Partial<AddWorkspaceMember> = {}) {
    patch(this, data);
  }
}

@CommandHandler(AddWorkspaceMember)
export class AddWorkspaceMemberCommand
  implements ICommandHandler<AddWorkspaceMember>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private workspaceMemberRepo: WorkspaceMemberRepository,
  ) {}

  async execute({ issuerId, workspaceId, userId, role }: AddWorkspaceMember) {
    const workspace = await this.workspaceRepo.findOneBy({ id: workspaceId });
    if (!workspace) throw new NotFoundException('Workspace not found');
    const prerequisites =
      await this.workspaceRepo.findAddWorkspaceMemberPrerequisite(
        issuerId,
        workspaceId,
        userId,
      );
    if (!prerequisites.issuerIsWorkspaceMember)
      throw new IssuerUserIsNotWorkspaceMember();
    if (!prerequisites.issuer?.hasRole(WorkspaceRole.ADMIN))
      throw new IssuerUserCanNotAddWorkspaceMember();
    if (
      role === WorkspaceRole.OWNER &&
      !prerequisites.issuer?.hasRole(WorkspaceRole.OWNER)
    ) {
      throw new IssuerCanNotAddWorkspaceOwner();
    }
    const member = workspace.addMember(prerequisites, userId, role);
    return this.workspaceMemberRepo.save(member);
  }
}

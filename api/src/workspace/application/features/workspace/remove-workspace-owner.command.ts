import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import {
  WorkspaceMemberRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class RemoveWorkspaceOwner {
  issuerId: number;
  workspaceId: number;
  ownerId: number;
  newRole?: WorkspaceRole;
  removeFromWorkspace: boolean;

  constructor(data: Partial<RemoveWorkspaceOwner>) {
    patch(this, data);
  }
}

@CommandHandler(RemoveWorkspaceOwner)
export class RemoveWorkspaceOwnerCommand
  implements ICommandHandler<RemoveWorkspaceOwner>
{
  constructor(
    private workspaceRepository: WorkspaceRepository,
    private workspaceMemberRepository: WorkspaceMemberRepository,
  ) {}

  @Transactional()
  async execute({
    issuerId,
    workspaceId,
    ownerId,
    removeFromWorkspace,
    newRole,
  }: RemoveWorkspaceOwner) {
    if (!(await this.workspaceRepository.existsBy({ id: workspaceId })))
      throw new NotFoundException('Workspace not found');

    const issuer = await this.workspaceRepository.findMember(
      workspaceId,
      issuerId,
    );

    if (!issuer)
      throw new ForbiddenException('Issuer is not a workspace member');

    if (!issuer.hasRole(WorkspaceRole.OWNER))
      throw new ForbiddenException('Issuer can not remove workspace owner');

    const owner = await this.workspaceMemberRepository.findOneBy({
      workspaceId,
      userId: ownerId,
    });

    if (!owner) throw new NotFoundException('Owner is not a workspace member');

    if (removeFromWorkspace) {
      await this.workspaceMemberRepository.remove(owner);
    } else {
      owner.role = newRole ?? WorkspaceRole.ADMIN;
      await this.workspaceMemberRepository.save(owner);
    }
  }
}

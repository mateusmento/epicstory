import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { IssuerCanNotAddWorkspaceOwner } from 'src/workspace/domain/exceptions/issuer-can-not-add-workspace-owner';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import {
  WorkspaceMemberRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class AddWorkspaceOwner {
  issuerId: number;
  workspaceId: number;
  newOwnerId: number;

  constructor(data: Partial<AddWorkspaceOwner>) {
    patch(this, data);
  }
}

@CommandHandler(AddWorkspaceOwner)
export class AddWorkspaceOwnerCommand
  implements ICommandHandler<AddWorkspaceOwner>
{
  constructor(
    private workspaceRepository: WorkspaceRepository,
    private workspaceMemberRepository: WorkspaceMemberRepository,
  ) {}

  @Transactional()
  async execute({ issuerId, workspaceId, newOwnerId }: AddWorkspaceOwner) {
    if (!(await this.workspaceRepository.existsBy({ id: workspaceId })))
      throw new WorkspaceNotFound();

    const issuer = await this.workspaceRepository.findMember(
      workspaceId,
      issuerId,
    );

    if (!issuer) throw new IssuerUserIsNotWorkspaceMember();

    if (!issuer.hasRole(WorkspaceRole.OWNER))
      throw new IssuerCanNotAddWorkspaceOwner();

    const newOwner = await this.workspaceMemberRepository.findOneBy({
      workspaceId,
      userId: newOwnerId,
    });

    if (!newOwner) throw new NewOwnerIsNotWorkspaceMember();

    newOwner.role = WorkspaceRole.OWNER;

    await this.workspaceMemberRepository.save(newOwner);
  }
}

export class NewOwnerIsNotWorkspaceMember extends ForbiddenException {
  constructor() {
    super('New owner is not a workspace member');
  }
}

export class WorkspaceNotFound extends NotFoundException {
  constructor() {
    super('Workspace not found');
  }
}

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import {
  WorkspaceMemberRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class TransferWorkspaceOwnership {
  issuerId: number;
  workspaceId: number;
  newOwnerId: number;

  constructor(data: Partial<TransferWorkspaceOwnership>) {
    patch(this, data);
  }
}

@CommandHandler(TransferWorkspaceOwnership)
export class TransferWorkspaceOwnershipCommand
  implements ICommandHandler<TransferWorkspaceOwnership>
{
  constructor(
    private workspaceRepository: WorkspaceRepository,
    private workspaceMemberRepository: WorkspaceMemberRepository,
  ) {}

  @Transactional()
  async execute({
    issuerId,
    workspaceId,
    newOwnerId,
  }: TransferWorkspaceOwnership) {
    if (!(await this.workspaceRepository.existsBy({ id: workspaceId })))
      throw new NotFoundException('Workspace not found');

    const issuer = await this.workspaceRepository.findMember(
      workspaceId,
      issuerId,
    );

    if (!issuer)
      throw new ForbiddenException('Issuer is not a workspace member');

    if (!issuer.hasRole(WorkspaceRole.OWNER))
      throw new ForbiddenException(
        'Issuer can not transfer workspace ownership',
      );

    const newOwner = await this.workspaceMemberRepository.findOneBy({
      workspaceId,
      userId: newOwnerId,
    });

    if (!newOwner) throw new NotFoundException('New owner not found');

    newOwner.role = WorkspaceRole.OWNER;

    await this.workspaceMemberRepository.save(newOwner);

    await this.workspaceMemberRepository.update(
      { id: issuerId },
      { role: WorkspaceRole.ADMIN },
    );
  }
}

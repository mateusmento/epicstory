import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
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

  @Type(() => Number)
  @IsInt()
  newOwnerUserId: number;

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
    newOwnerUserId,
  }: TransferWorkspaceOwnership) {
    if (!(await this.workspaceRepository.existsBy({ id: workspaceId })))
      throw new NotFoundException('Workspace not found');

    const issuer = await this.workspaceRepository.findMember(
      workspaceId,
      issuerId,
    );

    if (!issuer)
      throw new ForbiddenException('Issuer is not a workspace member');

    if (!issuer.isOwner)
      throw new ForbiddenException(
        'Issuer can not transfer workspace ownership',
      );

    if (newOwnerUserId === issuerId) return;

    const newOwner = await this.workspaceMemberRepository.findOneBy({
      workspaceId,
      userId: newOwnerUserId,
    });

    if (!newOwner) throw new NotFoundException('New owner not found');

    newOwner.role = WorkspaceRole.OWNER;
    issuer.role = WorkspaceRole.ADMIN;

    await this.workspaceMemberRepository.save([newOwner, issuer]);
  }
}

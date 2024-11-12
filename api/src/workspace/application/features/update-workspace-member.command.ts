import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsEnum } from 'class-validator';
import { patch } from 'src/core/objects';
import { WorkspaceMember } from 'src/workspace/domain/entities/workspace-member.entity';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { WorkspaceMemberRepository } from 'src/workspace/infrastructure/repositories/workspace-member.repository';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import { FindOptionsWhere } from 'typeorm';

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
    ...command
  }: UpdateWorkspaceMember) {
    const issuer = await this.workspaceRepository.findMember(
      workspaceId,
      issuerId,
    );

    if (!issuer)
      throw new ForbiddenException('Issuer is not a workspace member');
    if (!issuer.hasRole(WorkspaceRole.ADMIN))
      throw new ForbiddenException('Issuer can not update workspace member');

    const result = await this.workspaceMemberRepository.update(
      { id: memberId } as FindOptionsWhere<WorkspaceMember>,
      command,
    );

    if (result.affected === 0)
      throw new NotFoundException('Workspace member not found');
  }
}

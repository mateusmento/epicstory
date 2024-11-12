import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty } from 'class-validator';
import { patch } from 'src/core/objects';
import { WorkspaceMember } from 'src/workspace/domain/entities/workspace-member.entity';
import { Workspace } from 'src/workspace/domain/entities/workspace.entity';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { WorkspaceMemberRepository } from 'src/workspace/infrastructure/repositories/workspace-member.repository';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class CreateWorkspace {
  issuerId: number;

  @IsNotEmpty()
  name: string;

  constructor(data: Partial<CreateWorkspace> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CreateWorkspace)
export class CreateWorkspaceCommand
  implements ICommandHandler<CreateWorkspace>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private workspaceMemberRepo: WorkspaceMemberRepository,
  ) {}

  async execute({ issuerId, ...data }: CreateWorkspace) {
    const workspace = await this.workspaceRepo.save(Workspace.create(data));
    const member = WorkspaceMember.create({
      workspaceId: workspace.id,
      userId: issuerId,
      role: WorkspaceRole.ADMIN,
    });
    await this.workspaceMemberRepo.save(member);
    return workspace;
  }
}

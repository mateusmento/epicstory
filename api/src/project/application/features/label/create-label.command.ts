import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsString } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { Label } from 'src/project/domain/entities';
import { LabelRepository } from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class CreateLabel {
  workspaceId: number;

  issuer: Issuer;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  constructor(data: Partial<CreateLabel> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CreateLabel)
export class CreateLabelCommand implements ICommandHandler<CreateLabel> {
  constructor(
    private labelRepo: LabelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ workspaceId, issuer, name, color }: CreateLabel) {
    if (!(await this.workspaceRepo.memberExists(workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    try {
      return await this.labelRepo.save(
        Label.create({
          workspaceId,
          name: name.trim(),
          color: color.trim(),
        }),
      );
    } catch (e: any) {
      // Unique(workspace_id, name)
      if (typeof e?.code === 'string' && e.code === '23505') {
        throw new ConflictException('Label already exists');
      }
      throw e;
    }
  }
}

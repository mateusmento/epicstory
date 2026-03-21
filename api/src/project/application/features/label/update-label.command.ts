import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsString } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { LabelRepository } from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class UpdateLabel {
  issuer: Issuer;

  workspaceId: number;

  labelId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  constructor(data: Partial<UpdateLabel> = {}) {
    patch(this, data);
  }
}

@CommandHandler(UpdateLabel)
export class UpdateLabelCommand implements ICommandHandler<UpdateLabel> {
  constructor(
    private labelRepo: LabelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ workspaceId, labelId, issuer, name, color }: UpdateLabel) {
    if (!(await this.workspaceRepo.memberExists(workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    const label = await this.labelRepo.findOne({
      where: { id: labelId, workspaceId },
    });
    if (!label) throw new NotFoundException('Label not found');

    label.name = name.trim();
    label.color = color.trim();

    try {
      return await this.labelRepo.save(label);
    } catch (e: any) {
      // Unique(workspace_id, name)
      if (typeof e?.code === 'string' && e.code === '23505') {
        throw new ConflictException('Label already exists');
      }
      throw e;
    }
  }
}

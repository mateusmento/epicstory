import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { LabelRepository } from 'src/project/infrastructure/repositories';

export class FindLabels {
  @IsNumber()
  workspaceId: number;

  issuer: Issuer;

  constructor(data: Partial<FindLabels> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindLabels)
export class FindLabelsQuery implements IQueryHandler<FindLabels> {
  constructor(
    private labelRepo: LabelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ workspaceId, issuer }: FindLabels) {
    if (!(await this.workspaceRepo.memberExists(workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    return this.labelRepo.find({
      where: { workspaceId },
      order: { name: 'ASC' },
    });
  }
}

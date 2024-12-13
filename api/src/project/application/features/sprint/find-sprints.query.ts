import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import { SprintRepository } from 'src/project/infrastructure/repositories';

export class FindSprints {
  workspaceId: number;

  @IsNumber()
  @IsOptional()
  projectId?: number;

  @IsNumber()
  page: number;

  @IsNumber()
  count: number;

  constructor(data: Partial<FindSprints> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindSprints)
export class FindSprintsQuery implements IQueryHandler<FindSprints> {
  constructor(private sprintRepo: SprintRepository) {}

  async execute({ workspaceId, projectId, page, count }: FindSprints) {
    const content = await this.sprintRepo.find({
      where: { workspaceId, projectId },
      skip: page * count,
      take: count + 1,
    });

    const hasPrevious = page > 0;
    const hasNext = content.length === count + 1;
    content.pop();
    return { content, page, count, hasNext, hasPrevious };
  }
}

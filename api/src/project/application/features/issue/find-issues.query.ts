import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { Page } from 'src/core/page';
import { IssueRepository } from 'src/project/infrastructure/repositories';
import { ILike } from 'typeorm';

export class FindIssues {
  workspaceId: number;

  @IsNumber()
  @IsOptional()
  projectId?: number;

  @IsNumber()
  @IsOptional()
  assigneeId?: number;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  orderBy: string;

  @IsString()
  order: 'asc' | 'desc';

  @IsNumber()
  page: number;

  @IsNumber()
  count: number;

  constructor(data: Partial<FindIssues> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindIssues)
export class FindIssuesQuery implements IQueryHandler<FindIssues> {
  constructor(private issueRepo: IssueRepository) {}

  async execute({
    workspaceId,
    projectId,
    search,
    orderBy,
    order,
    page,
    count,
  }: FindIssues) {
    const content = await this.issueRepo.find({
      where: {
        workspaceId,
        projectId,
        title: search ? ILike(`%${search}%`) : undefined,
      },
      relations: { assignees: true, labels: true, parentIssue: true },
      order: {
        createdAt: orderBy === 'createdAt' ? (order ?? 'asc') : undefined,
        priority: orderBy === 'priority' ? (order ?? 'asc') : undefined,
        title: orderBy === 'title' ? (order ?? 'asc') : undefined,
        status: orderBy === 'status' ? (order ?? 'asc') : undefined,
        dueDate: orderBy === 'dueDate' ? (order ?? 'asc') : undefined,
        id: orderBy === 'id' ? (order ?? 'asc') : undefined,
      },
      skip: page * count,
      take: count,
    });
    const total = await this.issueRepo.count({
      where: {
        workspaceId,
        projectId,
        title: search ? ILike(`%${search}%`) : undefined,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return Page.fromResult(content, total, { page, count });
  }
}

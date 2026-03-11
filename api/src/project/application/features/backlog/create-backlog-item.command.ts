import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { BacklogItemService } from 'src/project/domain/services/backlog-item.service';
import {
  BacklogItemRepository,
  ProjectRepository,
} from 'src/project/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';
import { CreateIssue } from '../issue/create-issue.command';

export class CreateBacklogItem {
  issuer: Issuer;

  projectId: number;

  @IsNumber()
  @IsOptional()
  afterOf?: number;

  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  constructor(data: Partial<CreateBacklogItem>) {
    patch(this, data);
  }
}

@CommandHandler(CreateBacklogItem)
export class CreateBacklogItemCommand
  implements ICommandHandler<CreateBacklogItem>
{
  constructor(
    private projectRepo: ProjectRepository,
    private backlogItemRepo: BacklogItemRepository,
    private commandBus: CommandBus,
    private backlogItemService: BacklogItemService,
  ) {}

  @Transactional()
  async execute({
    afterOf,
    projectId,
    issuer,
    title,
    description,
  }: CreateBacklogItem) {
    const project = await this.findProject(projectId); // ensure project exists

    const order = await this.backlogItemService.findNewOrder(
      projectId,
      afterOf,
    );

    const issue = await this.commandBus.execute(
      new CreateIssue({ issuer, projectId, title, description }),
    );

    const backlogItem = await this.backlogItemRepo.save({
      projectId,
      backlogId: project.backlogId,
      issueId: issue.id,
      issue,
      order,
    });

    return backlogItem;
  }

  private async findProject(projectId: number) {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}

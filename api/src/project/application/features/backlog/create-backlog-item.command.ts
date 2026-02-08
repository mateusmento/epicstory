import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { BacklogItemService } from 'src/project/domain/services/backlog-item.service';
import {
  BacklogItemRepository,
  BacklogRepository,
} from 'src/project/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';
import { CreateIssue } from '../issue/create-issue.command';

export class CreateBacklogItem {
  issuer: Issuer;

  @IsNumber()
  projectId: number;

  backlogId: number;

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
    private backlogRepo: BacklogRepository,
    private backlogItemRepo: BacklogItemRepository,
    private commandBus: CommandBus,
    private backlogItemService: BacklogItemService,
  ) {}

  @Transactional()
  async execute({
    backlogId,
    afterOf,
    projectId,
    issuer,
    title,
    description,
  }: CreateBacklogItem) {
    await this.findBacklog(backlogId); // ensure backlog exists

    const order = await this.backlogItemService.findNewOrder(
      backlogId,
      afterOf,
    );

    const issue = await this.commandBus.execute(
      new CreateIssue({ issuer, projectId, title, description }),
    );

    const backlogItem = await this.backlogItemRepo.save({
      backlogId,
      projectId,
      issueId: issue.id,
      issue,
      order,
    });

    return backlogItem;
  }

  private async findBacklog(id: number) {
    const backlog = await this.backlogRepo.findOneBy({ id });
    if (!backlog) throw new NotFoundException('Backlog not found');
    return backlog;
  }
}

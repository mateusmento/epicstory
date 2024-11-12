import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  BacklogItemRepository,
  BacklogRepository,
  IssueRepository,
} from 'src/workspace/infrastructure/repositories';
import { CreateIssue } from '../issue/create-issue.command';
import { Transactional } from 'typeorm-transactional';

export class CreateBacklogItem {
  issuer: Issuer;

  @IsNumber()
  projectId: number;

  backlogId: number;

  @IsNumber()
  @IsOptional()
  insertedAfterOfId?: number;

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
    private issueRepo: IssueRepository,
    private backlogItemRepo: BacklogItemRepository,
    private commandBus: CommandBus,
  ) {}

  @Transactional()
  async execute({
    backlogId,
    insertedAfterOfId,
    projectId,
    issuer,
    title,
    description,
  }: CreateBacklogItem) {
    await this.findBacklog(backlogId);

    const itemBefore = insertedAfterOfId
      ? await this.findBacklogItem(insertedAfterOfId, backlogId)
      : await this.findLastBacklogItem(backlogId);

    const issue = await this.commandBus.execute(
      new CreateIssue({ issuer, projectId, title, description }),
    );

    const order = !itemBefore
      ? 1
      : itemBefore.nextId
        ? (itemBefore.order + itemBefore.next.order) / 2
        : itemBefore.order + 1;

    const backlogItem = await this.backlogItemRepo.save({
      backlogId,
      issueId: issue.id,
      issue,
      order,
      previousId: itemBefore?.id,
      nextId: itemBefore?.nextId,
    });

    if (itemBefore) {
      itemBefore.nextId = backlogItem.id;
      await this.backlogItemRepo.save(itemBefore);
    }

    return backlogItem;
  }

  async findBacklog(id: number) {
    const backlog = await this.backlogRepo.findOneBy({ id });
    if (!backlog) throw new NotFoundException('Backlog not found');
    return backlog;
  }

  async findIssue(id: number) {
    const issue = this.issueRepo.findOneBy({ id });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  async findBacklogItem(id: number, backlogId: number) {
    const item = this.backlogItemRepo.findOne({
      where: { id, backlogId },
      relations: { next: true },
    });
    if (!item) throw new NotFoundException('Backlog item not found');
    return item;
  }

  async findLastBacklogItem(backlogId: number) {
    return this.backlogItemRepo.findOne({
      where: { backlogId },
      order: { order: 'desc' },
      relations: { next: true },
    });
  }
}

import { BadRequestException, NotFoundException } from '@nestjs/common';
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
import { BacklogItem } from 'src/workspace/domain/entities';

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
    const backlog = await this.findBacklog(backlogId);

    const itemBefore = insertedAfterOfId
      ? await this.findBacklogItem(insertedAfterOfId, backlogId)
      : null;

    if (itemBefore && backlog.id !== itemBefore.backlogId)
      throw new BadRequestException(
        'Backlog item inserted after of does not belong to the target backlog',
      );

    const issue = await this.commandBus.execute(
      new CreateIssue({ issuer, projectId, title, description }),
    );

    const order = await this.calculateOrder(backlogId, itemBefore);

    const backlogItem = await this.backlogItemRepo.save({
      backlogId,
      projectId,
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

  private async findBacklog(id: number) {
    const backlog = await this.backlogRepo.findOneBy({ id });
    if (!backlog) throw new NotFoundException('Backlog not found');
    return backlog;
  }

  private async findBacklogItem(id: number, backlogId: number) {
    const item = this.backlogItemRepo.findOne({
      where: { id, backlogId },
      relations: { next: true },
    });
    if (!item) throw new NotFoundException('Backlog item not found');
    return item;
  }

  private async calculateOrder(backlogId: number, itemBefore: BacklogItem) {
    if (itemBefore) {
      return itemBefore.nextId
        ? (itemBefore.order + itemBefore.next.order) / 2
        : itemBefore.order + 1;
    } else {
      const firstItem = await this.findFirstBacklogItem(backlogId);
      return firstItem ? firstItem.order / 2 : 1;
    }
  }

  private async findFirstBacklogItem(backlogId: number) {
    return this.backlogItemRepo.findOne({
      where: { backlogId },
      order: { order: 'asc' },
      relations: { next: true },
    });
  }
}

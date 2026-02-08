import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { BacklogItemService } from 'src/project/domain/services/backlog-item.service';
import { BacklogItemRepository } from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class ReorderBacklogItem {
  issuer: Issuer;

  @IsNumber()
  backlogId: number;
  backlogItemId: number;
  @IsNumber()
  @IsOptional()
  afterOf: number;

  constructor(data: Partial<ReorderBacklogItem>) {
    patch(this, data);
  }
}

@CommandHandler(ReorderBacklogItem)
export class ReorderBacklogItemCommand
  implements ICommandHandler<ReorderBacklogItem>
{
  constructor(
    private backlogItemRepo: BacklogItemRepository,
    private backlogItemService: BacklogItemService,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  @Transactional()
  async execute({ backlogItemId, afterOf, issuer }: ReorderBacklogItem) {
    if (backlogItemId === afterOf) {
      throw new BadRequestException(
        'Can not reorder backlog item after itself',
      );
    }

    const item = await this.backlogItemRepo.findOne({
      where: { id: backlogItemId },
      relations: { issue: true },
    });

    if (!item) {
      throw new BadRequestException('Backlog item not found');
    }

    const isWorkspaceMember = await this.workspaceRepo.memberExists(
      item.issue.workspaceId,
      issuer.id,
    );
    if (!isWorkspaceMember) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    if (item.id === afterOf) return;

    const order = await this.backlogItemService.reorder(item, afterOf);

    await this.backlogItemRepo.update(backlogItemId, { order });
  }
}

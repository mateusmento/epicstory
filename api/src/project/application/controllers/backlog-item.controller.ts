import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { create } from 'src/core/objects';
import { CreateBacklogItem, FindBacklogItems } from '../features';
import { RemoveBacklogItem } from '../features/backlog/remove-backlog-item.command';
import { ReorderBacklogItem } from '../features/backlog/reorder-backlog-item.command';

@Controller()
export class BacklogItemController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @Get('projects/:id/backlog-items')
  @UseGuards(JwtAuthGuard)
  findBacklogItems(
    @Param('id') projectId: number,
    @Query() query: FindBacklogItems,
  ) {
    return this.queryBus.execute(new FindBacklogItems({ ...query, projectId }));
  }

  @Post('projects/:id/backlog-items')
  @UseGuards(JwtAuthGuard)
  createBacklogItem(
    @Param('id') projectId: number,
    @Body() command: CreateBacklogItem,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new CreateBacklogItem({ ...command, projectId, issuer }),
    );
  }

  @Put('backlog-items/:id/order')
  @UseGuards(JwtAuthGuard)
  reorderBacklogItem(
    @Param('id') backlogItemId: number,
    @Body() command: ReorderBacklogItem,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new ReorderBacklogItem({ ...command, backlogItemId, issuer }),
    );
  }

  @Delete('backlog-items/:id')
  @UseGuards(JwtAuthGuard)
  removeProject(@Param('id') itemId: number) {
    return this.commandBus.execute(create(RemoveBacklogItem, { itemId }));
  }
}

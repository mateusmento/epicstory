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
import {
  CreateBacklogItem,
  FindBacklogItems,
  MoveBacklogItem,
} from '../features';
import { RemoveBacklogItem } from '../features/backlog/remove-backlog-item.command';

@Controller()
export class BacklogItemController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @Get('backlogs/:id/items')
  @UseGuards(JwtAuthGuard)
  findBacklogItems(
    @Param('id') backlogId: number,
    @Query() query: FindBacklogItems,
  ) {
    return this.queryBus.execute(new FindBacklogItems({ backlogId, ...query }));
  }

  @Post('backlogs/:id/items')
  @UseGuards(JwtAuthGuard)
  createBacklogItem(
    @Param('id') backlogId: number,
    @Body() command: CreateBacklogItem,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new CreateBacklogItem({ issuer, backlogId, ...command }),
    );
  }

  @Put('backlog-items/:id/order')
  @UseGuards(JwtAuthGuard)
  moveBacklogItem(
    @Param('id') backlogItemId: number,
    @Body() command: MoveBacklogItem,
  ) {
    return this.commandBus.execute(
      new MoveBacklogItem({ backlogItemId, ...command }),
    );
  }

  @Delete('backlog-items/:id')
  @UseGuards(JwtAuthGuard)
  removeProject(@Param('id') itemId: number) {
    return this.commandBus.execute(create(RemoveBacklogItem, { itemId }));
  }
}

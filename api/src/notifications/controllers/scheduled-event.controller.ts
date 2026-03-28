import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import {
  CreateScheduledEvent,
  FindScheduledEvents,
  RemoveScheduledEvent,
  UpdateScheduledEvent,
} from '../features';

@Controller('scheduled-events')
export class ScheduledEventController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createScheduledEvent(
    @Body() command: CreateScheduledEvent,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new CreateScheduledEvent({ ...command, userId: issuer.id }),
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getScheduledEvents(
    @Query() query: FindScheduledEvents,
    @Auth() issuer: Issuer,
  ) {
    query.userId = issuer.id;
    return this.queryBus.execute(query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  updateScheduledEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() command: UpdateScheduledEvent,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new UpdateScheduledEvent({ ...command, id, userId: issuer.id }),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  removeScheduledEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new RemoveScheduledEvent({ id, userId: issuer.id }),
    );
  }
}

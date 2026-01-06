import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  CreateScheduledEvent,
  FindScheduledEvents,
  UpdateScheduledEvent,
} from '../features';

@Controller('scheduled-events')
export class ScheduledEventController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Post()
  createScheduledEvent(@Body() command: CreateScheduledEvent) {
    return this.commandBus.execute(new CreateScheduledEvent(command));
  }

  @Get()
  async getScheduledEvents(@Query() query: FindScheduledEvents) {
    return this.queryBus.execute(query);
  }

  @Patch(':id')
  updateScheduledEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() command: UpdateScheduledEvent,
  ) {
    return this.commandBus.execute(
      new UpdateScheduledEvent({ ...command, id }),
    );
  }
}

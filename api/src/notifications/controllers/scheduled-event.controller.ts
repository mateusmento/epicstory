import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateScheduledEvent } from '../features';

@Controller('scheduled-events')
export class ScheduledEventController {
  constructor(private commandBus: CommandBus) {}

  @Post()
  createScheduledEvent(@Body() command: CreateScheduledEvent) {
    return this.commandBus.execute(new CreateScheduledEvent(command));
  }
}

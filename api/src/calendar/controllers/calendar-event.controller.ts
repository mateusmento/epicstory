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
  CreateCalendarEvent,
  EnsureCalendarMeetingSession,
  FindCalendarEvents,
  GetCalendarMeetingLobby,
  RemoveCalendarEvent,
  UpdateCalendarEvent,
} from '../features';
import { UUID } from 'crypto';

@Controller('calendar-events')
export class CalendarEventController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createCalendarEvent(
    @Body() command: CreateCalendarEvent,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new CreateCalendarEvent({ ...command, issuerId: issuer.id }),
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getCalendarEvents(
    @Query() query: FindCalendarEvents,
    @Auth() issuer: Issuer,
  ) {
    query.issuerId = issuer.id;
    return this.queryBus.execute(query);
  }

  @Get(':id/lobby')
  @UseGuards(JwtAuthGuard)
  getMeetingLobby(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('occurrenceAt') occurrenceAt: string,
    @Auth() issuer: Issuer,
  ) {
    return this.queryBus.execute(
      new GetCalendarMeetingLobby({
        calendarEventId: id,
        occurrenceAt: new Date(occurrenceAt),
        issuerId: issuer.id,
      }),
    );
  }

  @Post(':id/ensure-session')
  @UseGuards(JwtAuthGuard)
  ensureMeetingSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { occurrenceAt: string },
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new EnsureCalendarMeetingSession({
        calendarEventId: id,
        occurrenceAt: new Date(body.occurrenceAt),
        issuerId: issuer.id,
      }),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  updateScheduledEvent(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() command: UpdateCalendarEvent,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new UpdateCalendarEvent({ ...command, eventId: id, userId: issuer.id }),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  removeScheduledEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new RemoveCalendarEvent({ id, userId: issuer.id }),
    );
  }
}

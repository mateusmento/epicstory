import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import {
  CreateScheduledMeeting,
  FindScheduledMeetings,
  GetScheduledMeetingOccurrence,
  RemoveScheduledMeeting,
} from '../features';

@Controller('scheduled-meetings')
export class ScheduledMeetingController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() command: CreateScheduledMeeting, @Auth() issuer: Issuer) {
    return this.commandBus.execute(
      new CreateScheduledMeeting({ ...command, issuerId: issuer.id }),
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  find(@Query() query: FindScheduledMeetings, @Auth() issuer: Issuer) {
    return this.queryBus.execute(
      new FindScheduledMeetings({ ...query, issuerId: issuer.id }),
    );
  }

  @Get(':occurrenceId')
  @UseGuards(JwtAuthGuard)
  getOccurrence(
    @Param('occurrenceId', ParseUUIDPipe) occurrenceId: string,
    @Auth() issuer: Issuer,
  ) {
    return this.queryBus.execute(
      new GetScheduledMeetingOccurrence({ occurrenceId, issuerId: issuer.id }),
    );
  }

  @Delete(':scheduledMeetingId')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('scheduledMeetingId', ParseUUIDPipe) scheduledMeetingId: string,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new RemoveScheduledMeeting({
        scheduledMeetingId,
        issuerId: issuer.id,
      }),
    );
  }
}

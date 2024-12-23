import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { MeetingAttendeeRepository } from 'src/channel/infrastructure';
import { JwtAuthGuard } from 'src/core/auth';

@Controller('/meetings')
export class MeetingController {
  constructor(private attendeeRepo: MeetingAttendeeRepository) {}

  @Get(':id/attendees')
  @UseGuards(JwtAuthGuard)
  findAttendees(@Param('id') meetingId: number, @Query() { remoteId }: any) {
    return this.attendeeRepo.find({
      where: { remoteId, meetingId },
      relations: { user: true },
    });
  }
}

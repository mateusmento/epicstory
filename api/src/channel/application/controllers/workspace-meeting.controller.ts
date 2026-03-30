import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { FindLiveScheduledMeeting } from '../features/find-live-scheduled-meeting.query';

@Controller('workspaces/:workspaceId/meetings')
export class WorkspaceMeetingController {
  constructor(private queryBus: QueryBus) {}

  @Get('live-scheduled')
  @UseGuards(JwtAuthGuard)
  findLiveScheduledMeeting(
    @Param('workspaceId') workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.queryBus.execute(
      new FindLiveScheduledMeeting({
        workspaceId,
        issuerId: issuer.id,
        now: new Date(),
      }),
    );
  }
}

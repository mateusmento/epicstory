import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { FindLiveMeeting } from '../features/find-live-meeting.query';

@Controller('workspaces/:workspaceId/meetings')
export class WorkspaceMeetingController {
  constructor(private queryBus: QueryBus) {}

  @Get('live-scheduled')
  @UseGuards(JwtAuthGuard)
  async findLiveScheduledMeeting(
    @Param('workspaceId') workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    return await this.queryBus.execute(
      new FindLiveMeeting({
        workspaceId,
        issuerId: issuer.id,
        now: new Date(),
      }),
    );
  }
}

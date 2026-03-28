import { InjectRepository } from '@nestjs/typeorm';
import { ScheduledMeeting } from 'src/channel/domain/entities/scheduled-meeting.entity';
import { Repository } from 'typeorm';

export class ScheduledMeetingRepository extends Repository<ScheduledMeeting> {
  constructor(
    @InjectRepository(ScheduledMeeting)
    repo: Repository<ScheduledMeeting>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}

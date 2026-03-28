import { InjectRepository } from '@nestjs/typeorm';
import { ScheduledMeetingOccurrence } from 'src/channel/domain/entities/scheduled-meeting-occurrence.entity';
import { Repository } from 'typeorm';

export class ScheduledMeetingOccurrenceRepository extends Repository<ScheduledMeetingOccurrence> {
  constructor(
    @InjectRepository(ScheduledMeetingOccurrence)
    repo: Repository<ScheduledMeetingOccurrence>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}

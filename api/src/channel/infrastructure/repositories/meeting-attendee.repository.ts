import { InjectRepository } from '@nestjs/typeorm';
import { MeetingAttendee } from 'src/channel/domain';
import { Repository } from 'typeorm';

export class MeetingAttendeeRepository extends Repository<MeetingAttendee> {
  constructor(
    @InjectRepository(MeetingAttendee)
    repo: Repository<MeetingAttendee>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}

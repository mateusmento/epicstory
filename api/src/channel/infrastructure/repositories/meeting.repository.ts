import { InjectRepository } from '@nestjs/typeorm';
import { UUID } from 'crypto';
import { Meeting } from 'src/channel/domain';
import {
  FindOptionsRelations,
  FindOptionsWhere,
  LessThanOrEqual,
  Repository,
} from 'typeorm';

export class MeetingRepository extends Repository<Meeting> {
  constructor(
    @InjectRepository(Meeting)
    repo: Repository<Meeting>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  findMeeting(
    calendarEventId: UUID,
    occurrenceAt: Date,
    relations?: FindOptionsRelations<Meeting>,
  ) {
    return this.findOne({
      where: {
        calendarEventId,
        occurrenceAt,
      },
      relations,
    });
  }

  findScheduled(
    calendarEventId: UUID,
    scheduledStartsAt: Date,
    relations?: FindOptionsRelations<Meeting>,
  ) {
    return this.findOne({
      where: {
        calendarEventId,
        scheduledStartsAt,
      },
      relations,
    });
  }

  findOngoing(
    filter: FindOptionsWhere<Meeting>,
    relations?: FindOptionsRelations<Meeting>,
  ) {
    return this.findOne({
      where: {
        ...filter,
        ongoing: true,
        startedAt: LessThanOrEqual(new Date()),
      },
      relations,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvent } from '../entities/calendar-event.entity';

@Injectable()
export class CalendarEventRepository extends Repository<CalendarEvent> {
  constructor(
    @InjectRepository(CalendarEvent) repo: Repository<CalendarEvent>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  findCalendarEventsForUser(userId: number, workspaceId: number) {
    return this.createQueryBuilder('event')
      .leftJoin('event.participants', 'participant')
      .where('event.workspaceId = :workspaceId', { workspaceId })
      .andWhere('event.type = :type', { type: 'meeting' })
      .andWhere('participant.id = :userId OR event.createdById = :userId', {
        userId,
      })
      .getMany();
  }

  findByChannelId(channelId: number, now: Date = new Date()) {
    return this.createQueryBuilder('event')
      .leftJoinAndSelect('event.participants', 'participant')
      .where(`(event.payload->>'channelId')::int = :channelId`, { channelId })
      .andWhere(
        `(
          COALESCE(event.recurrence->>'frequency', 'once') != 'once'
          OR event.endsAt >= :now
        )`,
        { now },
      )
      .getMany();
  }
}

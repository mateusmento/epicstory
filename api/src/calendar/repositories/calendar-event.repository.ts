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
}

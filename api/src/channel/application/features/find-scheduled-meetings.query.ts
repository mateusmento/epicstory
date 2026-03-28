import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional } from 'class-validator';
import { addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import {
  ScheduledMeetingOccurrenceRepository,
  ScheduledMeetingRepository,
} from 'src/channel/infrastructure/repositories';

function parseUntil(until?: string) {
  if (!until) return null;
  const d = new Date(until);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function dayOfWeek(d: Date) {
  return d.getDay(); // 0..6
}

function clampRangeEnd(rangeEnd: Date, until?: string) {
  const untilDate = parseUntil(until);
  if (!untilDate) return rangeEnd;
  return isBefore(untilDate, rangeEnd) ? untilDate : rangeEnd;
}

function expandOccurrences(args: {
  startsAt: Date;
  endsAt: Date;
  recurrence: any;
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const { startsAt, endsAt, recurrence, rangeStart, rangeEnd } = args;
  const durationMs = Math.max(0, endsAt.getTime() - startsAt.getTime());
  const out: Array<{ startsAt: Date; endsAt: Date }> = [];
  const maxEnd = clampRangeEnd(rangeEnd, recurrence?.until);

  if (!recurrence || recurrence.frequency === 'once') {
    if (!isBefore(startsAt, rangeStart) && !isAfter(startsAt, maxEnd)) {
      out.push({ startsAt, endsAt });
    }
    return out;
  }

  if (recurrence.frequency === 'daily') {
    const interval = Math.max(1, Number(recurrence.interval ?? 1));
    for (
      let cur = startsAt;
      !isAfter(cur, maxEnd);
      cur = addDays(cur, interval)
    ) {
      if (isBefore(cur, rangeStart)) continue;
      out.push({ startsAt: cur, endsAt: new Date(cur.getTime() + durationMs) });
    }
    return out;
  }

  if (recurrence.frequency === 'weekly') {
    const intervalWeeks = Math.max(1, Number(recurrence.interval ?? 1));
    const by = new Set((recurrence.byWeekday ?? []).map((x: any) => Number(x)));
    if (by.size === 0) by.add(dayOfWeek(startsAt));

    const baseWeekStart = startOfDay(startsAt).getTime();
    for (
      let curDay = startOfDay(rangeStart);
      !isAfter(curDay, maxEnd);
      curDay = addDays(curDay, 1)
    ) {
      const weeksSinceBase = Math.floor(
        (curDay.getTime() - baseWeekStart) / (7 * 24 * 3600 * 1000),
      );
      if (weeksSinceBase < 0) continue;
      if (weeksSinceBase % intervalWeeks !== 0) continue;
      if (!by.has(dayOfWeek(curDay))) continue;

      const cur = new Date(curDay);
      cur.setHours(
        startsAt.getHours(),
        startsAt.getMinutes(),
        startsAt.getSeconds(),
        startsAt.getMilliseconds(),
      );
      if (isBefore(cur, startsAt)) continue;
      if (isBefore(cur, rangeStart) || isAfter(cur, maxEnd)) continue;
      out.push({ startsAt: cur, endsAt: new Date(cur.getTime() + durationMs) });
    }

    if (
      !out.some((o) => o.startsAt.getTime() === startsAt.getTime()) &&
      !isBefore(startsAt, rangeStart) &&
      !isAfter(startsAt, maxEnd)
    ) {
      out.unshift({ startsAt, endsAt });
    }

    const seen = new Set<number>();
    return out.filter((o) => {
      const t = o.startsAt.getTime();
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
  }

  return out;
}

export class FindScheduledMeetings {
  @IsNumber()
  workspaceId: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end?: Date;

  issuerId: number;

  constructor(data: Partial<FindScheduledMeetings>) {
    patch(this, data);
  }
}

@QueryHandler(FindScheduledMeetings)
export class FindScheduledMeetingsHandler
  implements IQueryHandler<FindScheduledMeetings>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private scheduledMeetingRepo: ScheduledMeetingRepository,
    private occurrenceRepo: ScheduledMeetingOccurrenceRepository,
  ) {}

  async execute(query: FindScheduledMeetings) {
    const member = await this.workspaceRepo.findMember(
      query.workspaceId,
      query.issuerId,
    );
    if (!member) throw new IssuerUserIsNotWorkspaceMember();

    const rangeStart =
      query.start ?? new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const rangeEnd = query.end ?? new Date(Date.now() + 30 * 24 * 3600 * 1000);

    const meetings = await this.scheduledMeetingRepo.find({
      where: { workspaceId: query.workspaceId },
      order: { startsAt: 'ASC' as any },
    });

    if (meetings.length === 0) return [];

    // Fetch any persisted occurrence rows (only ones with per-occurrence state exist).
    const occRows = await this.occurrenceRepo
      .createQueryBuilder('occ')
      .where('occ.startsAt >= :start', { start: rangeStart })
      .andWhere('occ.startsAt <= :end', { end: rangeEnd })
      .andWhere('occ.scheduledMeetingId IN (:...ids)', {
        ids: meetings.map((m) => m.id),
      })
      .select([
        'occ.id',
        'occ.scheduledMeetingId',
        'occ.startsAt',
        'occ.meetingId',
      ])
      .getMany();

    const occMap = new Map<string, { id: string; meetingId: number | null }>();
    for (const o of occRows as any[]) {
      const key = `${o.scheduledMeetingId}:${new Date(o.startsAt).toISOString()}`;
      occMap.set(key, { id: o.id, meetingId: o.meetingId ?? null });
    }

    const out: any[] = [];
    for (const m of meetings as any[]) {
      const occs = expandOccurrences({
        startsAt: new Date(m.startsAt),
        endsAt: new Date(m.endsAt),
        recurrence: m.recurrence,
        rangeStart,
        rangeEnd,
      });

      for (const o of occs) {
        const key = `${m.id}:${o.startsAt.toISOString()}`;
        const existing = occMap.get(key);
        out.push({
          id: existing?.id ?? `synthetic:${key}`,
          startsAt: o.startsAt,
          endsAt: o.endsAt,
          meetingId: existing?.meetingId ?? null,
          scheduledMeeting: {
            id: m.id,
            title: m.title,
            description: m.description,
            channelId: m.channelId,
            isPublic: m.isPublic,
            notifyMinutesBefore: m.notifyMinutesBefore,
          },
        });
      }
    }

    out.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    return out;
  }
}

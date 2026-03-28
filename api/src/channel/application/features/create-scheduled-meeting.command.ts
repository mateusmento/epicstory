import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDate,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { patch } from 'src/core/objects';
import { ScheduledEvent } from 'src/notifications/entities/scheduled-event.entity';
import { ScheduledEventRepository } from 'src/notifications/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import { addDays, addMinutes, isAfter, isBefore, startOfDay } from 'date-fns';
import {
  ChannelRepository,
  ScheduledMeetingOccurrenceRepository,
  ScheduledMeetingRepository,
} from 'src/channel/infrastructure/repositories';
import {
  ScheduledMeeting,
  type ScheduledMeetingRecurrence,
} from 'src/channel/domain/entities/scheduled-meeting.entity';

function dayOfWeek(d: Date) {
  return d.getDay(); // 0..6
}

function parseUntil(until?: string) {
  if (!until) return null;
  const d = new Date(until);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function generateOccurrences(args: {
  startsAt: Date;
  endsAt: Date;
  recurrence: ScheduledMeetingRecurrence;
  horizonDays: number;
}) {
  const { startsAt, endsAt, recurrence, horizonDays } = args;
  const durationMs = Math.max(0, endsAt.getTime() - startsAt.getTime());
  const horizonEnd = addDays(startsAt, horizonDays);
  const until = parseUntil((recurrence as any)?.until) ?? horizonEnd;

  const maxEnd = isBefore(until, horizonEnd) ? until : horizonEnd;
  const out: Array<{ startsAt: Date; endsAt: Date }> = [];

  if (recurrence.frequency === 'daily') {
    const interval = Math.max(1, recurrence.interval || 1);
    for (let i = 0; ; i += interval) {
      const s = addDays(startsAt, i);
      if (isAfter(s, maxEnd)) break;
      out.push({ startsAt: s, endsAt: new Date(s.getTime() + durationMs) });
    }
    return out;
  }

  if (recurrence.frequency === 'weekly') {
    const intervalWeeks = Math.max(1, recurrence.interval || 1);
    const by = new Set((recurrence.byWeekday ?? []).map((x) => Number(x)));
    if (by.size === 0) by.add(dayOfWeek(startsAt));

    // Iterate day-by-day within horizon; select matching weekdays on interval weeks.
    const baseWeekStart = startOfDay(startsAt).getTime();
    for (
      let cur = startOfDay(startsAt);
      !isAfter(cur, maxEnd);
      cur = addDays(cur, 1)
    ) {
      const weeksSinceBase = Math.floor(
        (cur.getTime() - baseWeekStart) / (7 * 24 * 3600 * 1000),
      );
      if (weeksSinceBase % intervalWeeks !== 0) continue;
      if (!by.has(dayOfWeek(cur))) continue;

      // Keep the time-of-day from the original startsAt
      const s = new Date(cur);
      s.setHours(
        startsAt.getHours(),
        startsAt.getMinutes(),
        startsAt.getSeconds(),
        startsAt.getMilliseconds(),
      );
      if (isAfter(s, maxEnd)) break;
      if (isBefore(s, startsAt)) continue;
      out.push({ startsAt: s, endsAt: new Date(s.getTime() + durationMs) });
    }

    // Ensure the first occurrence exists.
    if (!out.some((o) => o.startsAt.getTime() === startsAt.getTime())) {
      out.unshift({ startsAt, endsAt });
    }

    // Deduplicate by start time.
    const seen = new Set<number>();
    return out.filter((o) => {
      const t = o.startsAt.getTime();
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
  }

  return [{ startsAt, endsAt }];
}

export class CreateScheduledMeeting {
  @IsNumber()
  workspaceId: number;

  @IsOptional()
  @IsNumber()
  channelId?: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @Type(() => Date)
  @IsDate()
  endsAt: Date;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  notifyMinutesBefore?: number;

  @IsObject()
  recurrence: ScheduledMeetingRecurrence;

  @IsOptional()
  @ValidateIf((o) => !o.channelId)
  @IsArray()
  @ArrayNotEmpty()
  participantIds?: number[];

  // injected from controller
  issuerId: number;

  constructor(data: Partial<CreateScheduledMeeting>) {
    patch(this, data);
  }
}

@CommandHandler(CreateScheduledMeeting)
export class CreateScheduledMeetingCommand
  implements ICommandHandler<CreateScheduledMeeting>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private scheduledMeetingRepo: ScheduledMeetingRepository,
    private occurrenceRepo: ScheduledMeetingOccurrenceRepository,
    private scheduledEventRepo: ScheduledEventRepository,
  ) {}

  async execute(command: CreateScheduledMeeting) {
    const issuer = await this.workspaceRepo.findMember(
      command.workspaceId,
      command.issuerId,
    );
    if (!issuer) throw new IssuerUserIsNotWorkspaceMember();

    if (!command.startsAt || !command.endsAt) {
      throw new BadRequestException('startsAt and endsAt are required');
    }
    if (command.endsAt.getTime() <= command.startsAt.getTime()) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    const notifyMinutesBefore = Math.max(
      0,
      Math.floor(command.notifyMinutesBefore ?? 1),
    );

    let participants: any[] = [];
    let channelId: number | null = null;

    if (command.channelId) {
      channelId = command.channelId;

      const channel = await this.channelRepo.findOne({
        where: { id: command.channelId, workspaceId: command.workspaceId },
        relations: { peers: true },
      });
      if (!channel) throw new BadRequestException('Channel not found');

      const issuerIsChannelMember = channel.peers.some(
        (u) => u.id === command.issuerId,
      );
      if (!issuerIsChannelMember)
        throw new ForbiddenException('Issuer is not a channel member');

      participants = channel.peers;
    } else {
      const ids = Array.from(new Set(command.participantIds ?? []));
      if (ids.length === 0)
        throw new BadRequestException('participantIds are required');

      // Ensure all are workspace members.
      const members = await this.workspaceRepo.findMembers(
        { workspaceId: command.workspaceId, userIds: ids },
        { user: true },
      );
      const users = members.map((m) => m.user);
      const found = new Set(users.map((u) => u.id));
      for (const id of ids) {
        if (!found.has(id))
          throw new BadRequestException(`User ${id} is not a workspace member`);
      }

      // Ensure issuer is included.
      if (!found.has(command.issuerId)) {
        const issuerUser = await this.workspaceRepo.findMembers(
          { workspaceId: command.workspaceId, userIds: [command.issuerId] },
          { user: true },
        );
        if (!issuerUser[0]?.user) throw new IssuerUserIsNotWorkspaceMember();
        users.push(issuerUser[0].user);
      }

      participants = users;
    }

    const meeting = this.scheduledMeetingRepo.create({
      workspaceId: command.workspaceId,
      channelId,
      createdById: command.issuerId,
      title: command.title ?? '',
      description: command.description ?? '',
      isPublic: command.isPublic ?? true,
      notifyMinutesBefore,
      recurrence: command.recurrence,
      participants,
      occurrences: [],
    } as Partial<ScheduledMeeting>);

    const saved = await this.scheduledMeetingRepo.save(meeting);

    const occurrences = generateOccurrences({
      startsAt: command.startsAt,
      endsAt: command.endsAt,
      recurrence: command.recurrence,
      horizonDays: 90,
    }).map((o) =>
      this.occurrenceRepo.create({
        scheduledMeetingId: saved.id,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        meetingId: null,
      }),
    );

    const savedOccurrences = await this.occurrenceRepo.save(occurrences);

    const reminderEvents: ScheduledEvent[] = [];
    for (const occ of savedOccurrences) {
      for (const user of participants) {
        const dueAt = addMinutes(occ.startsAt, -notifyMinutesBefore);
        reminderEvents.push(
          ScheduledEvent.create({
            userId: user.id,
            workspaceId: command.workspaceId,
            dueAt,
            payload: {
              type: 'scheduled_meeting_reminder',
              scheduledMeetingId: saved.id,
              occurrenceId: occ.id,
              title: saved.title,
              channelId: saved.channelId,
              isPublic: saved.isPublic,
              startsAt: occ.startsAt,
              endsAt: occ.endsAt,
              notifyMinutesBefore,
            },
          }),
        );
      }
    }

    await this.scheduledEventRepo.save(reminderEvents);

    return {
      scheduledMeetingId: saved.id,
      occurrences: savedOccurrences.map((o) => ({
        id: o.id,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
      })),
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserRepository } from 'src/auth';
import { DataSource } from 'typeorm';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { ScheduledMeetingOccurrence } from 'src/channel/domain/entities/scheduled-meeting-occurrence.entity';
import { ScheduledMeeting } from 'src/channel/domain/entities/scheduled-meeting.entity';
import { ScheduledEventRepository } from '../repositories';
import { NotificationService } from '../services';
import { addDays, addMinutes, isAfter, isBefore, startOfDay } from 'date-fns';

@Injectable()
export class NotificationsCronjob {
  private readonly logger = new Logger(NotificationsCronjob.name);
  private readonly MAX_RETRIES = 5; // Maximum number of retry attempts
  private readonly BASE_RETRY_DELAY_MS = 60000; // 1 minute base delay

  constructor(
    private scheduledEventRepo: ScheduledEventRepository,
    private notificationService: NotificationService,
    private userRepo: UserRepository,
    private dataSource: DataSource,
  ) {}

  /**
   * Calculates the exponential backoff delay for a given retry count
   * Formula: baseDelay * (2 ^ retryCount) with a max of 1 hour
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay = this.BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
    const maxDelay = 60 * 60 * 1000; // 1 hour max
    return Math.min(delay, maxDelay);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    // Look ahead 10 seconds (10000ms) for events that are due
    const [lockId, events] = await this.scheduledEventRepo.findDueEvents(
      0,
      // 2 * 24 * 3600 * 1000,
    ); // 2 days

    if (events.length === 0) {
      this.logger.debug('No scheduled events found');
      return;
    }

    this.logger.debug(`Processing ${events.length} scheduled events`);

    for (const event of events) {
      try {
        // Some notification types (e.g. recurring meeting reminders) may schedule a follow-up job.
        let nextScheduledEvent: {
          userId: number;
          workspaceId: number;
          dueAt: Date;
          payload: any;
        } | null = null;

        // Determine notification type based on payload
        const notificationType = event.payload.type || 'issue_due_date';

        // Scheduled meeting reminder: ensure a meeting session exists for the occurrence.
        // This is idempotent due to the UNIQUE constraint on meetings.scheduled_occurrence_id.
        if (notificationType === 'scheduled_meeting_reminder') {
          const occRepo =
            this.dataSource.getRepository<ScheduledMeetingOccurrence>(
              ScheduledMeetingOccurrence,
            );
          const meetingRepo = this.dataSource.getRepository<Meeting>(Meeting);
          const scheduledMeetingRepo =
            this.dataSource.getRepository<ScheduledMeeting>(ScheduledMeeting);

          // New (series-only) format
          const scheduledMeetingId = event.payload?.scheduledMeetingId as
            | string
            | undefined;
          const payloadStartsAt = event.payload?.startsAt as
            | string
            | Date
            | undefined;
          const payloadEndsAt = event.payload?.endsAt as
            | string
            | Date
            | undefined;

          const startsAt =
            payloadStartsAt instanceof Date
              ? payloadStartsAt
              : payloadStartsAt
                ? new Date(payloadStartsAt)
                : null;
          const endsAt =
            payloadEndsAt instanceof Date
              ? payloadEndsAt
              : payloadEndsAt
                ? new Date(payloadEndsAt)
                : null;

          // Back-compat: old payloads contained occurrenceId (from horizon materialization).
          const occurrenceId = event.payload?.occurrenceId as
            | string
            | undefined;

          let occ: ScheduledMeetingOccurrence | null = null;
          let meeting: ScheduledMeeting | null = null;

          if (occurrenceId) {
            occ = await occRepo.findOne({
              where: { id: occurrenceId as any },
              relations: { scheduledMeeting: true },
            });
            meeting = (occ as any)?.scheduledMeeting ?? null;
          }

          if (!occ && scheduledMeetingId && startsAt && endsAt) {
            meeting = await scheduledMeetingRepo.findOne({
              where: { id: scheduledMeetingId as any },
            });
            if (meeting) {
              occ = await occRepo.findOne({
                where: {
                  scheduledMeetingId: scheduledMeetingId as any,
                  startsAt: startsAt as any,
                } as any,
                relations: { scheduledMeeting: true },
              });
              if (!occ) {
                occ = await occRepo.save(
                  occRepo.create({
                    scheduledMeetingId: scheduledMeetingId as any,
                    startsAt,
                    endsAt,
                    meetingId: null,
                  }),
                );
                // Attach relation for downstream enrichment
                (occ as any).scheduledMeeting = meeting;
              }
            }
          }

          if (occ && meeting) {
            if (!occ.meetingId) {
              const existing = await meetingRepo.findOne({
                where: { scheduledOccurrenceId: occ.id as any },
              });

              const session =
                existing ??
                (await meetingRepo.save(
                  Meeting.scheduled({
                    workspaceId: meeting.workspaceId,
                    scheduledOccurrenceId: occ.id,
                    channelId: meeting.channelId ?? null,
                  }),
                ));

              occ.meetingId = session.id;
              await occRepo.save(occ);
            }

            event.payload = {
              ...event.payload,
              workspaceId: meeting.workspaceId,
              meetingId: occ.meetingId,
              channelId: meeting.channelId,
              scheduledMeetingId: meeting.id,
              startsAt: occ.startsAt,
              endsAt: occ.endsAt,
              title: meeting.title,
            };

            // Advance reminder: schedule the next reminder job for this same user (series-only).
            const notifyMinutesBefore = Number(
              meeting.notifyMinutesBefore ?? 1,
            );

            function dayOfWeek(d: Date) {
              return d.getDay();
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
              recurrence: any;
              horizonDays: number;
            }) {
              const { startsAt, endsAt, recurrence, horizonDays } = args;
              const durationMs = Math.max(
                0,
                endsAt.getTime() - startsAt.getTime(),
              );
              const horizonEnd = addDays(startsAt, horizonDays);
              const until = parseUntil(recurrence?.until) ?? horizonEnd;
              const maxEnd = isBefore(until, horizonEnd) ? until : horizonEnd;
              const out: Array<{ startsAt: Date; endsAt: Date }> = [];

              if (!recurrence || recurrence.frequency === 'once') {
                return [{ startsAt, endsAt }];
              }
              if (recurrence.frequency === 'daily') {
                const interval = Math.max(1, recurrence.interval || 1);
                for (let i = 0; ; i += interval) {
                  const s = addDays(startsAt, i);
                  if (isAfter(s, maxEnd)) break;
                  out.push({
                    startsAt: s,
                    endsAt: new Date(s.getTime() + durationMs),
                  });
                }
                return out;
              }
              if (recurrence.frequency === 'weekly') {
                const intervalWeeks = Math.max(1, recurrence.interval || 1);
                const by = new Set(
                  (recurrence.byWeekday ?? []).map((x: any) => Number(x)),
                );
                if (by.size === 0) by.add(dayOfWeek(startsAt));
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
                  const s = new Date(cur);
                  s.setHours(
                    startsAt.getHours(),
                    startsAt.getMinutes(),
                    startsAt.getSeconds(),
                    startsAt.getMilliseconds(),
                  );
                  if (isAfter(s, maxEnd)) break;
                  if (isBefore(s, startsAt)) continue;
                  out.push({
                    startsAt: s,
                    endsAt: new Date(s.getTime() + durationMs),
                  });
                }
                if (
                  !out.some((o) => o.startsAt.getTime() === startsAt.getTime())
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
              return [{ startsAt, endsAt }];
            }

            const occs = generateOccurrences({
              startsAt: meeting.startsAt,
              endsAt: meeting.endsAt,
              recurrence: meeting.recurrence,
              horizonDays: 366,
            });
            const next = occs.find(
              (o) => o.startsAt.getTime() > occ.startsAt.getTime(),
            );

            if (next) {
              const dueAt = addMinutes(next.startsAt, -notifyMinutesBefore);
              nextScheduledEvent = {
                userId: event.userId,
                workspaceId: event.workspaceId,
                dueAt,
                payload: {
                  type: 'scheduled_meeting_reminder',
                  scheduledMeetingId: meeting.id,
                  title: meeting.title,
                  channelId: meeting.channelId,
                  isPublic: meeting.isPublic,
                  startsAt: next.startsAt,
                  endsAt: next.endsAt,
                  notifyMinutesBefore,
                },
              };
            }
          }
        }

        // Fetch user info if needed (for mentions/replies, we need sender info)
        let userInfo = null;
        if (event.payload.senderId) {
          const sender = await this.userRepo.findOne({
            where: { id: event.payload.senderId },
          });
          if (sender) {
            userInfo = {
              id: sender.id,
              name: sender.name,
              picture: sender.picture || null,
            };
          }
        }

        // Enhance payload with user info if available
        const enhancedPayload = {
          ...event.payload,
          ...(userInfo && { sender: userInfo }),
        };

        await this.notificationService.sendNotification({
          type: notificationType,
          userId: event.userId,
          workspaceId: event.workspaceId,
          payload: enhancedPayload,
        });

        // Only mark as processed if notification was successful
        await this.scheduledEventRepo.markAsProcessed(event.id, lockId);

        if (nextScheduledEvent) {
          await this.scheduledEventRepo.save(
            this.scheduledEventRepo.create(nextScheduledEvent),
          );
        }

        this.logger.debug(
          `Processed scheduled event ${event.id} for user ${event.userId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process scheduled event ${event.id}: ${error.message}`,
          error.stack,
        );

        // Mark failure and check if we should retry
        try {
          const { retryCount, exceededMaxRetries } =
            await this.scheduledEventRepo.markFailure(
              event.id,
              lockId,
              error.message,
            );

          if (exceededMaxRetries) {
            // Mark as permanently failed to prevent further retries
            await this.scheduledEventRepo.markAsPermanentlyFailed(
              event.id,
              lockId,
            );
            this.logger.error(
              `Event ${event.id} exceeded max retries (${retryCount}). Marked as permanently failed.`,
            );
          } else {
            const delay = this.calculateRetryDelay(retryCount);
            this.logger.warn(
              `Event ${event.id} failed (attempt ${retryCount}/${this.MAX_RETRIES}). Will retry after ${Math.round(delay / 1000)}s. Error: ${error.message}`,
            );
          }
        } catch (clearLockError) {
          this.logger.error(
            `Failed to handle failure for event ${event.id}: ${clearLockError.message}`,
          );
        }
      }
    }
  }
}

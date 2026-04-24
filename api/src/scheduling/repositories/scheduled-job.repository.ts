import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { addMilliseconds } from 'date-fns';
import { Repository } from 'typeorm';
import { ScheduledJobTypes } from '../constants';
import { ScheduledJob } from '../entities';
import type { ScheduledJobType } from '../types/payload';

@Injectable()
export class ScheduledJobRepository extends Repository<ScheduledJob> {
  private readonly logger = new Logger(ScheduledJobRepository.name);
  private readonly MAX_RETRIES = 5; // Maximum number of retry attempts
  private readonly BASE_RETRY_DELAY_MS = 60000; // 1 minute base delay

  constructor(@InjectRepository(ScheduledJob) repo: Repository<ScheduledJob>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  /**
   * Finds and locks events that are due within the specified window.
   * Uses PostgreSQL FOR UPDATE SKIP LOCKED for concurrency-safe locking.
   * @param windowMs - Window in milliseconds to look ahead for due events
   * @returns Events that were successfully locked by this process
   */
  async findDueJobs(
    windowMs: number = 10000,
  ): Promise<[lockId: string, events: ScheduledJob[]]> {
    const lockId = randomUUID();
    const now = new Date();
    const dueBy = addMilliseconds(now, windowMs);
    const batchSize = 5000;

    // Use raw SQL with FOR UPDATE SKIP LOCKED for concurrency-safe locking
    // Using CTE (Common Table Expression) to ensure atomicity between SELECT and UPDATE
    // This pattern ensures that the rows selected and locked are the same rows updated
    // Includes retry logic: only selects events that haven't exceeded max retries
    // and have waited long enough based on exponential backoff
    const sql = `
      -- Atomically claim ("lock") due events in a concurrency-safe way.
      -- Pattern:
      --  1) SELECT candidate rows + lock them (FOR UPDATE SKIP LOCKED)
      --  2) UPDATE exactly those rows to set lock_id/locked_at, then RETURN them
      --
      -- Important concepts used below:
      --  - due_at:
      --      For frequency=once, this is the exact trigger timestamp.
      --      For recurring jobs, this is the series anchor/start timestamp:
      --        * the series must not run before it starts (occurrence_at >= due_at)
      --        * interval math (every N days/weeks) is anchored off due_at's day
      --  - occurrence_at:
      --      The candidate "this occurrence" timestamp we are evaluating for the current cron tick.
      --      For recurring jobs, this is computed as: start-of-day(dueBy) + recurrence.timeOfDay.
      --  - last_run_at:
      --      For recurring jobs, guards against re-processing the same occurrence on every cron tick.
      --      After a successful run, we advance last_run_at = occurrence_at.
      --  - until:
      --      If set, prevents occurrences after the cutoff timestamp.
      WITH computed AS (
        SELECT
          se.*,
          -- Compute the candidate occurrence timestamp for THIS cron tick.
          -- For recurring jobs we evaluate "today at timeOfDay" (based on dueBy's day),
          -- and then apply guards (>= due_at, <= until_at, interval matching, last_run_at).
          CASE
            WHEN (se.recurrence->>'frequency' IS NULL OR se.recurrence->>'frequency' = 'once')
              THEN se.due_at
            ELSE (
              date_trunc('day', $2::timestamptz)
              + (se.recurrence->>'timeOfDay')::time
            )
          END AS occurrence_at,
          -- Optional series cutoff.
          CASE
            WHEN (se.recurrence->>'until') IS NULL THEN NULL
            ELSE (se.recurrence->>'until')::timestamptz
          END AS until_at,
          -- Recurrence interval (defaults to 1).
          CASE
            WHEN (se.recurrence->>'interval') IS NULL THEN 1
            ELSE GREATEST(1, (se.recurrence->>'interval')::int)
          END AS interval_n
        FROM scheduling.scheduled_jobs se
      ),
      locked_rows AS (
        SELECT id, retry_count, last_retry_at, occurrence_at
        FROM computed
        WHERE
          processed = false                               -- Only process events that haven't been completed yet.
          AND (
            lock_id IS NULL                               -- Take events that are currently unlocked...
            OR locked_at < now() - interval '5 minutes'   -- ...or whose lock is stale with TTL of 5 minutes (to recover from previous worker that likely died).
          )
          AND (
            -- One-off jobs: due_at is the trigger timestamp.
            -- Take both jobs due in the future (now + windowMs) and overdue jobs (for retry).
            (
              (recurrence->>'frequency' IS NULL OR recurrence->>'frequency' = 'once')
              AND due_at <= $2
            )
            OR
            -- Daily jobs: match by time-of-day on the current day (anchored by dueBy date),
            -- and only if the series has started (due_at <= occurrence time).
            (
              recurrence->>'frequency' = 'daily'
              AND occurrence_at <= $2
              AND occurrence_at >= due_at
              AND (until_at IS NULL OR occurrence_at <= until_at)
              AND (
                -- Run-once-per-occurrence guard: don't pick the same daily occurrence again.
                last_run_at IS NULL
                OR occurrence_at > last_run_at
              )
              AND (
                -- "Every N days" check:
                -- daysSinceStart = day(occurrence_at) - day(due_at)
                -- Only run when daysSinceStart % interval_n == 0 (i.e., day 0, N, 2N, ... from series start).
                MOD(
                  (DATE_PART('day', date_trunc('day', occurrence_at) - date_trunc('day', due_at)))::int,
                  interval_n
                ) = 0
              )
            )
            OR
            -- Weekly jobs: match by weekday and time-of-day on the current day (anchored by dueBy date),
            -- and only if the series has started (due_at <= occurrence time).
            (
              recurrence->>'frequency' = 'weekly'
              AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(recurrence->'weekdays') AS w(day_txt)
                WHERE w.day_txt::int = extract(dow from $2::timestamptz)::int
              )
              AND occurrence_at <= $2
              AND occurrence_at >= due_at
              AND (until_at IS NULL OR occurrence_at <= until_at)
              AND (
                -- Run-once-per-occurrence guard: don't pick the same weekly occurrence again.
                last_run_at IS NULL
                OR occurrence_at > last_run_at
              )
              AND (
                -- "Every N weeks" check (anchored on due_at week):
                -- weeksSinceStart = floor((day(occurrence_at) - day(due_at)) / 7)
                -- Only run when weeksSinceStart % interval_n == 0.
                MOD(
                  (FLOOR(DATE_PART('day', date_trunc('day', occurrence_at) - date_trunc('day', due_at)) / 7))::int,
                  interval_n
                ) = 0
              )
            )
          )
          AND retry_count < $4                            -- Do not retry forever: skip events that already hit the retry limit.
          AND (                                           -- Retry with exponential backoff gate:
            retry_count = 0 OR last_retry_at IS NULL      -- Skip events that were never retried or without last retry timestamp
            OR last_retry_at + (                          -- ...otherwise retry after an exponential backoff delay has elapsed:
              (interval '1 minute') * power(2, GREATEST(0, retry_count - 1))::int
            ) <= now()
          )
        ORDER BY due_at ASC, id ASC                       -- Prefer earliest due events first (stable order by id prevents tie flapping).
        LIMIT $3                                          -- Bound work per cron tick.
        FOR UPDATE SKIP LOCKED                            -- Concurrency: lock selected rows, skip rows locked by other workers (don't block).
      )
      UPDATE scheduling.scheduled_jobs se
      SET
        lock_id = $1,                                     -- Claim the selected rows for this worker.
        locked_at = now()                                 -- Set the lock timestamp.
      FROM locked_rows
      WHERE
        se.id = locked_rows.id                            -- Update only the rows we just selected+locked.
        AND (
          se.lock_id IS NULL                              -- Defensive re-check: only overwrite lock if it is absent or stale.
          OR se.locked_at < now() - interval '5 minutes'  -- ...or if the lock is stale (previous worker likely died).
        )
      RETURNING                                           -- Return the claimed events to the application for processing.
        se.id,
        se.type,
        se.workspace_id,
        se.payload,
        se.due_at,
        se.processed,
        se.lock_id,
        se.locked_at,
        se.retry_count,
        se.last_error,
        se.last_retry_at,
        se.last_run_at,
        se.notify_minutes_before,
        se.recurrence,
        se.created_at,
        se.updated_at,
        locked_rows.occurrence_at as occurrence_at;
    `;

    const [rows, count] = await this.manager.query(sql, [
      lockId,
      dueBy,
      batchSize,
      this.MAX_RETRIES,
    ]);

    this.logger.debug(`Found ${count} jobs`);

    // Map database rows (snake_case) to ScheduledJob instances (camelCase)
    return [
      lockId,
      rows
        .filter((row: any) => row.id) // Filter out any rows without an ID
        .map((row: any) => {
          const event = new ScheduledJob({
            id: row.id as any, // UUID type from crypto is a branded string
            type: row.type,
            workspaceId: row.workspace_id,
            payload: row.payload,
            dueAt: new Date(row.due_at),
            processed: row.processed,
            lockId: (row.lock_id as any) || undefined,
            lockedAt: row.locked_at ? new Date(row.locked_at) : undefined,
            retryCount: row.retry_count || 0,
            lastError: row.last_error || undefined,
            lastRetryAt: row.last_retry_at
              ? new Date(row.last_retry_at)
              : undefined,
            lastRunAt: row.last_run_at ? new Date(row.last_run_at) : undefined,
            notifyMinutesBefore: row.notify_minutes_before || 1,
            recurrence: row.recurrence,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            occurrenceAt: row.occurrence_at
              ? new Date(row.occurrence_at)
              : undefined,
          });
          return event;
        }),
    ];
  }

  async findByTypeAndCalendarEventId(args: {
    type: ScheduledJobType;
    calendarEventId: string;
    workspaceId: number;
  }): Promise<ScheduledJob | null> {
    const { type, calendarEventId, workspaceId } = args;
    return this.createQueryBuilder('job')
      .where('job.type = :type', { type })
      .andWhere('job.workspaceId = :workspaceId', { workspaceId })
      .andWhere(`job.payload ->> 'calendarEventId' = :calendarEventId`, {
        calendarEventId,
      })
      .orderBy('job.createdAt', 'DESC')
      .getOne();
  }

  async deleteByTypeAndCalendarEventId(args: {
    type: ScheduledJobType;
    calendarEventId: string;
    workspaceId: number;
  }): Promise<void> {
    const { type, calendarEventId, workspaceId } = args;
    await this.createQueryBuilder()
      .delete()
      .from(ScheduledJob)
      .where('type = :type', { type })
      .andWhere('workspaceId = :workspaceId', { workspaceId })
      .andWhere(`payload ->> 'calendarEventId' = :calendarEventId`, {
        calendarEventId,
      })
      .execute();
  }

  /**
   * Active scheduled message jobs for a channel (not yet fully processed; recurring remain listed).
   */
  async findScheduledMessagesByChannel(args: {
    channelId: number;
    workspaceId: number;
  }): Promise<ScheduledJob[]> {
    const { channelId, workspaceId } = args;
    return this.createQueryBuilder('job')
      .where('job.type = :type', { type: ScheduledJobTypes.scheduled_message })
      .andWhere('job.workspaceId = :workspaceId', { workspaceId })
      .andWhere(`(job.payload->>'channelId')::int = :channelId`, { channelId })
      .andWhere('job.processed = :processed', { processed: false })
      .orderBy('job.dueAt', 'ASC')
      .addOrderBy('job.id', 'ASC')
      .getMany();
  }

  async findScheduledMessageByIdForWorkspace(args: {
    id: string;
    workspaceId: number;
  }): Promise<ScheduledJob | null> {
    return this.createQueryBuilder('job')
      .where('job.id = :id', { id: args.id })
      .andWhere('job.workspaceId = :workspaceId', {
        workspaceId: args.workspaceId,
      })
      .andWhere('job.type = :type', {
        type: ScheduledJobTypes.scheduled_message,
      })
      .getOne();
  }

  /**
   * Marks an event as processed and clears the lock
   * Also resets retry count and error information on success
   */
  async markAsProcessed(args: {
    eventId: string;
    lockId: string;
    recurrenceFrequency?: string | null;
    occurrenceAt?: Date | null;
  }): Promise<void> {
    const { eventId, lockId, recurrenceFrequency, occurrenceAt } = args;
    if (!eventId || !lockId) {
      throw new Error('Event ID and lock ID are required');
    }
    const freq = recurrenceFrequency ?? 'once';

    // Use raw SQL to avoid UUID type issues with TypeORM
    if (!freq || freq === 'once') {
      await this.manager.query(
        `UPDATE scheduling.scheduled_jobs
         SET processed = true,
             lock_id = NULL,
             locked_at = NULL,
             retry_count = 0,
             last_error = NULL,
             last_retry_at = NULL
         WHERE id = $1 AND lock_id = $2`,
        [eventId, lockId],
      );
      return;
    }

    // Recurring job: keep processed=false, advance last_run_at to the occurrence timestamp.
    if (!occurrenceAt) {
      throw new Error(
        `markAsProcessed requires occurrenceAt for recurring jobs (eventId=${eventId}, freq=${freq})`,
      );
    }
    await this.manager.query(
      `UPDATE scheduling.scheduled_jobs
       SET processed = false,
           last_run_at = $3,
           lock_id = NULL,
           locked_at = NULL,
           retry_count = 0,
           last_error = NULL,
           last_retry_at = NULL
       WHERE id = $1 AND lock_id = $2`,
      [eventId, lockId, occurrenceAt],
    );
  }

  /**
   * Clears the lock on an event without marking it as processed
   * Increments retry count and records the error for exponential backoff
   * @returns retryCount and whether the event has exceeded max retries
   */
  async markFailure(
    eventId: string,
    lockId: string,
    lastError?: string,
  ): Promise<{ retryCount: number; exceededMaxRetries: boolean }> {
    if (!eventId || !lockId) {
      throw new Error('Event ID and lock ID are required');
    }
    // Use raw SQL to avoid UUID type issues with TypeORM
    const result = await this.manager.query(
      `UPDATE scheduling.scheduled_jobs
        SET
          lock_id = NULL,
          locked_at = NULL,
          retry_count = retry_count + 1,
          last_error = $3,
          last_retry_at = now()
        WHERE id = $1 AND lock_id = $2
        RETURNING retry_count`,
      [eventId, lockId, lastError],
    );
    const retryCount = (result[0]?.retry_count as number) || 0;
    return {
      retryCount,
      exceededMaxRetries: retryCount >= this.MAX_RETRIES,
    };
  }

  /**
   * Marks an event as permanently failed (exceeded max retries)
   * This prevents further retry attempts
   */
  async markAsPermanentlyFailed(
    eventId: string,
    lockId: string,
  ): Promise<void> {
    if (!eventId || !lockId) {
      throw new Error('Event ID and lock ID are required');
    }
    await this.manager.query(
      `UPDATE scheduling.scheduled_jobs
       SET processed = true, lock_id = NULL, locked_at = NULL
       WHERE id = $1 AND lock_id = $2`,
      [eventId, lockId],
    );
  }

  /**
   * Deletes a scheduled event if it hasn't been processed yet
   * Requires lockId to ensure we're deleting an event that's currently locked
   */
  async deleteEventIfNotProcessed(
    eventId: string,
    lockId: string,
  ): Promise<boolean> {
    if (!eventId || !lockId) {
      throw new Error('Event ID and lock ID are required');
    }
    const result = await this.manager.query(
      `DELETE FROM scheduling.scheduled_jobs
       WHERE id = $1 AND processed = false AND locked_at > now() - interval '5 minutes'
         AND lock_id = $2
       RETURNING id`,
      [eventId, lockId],
    );
    return result.length > 0;
  }

  /**
   * Deletes a scheduled event if it hasn't been processed yet
   * Used when deleting events that aren't currently locked (e.g., when updating issue due dates)
   */
  async deleteUnprocessedEvent(eventId: string): Promise<boolean> {
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    const result = await this.manager.query(
      `DELETE FROM scheduling.scheduled_jobs
       WHERE id = $1 AND processed = false
       RETURNING id`,
      [eventId],
    );
    return result.length > 0;
  }
}

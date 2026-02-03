import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ScheduledEvent } from '../entities/scheduled-event.entity';

@Injectable()
export class ScheduledEventRepository extends Repository<ScheduledEvent> {
  private readonly logger = new Logger(ScheduledEventRepository.name);
  private readonly MAX_RETRIES = 5; // Maximum number of retry attempts
  private readonly BASE_RETRY_DELAY_MS = 60000; // 1 minute base delay

  constructor(
    @InjectRepository(ScheduledEvent) repo: Repository<ScheduledEvent>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  /**
   * Finds and locks events that are due within the specified window.
   * Uses PostgreSQL FOR UPDATE SKIP LOCKED for concurrency-safe locking.
   * @param windowMs - Window in milliseconds to look ahead for due events
   * @returns Events that were successfully locked by this process
   */
  async findDueEvents(
    windowMs: number = 10000,
  ): Promise<[lockId: string, events: ScheduledEvent[]]> {
    const lockId = randomUUID();
    const now = new Date();
    const dueBy = new Date(now.getTime() + windowMs);
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
      WITH locked_rows AS (
        SELECT id, retry_count, last_retry_at
        FROM scheduler.scheduled_events
        WHERE
          processed = false                               -- Only process events that haven't been completed yet.
          AND (
            lock_id IS NULL                               -- Take events that are currently unlocked...
            OR locked_at < now() - interval '5 minutes'   -- ...or whose lock is stale with TTL of 5 minutes (to recover from previous worker that likely died).
          )
          AND due_at <= $2                                -- Take both events due in the future (now + windowMs) and overdue events (for retry).
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
      UPDATE scheduler.scheduled_events se
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
        se.user_id,
        se.payload,
        se.due_at,
        se.processed,
        se.lock_id,
        se.locked_at,
        se.retry_count,
        se.last_error,
        se.last_retry_at;
    `;

    const [rows, count] = await this.manager.query(sql, [
      lockId,
      dueBy,
      batchSize,
      this.MAX_RETRIES,
    ]);

    this.logger.debug(`Found ${count} events`);

    // Map database rows (snake_case) to ScheduledEvent instances (camelCase)
    return [
      lockId,
      rows
        .filter((row: any) => row.id) // Filter out any rows without an ID
        .map((row: any) => {
          const event = new ScheduledEvent({
            id: row.id as any, // UUID type from crypto is a branded string
            userId: row.user_id,
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
          });
          return event;
        }),
    ];
  }

  /**
   * Marks an event as processed and clears the lock
   * Also resets retry count and error information on success
   */
  async markAsProcessed(eventId: string, lockId: string): Promise<void> {
    if (!eventId || !lockId) {
      throw new Error('Event ID and lock ID are required');
    }
    // Use raw SQL to avoid UUID type issues with TypeORM
    await this.manager.query(
      `UPDATE scheduler.scheduled_events 
       SET processed = true, 
           lock_id = NULL, 
           locked_at = NULL,
           retry_count = 0,
           last_error = NULL,
           last_retry_at = NULL
       WHERE id = $1 AND lock_id = $2`,
      [eventId, lockId],
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
      `UPDATE scheduler.scheduled_events 
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
      `UPDATE scheduler.scheduled_events 
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
      `DELETE FROM scheduler.scheduled_events 
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
      `DELETE FROM scheduler.scheduled_events 
       WHERE id = $1 AND processed = false
       RETURNING id`,
      [eventId],
    );
    return result.length > 0;
  }
}

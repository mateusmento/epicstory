import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ScheduledEvent } from './scheduled-event.entity';

@Injectable()
export class ScheduledEventRepository extends Repository<ScheduledEvent> {
  private readonly logger = new Logger(ScheduledEventRepository.name);

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
  async findDueEvents(windowMs: number = 10000): Promise<ScheduledEvent[]> {
    const lockId = randomUUID();
    const now = new Date();
    const dueBy = new Date(now.getTime() + windowMs);
    const batchSize = 5000;

    // Use raw SQL with FOR UPDATE SKIP LOCKED for concurrency-safe locking
    const sql = `
      UPDATE scheduler.scheduled_events
      SET lock_id = $1
      WHERE id IN (
        SELECT id
        FROM scheduler.scheduled_events
        WHERE processed = false
          AND lock_id IS NULL
          AND due_at <= $2
        ORDER BY due_at ASC
        LIMIT $3
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, user_id, payload, due_at, processed, lock_id
    `;

    const [rows, count] = await this.manager.query(sql, [
      lockId,
      dueBy,
      batchSize,
    ]);

    this.logger.debug(`Found ${count} events`);

    console.log(rows);

    // Map database rows (snake_case) to ScheduledEvent instances (camelCase)
    return rows
      .filter((row: any) => row.id) // Filter out any rows without an ID
      .map((row: any) => {
        const event = new ScheduledEvent({
          id: row.id as any, // UUID type from crypto is a branded string
          userId: row.user_id,
          payload: row.payload,
          dueAt: new Date(row.due_at),
          processed: row.processed,
          lockId: (row.lock_id as any) || undefined,
        });
        return event;
      });
  }

  /**
   * Marks an event as processed and clears the lock
   */
  async markAsProcessed(eventId: string): Promise<void> {
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    // Use raw SQL to avoid UUID type issues with TypeORM
    await this.manager.query(
      `UPDATE scheduler.scheduled_events 
       SET processed = true, lock_id = NULL 
       WHERE id = $1`,
      [eventId],
    );
  }

  /**
   * Clears the lock on an event without marking it as processed
   * Useful for error recovery
   */
  async clearLock(eventId: string): Promise<void> {
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    // Use raw SQL to avoid UUID type issues with TypeORM
    await this.manager.query(
      `UPDATE scheduler.scheduled_events 
       SET lock_id = NULL 
       WHERE id = $1`,
      [eventId],
    );
  }

  /**
   * Deletes a scheduled event if it hasn't been processed yet
   */
  async deleteEventIfNotProcessed(eventId: string): Promise<boolean> {
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

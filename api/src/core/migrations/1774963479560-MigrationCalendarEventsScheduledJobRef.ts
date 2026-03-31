import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationCalendarEventsScheduledJobRef1774963479560
  implements MigrationInterface
{
  name = 'MigrationCalendarEventsScheduledJobRef1774963479560';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "calendar";`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "scheduling";`);

    // Clean up previous approach if it ever existed
    await queryRunner.query(`
      ALTER TABLE "scheduling"."scheduled_jobs"
      DROP CONSTRAINT IF EXISTS "FK_scheduling_scheduled_jobs_calendar_event_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "scheduling"."IDX_scheduling_scheduled_jobs_calendar_event_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "scheduling"."scheduled_jobs"
      DROP COLUMN IF EXISTS "calendar_event_id"
    `);

    // Add the reference on CalendarEvent -> ScheduledJob
    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events"
      ADD COLUMN IF NOT EXISTS "scheduled_job_id" uuid
    `);

    // Backfill from legacy linkage via scheduled_jobs.payload.calendarEventId
    // If multiple jobs exist for a single calendar event, pick the most recently updated one.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          sj.id AS scheduled_job_id,
          (sj.payload->>'calendarEventId')::uuid AS calendar_event_id,
          ROW_NUMBER() OVER (
            PARTITION BY (sj.payload->>'calendarEventId')
            ORDER BY sj.updated_at DESC
          ) AS rn
        FROM "scheduling"."scheduled_jobs" sj
        WHERE
          sj.payload ? 'calendarEventId'
          AND (sj.payload->>'calendarEventId') IS NOT NULL
          AND sj.type IN ('meeting_reminder', 'calendar_event_reminder')
      )
      UPDATE "calendar"."calendar_events" ev
      SET "scheduled_job_id" = ranked.scheduled_job_id
      FROM ranked
      WHERE
        ranked.rn = 1
        AND ranked.calendar_event_id = ev.id
        AND ev.scheduled_job_id IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_calendar_calendar_events_scheduled_job_id"
      ON "calendar"."calendar_events" ("scheduled_job_id")
    `);

    // Make this migration idempotent: the FK may already exist in some DBs (manual SQL / previous attempts).
    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events"
      DROP CONSTRAINT IF EXISTS "FK_calendar_calendar_events_scheduled_job_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events"
      ADD CONSTRAINT "FK_calendar_calendar_events_scheduled_job_id"
      FOREIGN KEY ("scheduled_job_id")
      REFERENCES "scheduling"."scheduled_jobs" ("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events"
      DROP CONSTRAINT IF EXISTS "FK_calendar_calendar_events_scheduled_job_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "calendar"."IDX_calendar_calendar_events_scheduled_job_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events"
      DROP COLUMN IF EXISTS "scheduled_job_id"
    `);
  }
}

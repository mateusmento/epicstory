import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationUniqueCalendarMeetingOccurrences1779000000000
  implements MigrationInterface
{
  name = 'MigrationUniqueCalendarMeetingOccurrences1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure calendar-backed meetings are unique per occurrence start.
    // Occurrence identity is (calendar_event_id, scheduled_starts_at).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM (
            SELECT calendar_event_id, scheduled_starts_at, COUNT(*) AS cnt
            FROM "channel"."meetings"
            WHERE calendar_event_id IS NOT NULL AND scheduled_starts_at IS NOT NULL
            GROUP BY calendar_event_id, scheduled_starts_at
            HAVING COUNT(*) > 1
          ) dup
        ) THEN
          RAISE EXCEPTION 'Cannot add unique index on (calendar_event_id, scheduled_starts_at): duplicate meeting occurrences exist. Please dedupe channel.meetings for calendar-backed rows first.';
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_channel_meetings_calendar_event_scheduled_starts_at"
      ON "channel"."meetings" ("calendar_event_id", "scheduled_starts_at")
      WHERE "calendar_event_id" IS NOT NULL AND "scheduled_starts_at" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "channel"."UQ_channel_meetings_calendar_event_scheduled_starts_at"
    `);
  }
}

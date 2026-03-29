import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationMeetingsCalendarOccurrence1774749025600
  implements MigrationInterface
{
  name = 'MigrationMeetingsCalendarOccurrence1774749025600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add persisted meeting (session) occurrence identity for calendar-backed meetings.
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "calendar_event_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "occurrence_starts_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "ended_at" TIMESTAMPTZ
    `);

    // Unique per series occurrence.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_channel_meetings_calendar_occurrence'
        ) THEN
          ALTER TABLE "channel"."meetings"
          ADD CONSTRAINT "UQ_channel_meetings_calendar_occurrence"
          UNIQUE ("calendar_event_id", "occurrence_starts_at");
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP CONSTRAINT IF EXISTS "UQ_channel_meetings_calendar_occurrence"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings" DROP COLUMN IF EXISTS "ended_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings" DROP COLUMN IF EXISTS "occurrence_starts_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings" DROP COLUMN IF EXISTS "calendar_event_id"
    `);
  }
}

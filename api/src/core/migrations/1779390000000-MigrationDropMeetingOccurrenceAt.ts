import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationDropMeetingOccurrenceAt1779390000000
  implements MigrationInterface
{
  name = 'MigrationDropMeetingOccurrenceAt1779390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "channel"."meetings"
      SET "scheduled_starts_at" = "occurrence_at"
      WHERE "calendar_event_id" IS NOT NULL
        AND "scheduled_starts_at" IS NULL
        AND "occurrence_at" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP CONSTRAINT IF EXISTS "UQ_channel_meetings_calendar_occurrence"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP COLUMN IF EXISTS "occurrence_at"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "occurrence_at" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      UPDATE "channel"."meetings"
      SET "occurrence_at" = "scheduled_starts_at"
      WHERE "calendar_event_id" IS NOT NULL
        AND "scheduled_starts_at" IS NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_channel_meetings_calendar_occurrence'
        ) THEN
          ALTER TABLE "channel"."meetings"
          ADD CONSTRAINT "UQ_channel_meetings_calendar_occurrence"
          UNIQUE ("calendar_event_id", "occurrence_at");
        END IF;
      END$$;
    `);
  }
}

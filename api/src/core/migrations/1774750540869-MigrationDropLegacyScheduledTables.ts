import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationDropLegacyScheduledTables1774750540869
  implements MigrationInterface
{
  name = 'MigrationDropLegacyScheduledTables1774750540869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop legacy scheduled meetings tables (replaced by calendar.calendar_events kind=meeting).
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP CONSTRAINT IF EXISTS "FK_channel_meetings_scheduled_occurrence"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP CONSTRAINT IF EXISTS "UQ_channel_meetings_scheduled_occurrence_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP COLUMN IF EXISTS "scheduled_occurrence_id"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "channel"."scheduled_meeting_occurrences" CASCADE
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "channel"."scheduled_meeting_participants" CASCADE
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "channel"."scheduled_meetings" CASCADE
    `);

    // Drop legacy scheduler.scheduled_events table (replaced by scheduling.scheduled_jobs + calendar.calendar_events).
    await queryRunner.query(`
      DROP TABLE IF EXISTS "scheduler"."scheduled_events" CASCADE
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No down migration: legacy tables are intentionally removed.
    void _queryRunner;
  }
}

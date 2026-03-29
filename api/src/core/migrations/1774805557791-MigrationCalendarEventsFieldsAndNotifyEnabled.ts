import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationCalendarEventsFieldsAndNotifyEnabled1774805557791
  implements MigrationInterface
{
  name = 'MigrationCalendarEventsFieldsAndNotifyEnabled1774805557791';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "calendar";`);

    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events"
      ADD COLUMN IF NOT EXISTS "type" character varying NOT NULL DEFAULT 'event'
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events"
      ADD COLUMN IF NOT EXISTS "notify_enabled" boolean NOT NULL DEFAULT true
    `);

    // Backfill title/description/type from payload for legacy rows (best-effort).
    await queryRunner.query(`
      UPDATE "calendar"."calendar_events" ev
      SET
        "title" = COALESCE(NULLIF(ev."title", ''), ev.payload->>'title', ''),
        "description" = COALESCE(NULLIF(ev."description", ''), ev.payload->>'description', ''),
        "type" = COALESCE(NULLIF(ev."type", ''), ev.payload->>'kind', 'event')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events" DROP COLUMN IF EXISTS "notify_enabled"
    `);
    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events" DROP COLUMN IF EXISTS "type"
    `);
  }
}

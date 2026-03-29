import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationCalendarEventsMoveChannelIdToPayload1774807745449
  implements MigrationInterface
{
  name = 'MigrationCalendarEventsMoveChannelIdToPayload1774807745449';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "calendar";`);

    // Backfill payload.channelId from legacy column channel_id (only when channel_id is present).
    await queryRunner.query(`
      UPDATE "calendar"."calendar_events" ev
      SET payload = jsonb_set(
        COALESCE(ev.payload, '{}'::jsonb),
        '{channelId}',
        to_jsonb(ev.channel_id),
        true
      )
      WHERE ev.channel_id IS NOT NULL
    `);

    // Ensure payload.channelId exists for ALL rows (null when not tied to a channel),
    // so application code can rely on the presence of the field.
    await queryRunner.query(`
      UPDATE "calendar"."calendar_events" ev
      SET payload = jsonb_set(
        COALESCE(ev.payload, '{}'::jsonb),
        '{channelId}',
        'null'::jsonb,
        true
      )
      WHERE NOT (COALESCE(ev.payload, '{}'::jsonb) ? 'channelId')
    `);

    // Drop FK + index implicitly by dropping the column.
    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events"
      DROP COLUMN IF EXISTS "channel_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add legacy column for rollback (best-effort). We do not restore FK/indexes.
    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events"
      ADD COLUMN IF NOT EXISTS "channel_id" integer
    `);

    // Best-effort backfill column from payload.channelId.
    await queryRunner.query(`
      UPDATE "calendar"."calendar_events" ev
      SET channel_id = NULLIF((ev.payload->>'channelId')::int, 0)
      WHERE (ev.payload->>'channelId') IS NOT NULL
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationBackfillCalendarEventType1774723221351
  implements MigrationInterface
{
  name = 'MigrationBackfillCalendarEventType1774723221351';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Legacy backfill for very old data (safe no-op if the legacy table doesn't exist).
    // We no longer persist `payload.endTime`, so we avoid relying on it here.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('scheduler.scheduled_events') IS NULL THEN
          RETURN;
        END IF;

        UPDATE scheduler.scheduled_events
        SET payload = jsonb_set(payload, '{type}', '"calendar_event"', true)
        WHERE
          (payload->>'type') IS NULL
          AND payload ? 'title'
          AND NOT (payload ? 'issueId');
      END
      $$;
    `);
  }

  public async down(): Promise<void> {
    // no-op (safe)
  }
}

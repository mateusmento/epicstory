import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationBackfillCalendarEventType1774723221351
  implements MigrationInterface
{
  name = 'MigrationBackfillCalendarEventType1774723221351';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill "calendar_event" type for legacy calendar events created before we added payload.type defaults.
    // Heuristic: calendar events have (title + endTime) and do NOT have issueId.
    await queryRunner.query(`
      UPDATE scheduler.scheduled_events
      SET payload = jsonb_set(payload, '{type}', '"calendar_event"', true)
      WHERE
        (payload->>'type') IS NULL
        AND payload ? 'title'
        AND payload ? 'endTime'
        AND NOT (payload ? 'issueId')
    `);
  }

  public async down(): Promise<void> {
    // no-op (safe)
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationScheduledMeetingsSeriesOnly1774723286381
  implements MigrationInterface
{
  name = 'MigrationScheduledMeetingsSeriesOnly1774723286381';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add anchor start/end to the meeting series (so we can compute occurrences without persisting them).
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meetings"
      ADD "starts_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meetings"
      ADD "ends_at" TIMESTAMPTZ
    `);

    // Backfill starts_at/ends_at using the earliest occurrence per series.
    await queryRunner.query(`
      UPDATE "channel"."scheduled_meetings" m
      SET
        "starts_at" = o."starts_at",
        "ends_at" = o."ends_at"
      FROM (
        SELECT DISTINCT ON ("scheduled_meeting_id")
          "scheduled_meeting_id",
          "starts_at",
          "ends_at"
        FROM "channel"."scheduled_meeting_occurrences"
        ORDER BY "scheduled_meeting_id", "starts_at" ASC
      ) o
      WHERE m."id" = o."scheduled_meeting_id"
    `);

    // For any series created without occurrences (should not happen), default to now.
    await queryRunner.query(`
      UPDATE "channel"."scheduled_meetings"
      SET
        "starts_at" = COALESCE("starts_at", now()),
        "ends_at" = COALESCE("ends_at", now() + interval '30 minutes')
      WHERE "starts_at" IS NULL OR "ends_at" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meetings"
      ALTER COLUMN "starts_at" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meetings"
      ALTER COLUMN "ends_at" SET NOT NULL
    `);

    // Drop horizon materialization: remove occurrence rows that have no real state.
    // Keep occurrences that are linked to an actual meeting session.
    await queryRunner.query(`
      DELETE FROM "channel"."scheduled_meeting_occurrences"
      WHERE "meeting_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverting would require re-materializing occurrences; keep down minimal.
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meetings" DROP COLUMN "ends_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meetings" DROP COLUMN "starts_at"
    `);
  }
}

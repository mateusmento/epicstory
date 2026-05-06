import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Promote rich-text JSON to canonical message body:
 * - channel.messages.content_rich (jsonb) -> content (jsonb)
 * - channel.message_replies.content_rich (jsonb) -> content (jsonb)
 * - drop legacy varchar `content` columns
 */
export class MigrationPromoteMessageContentJson1778077540888
  implements MigrationInterface
{
  name = 'MigrationPromoteMessageContentJson1778077540888';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Move legacy varchar columns out of the way, then promote jsonb columns to `content`.
    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      RENAME COLUMN "content" TO "content_plain"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      RENAME COLUMN "content" TO "content_plain"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      RENAME COLUMN "content_rich" TO "content"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      RENAME COLUMN "content_rich" TO "content"
    `);

    // Backfill any nulls to a normalized empty doc (defensive).
    await queryRunner.query(`
      UPDATE "channel"."messages"
      SET "content" = jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object('type', 'paragraph', 'content', '[]'::jsonb)
        )
      )
      WHERE "content" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "channel"."message_replies"
      SET "content" = jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object('type', 'paragraph', 'content', '[]'::jsonb)
        )
      )
      WHERE "content" IS NULL
    `);

    // Enforce NOT NULL now that backfill is done.
    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      ALTER COLUMN "content" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      ALTER COLUMN "content" SET NOT NULL
    `);

    // Drop old varchar columns (they are now obsolete).
    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      DROP COLUMN "content_plain"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      DROP COLUMN "content_plain"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate legacy varchar columns and demote jsonb back to content_rich.
    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      ADD COLUMN "content_plain" character varying NOT NULL DEFAULT ''
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      ADD COLUMN "content_plain" character varying NOT NULL DEFAULT ''
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      ALTER COLUMN "content_plain" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      ALTER COLUMN "content_plain" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      RENAME COLUMN "content" TO "content_rich"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      RENAME COLUMN "content" TO "content_rich"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      RENAME COLUMN "content_plain" TO "content"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      RENAME COLUMN "content_plain" TO "content"
    `);
  }
}

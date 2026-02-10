import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddContentRichToChannelMessages1770682513288
  implements MigrationInterface
{
  name = 'MigrationAddContentRichToChannelMessages1770682513288';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      ADD COLUMN "content_rich" jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      ADD COLUMN "content_rich" jsonb
    `);

    // Backfill existing plain text content into a basic Tiptap doc.
    await queryRunner.query(`
      UPDATE "channel"."messages"
      SET "content_rich" = jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'content',
              CASE
                WHEN "content" IS NULL OR "content" = '' THEN '[]'::jsonb
                ELSE jsonb_build_array(jsonb_build_object('type', 'text', 'text', "content"))
              END
          )
        )
      )
      WHERE "content_rich" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "channel"."message_replies"
      SET "content_rich" = jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'content',
              CASE
                WHEN "content" IS NULL OR "content" = '' THEN '[]'::jsonb
                ELSE jsonb_build_array(jsonb_build_object('type', 'text', 'text', "content"))
              END
          )
        )
      )
      WHERE "content_rich" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      DROP COLUMN "content_rich"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      DROP COLUMN "content_rich"
    `);
  }
}

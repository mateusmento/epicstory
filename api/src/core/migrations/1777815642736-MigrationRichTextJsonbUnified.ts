import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationRichTextJsonbUnified1777815642736
  implements MigrationInterface
{
  name = 'MigrationRichTextJsonbUnified1777815642736';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      RENAME COLUMN "content" TO "content_plain_legacy"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      RENAME COLUMN "content_rich" TO "content"
    `);

    await queryRunner.query(`
      UPDATE "channel"."messages"
      SET "content" = jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'content',
              CASE
                WHEN "content_plain_legacy" IS NULL OR "content_plain_legacy" = '' THEN '[]'::jsonb
                ELSE jsonb_build_array(jsonb_build_object('type', 'text', 'text', "content_plain_legacy"))
              END
          )
        )
      )
      WHERE "content" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      ALTER COLUMN "content" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      ALTER COLUMN "content" SET DEFAULT '{"type":"doc","content":[]}'::jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      DROP COLUMN "content_plain_legacy"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      RENAME COLUMN "content" TO "content_plain_legacy"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      RENAME COLUMN "content_rich" TO "content"
    `);

    await queryRunner.query(`
      UPDATE "channel"."message_replies"
      SET "content" = jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'content',
              CASE
                WHEN "content_plain_legacy" IS NULL OR "content_plain_legacy" = '' THEN '[]'::jsonb
                ELSE jsonb_build_array(jsonb_build_object('type', 'text', 'text', "content_plain_legacy"))
              END
          )
        )
      )
      WHERE "content" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      ALTER COLUMN "content" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      ALTER COLUMN "content" SET DEFAULT '{"type":"doc","content":[]}'::jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      DROP COLUMN "content_plain_legacy"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      RENAME COLUMN "description" TO "description_plain_legacy"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ADD COLUMN "description" jsonb NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb
    `);

    await queryRunner.query(`
      UPDATE "workspace"."issue"
      SET "description" = jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'content',
              CASE
                WHEN "description_plain_legacy" IS NULL OR trim("description_plain_legacy") = '' THEN '[]'::jsonb
                ELSE jsonb_build_array(jsonb_build_object('type', 'text', 'text', "description_plain_legacy"))
              END
          )
        )
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      DROP COLUMN "description_plain_legacy"
    `);

    await queryRunner.query(`
      UPDATE "scheduling"."scheduled_jobs"
      SET "payload" =
        ("payload" - 'contentRich' - 'content')
        || jsonb_build_object(
             'content',
             COALESCE(
               CASE
                 WHEN jsonb_typeof("payload"->'contentRich') = 'object'
                 THEN "payload"->'contentRich'
               END,
               CASE
                 WHEN jsonb_typeof("payload"->'content') = 'object'
                   AND ("payload"->'content'->>'type') = 'doc'
                 THEN "payload"->'content'
               END,
               jsonb_build_object(
                 'type', 'doc',
                 'content', jsonb_build_array(
                   jsonb_build_object(
                     'type', 'paragraph',
                     'content',
                       CASE
                         WHEN "payload"->>'content' IS NULL OR "payload"->>'content' = '' THEN '[]'::jsonb
                         ELSE jsonb_build_array(jsonb_build_object('type', 'text', 'text', "payload"->>'content'))
                       END
                   )
                 )
               )
             )
           )
      WHERE "type" = 'scheduled_message'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'MigrationRichTextJsonbUnified1777500000000 down() is not supported',
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAttachmentReferencesAndDrafts1779530000000
  implements MigrationInterface
{
  name = 'MigrationAttachmentReferencesAndDrafts1779530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "channel"."message_drafts" (
        "id" SERIAL NOT NULL,
        "workspace_id" INTEGER NOT NULL,
        "channel_id" INTEGER NOT NULL,
        "author_id" INTEGER NOT NULL,
        "thread_message_id" INTEGER,
        "content" JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}',
        "poll" JSONB,
        "quoted_message_id" INTEGER,
        "quoted_reply_id" INTEGER,
        "version" INTEGER NOT NULL DEFAULT 1,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message_drafts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_message_drafts_channel"
          FOREIGN KEY ("channel_id") REFERENCES "channel"."channel"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_message_drafts_thread"
          FOREIGN KEY ("thread_message_id") REFERENCES "channel"."messages"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_message_drafts_root"
      ON "channel"."message_drafts" ("channel_id", "author_id")
      WHERE "thread_message_id" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_message_drafts_reply"
      ON "channel"."message_drafts" ("channel_id", "thread_message_id", "author_id")
      WHERE "thread_message_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_message_drafts_author_workspace"
      ON "channel"."message_drafts" ("author_id", "workspace_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_message_drafts_expires_at"
      ON "channel"."message_drafts" ("expires_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "channel"."message_attachments" (
        "message_id" INTEGER NOT NULL,
        "attachment_id" INTEGER NOT NULL,
        CONSTRAINT "PK_message_attachments" PRIMARY KEY ("message_id", "attachment_id"),
        CONSTRAINT "FK_message_attachments_message"
          FOREIGN KEY ("message_id") REFERENCES "channel"."messages"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_message_attachments_attachment"
          FOREIGN KEY ("attachment_id") REFERENCES "workspace"."attachments"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "channel"."message_reply_attachments" (
        "message_reply_id" INTEGER NOT NULL,
        "attachment_id" INTEGER NOT NULL,
        CONSTRAINT "PK_message_reply_attachments" PRIMARY KEY ("message_reply_id", "attachment_id"),
        CONSTRAINT "FK_message_reply_attachments_reply"
          FOREIGN KEY ("message_reply_id") REFERENCES "channel"."message_replies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_message_reply_attachments_attachment"
          FOREIGN KEY ("attachment_id") REFERENCES "workspace"."attachments"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "channel"."message_draft_attachments" (
        "draft_id" INTEGER NOT NULL,
        "attachment_id" INTEGER NOT NULL,
        CONSTRAINT "PK_message_draft_attachments" PRIMARY KEY ("draft_id", "attachment_id"),
        CONSTRAINT "FK_message_draft_attachments_draft"
          FOREIGN KEY ("draft_id") REFERENCES "channel"."message_drafts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_message_draft_attachments_attachment"
          FOREIGN KEY ("attachment_id") REFERENCES "workspace"."attachments"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "scheduling"."scheduled_job_attachments" (
        "scheduled_job_id" UUID NOT NULL,
        "attachment_id" INTEGER NOT NULL,
        CONSTRAINT "PK_scheduled_job_attachments" PRIMARY KEY ("scheduled_job_id", "attachment_id"),
        CONSTRAINT "FK_scheduled_job_attachments_job"
          FOREIGN KEY ("scheduled_job_id") REFERENCES "scheduling"."scheduled_jobs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_scheduled_job_attachments_attachment"
          FOREIGN KEY ("attachment_id") REFERENCES "workspace"."attachments"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO "channel"."message_attachments" ("message_id", "attachment_id")
      SELECT "message_id", "id" FROM "workspace"."attachments"
      WHERE "message_id" IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "channel"."message_reply_attachments" ("message_reply_id", "attachment_id")
      SELECT "message_reply_id", "id" FROM "workspace"."attachments"
      WHERE "message_reply_id" IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."attachments" DROP COLUMN IF EXISTS "message_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."attachments" DROP COLUMN IF EXISTS "message_reply_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."attachments"
      ADD COLUMN IF NOT EXISTS "message_id" INTEGER
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."attachments"
      ADD COLUMN IF NOT EXISTS "message_reply_id" INTEGER
    `);

    await queryRunner.query(`
      UPDATE "workspace"."attachments" a
      SET "message_id" = ma."message_id"
      FROM "channel"."message_attachments" ma
      WHERE ma."attachment_id" = a."id"
    `);

    await queryRunner.query(`
      UPDATE "workspace"."attachments" a
      SET "message_reply_id" = mra."message_reply_id"
      FROM "channel"."message_reply_attachments" mra
      WHERE mra."attachment_id" = a."id"
    `);

    await queryRunner.query(
      `DROP TABLE IF EXISTS "scheduling"."scheduled_job_attachments"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "channel"."message_draft_attachments"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "channel"."message_reply_attachments"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "channel"."message_attachments"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "channel"."message_drafts"`);
  }
}

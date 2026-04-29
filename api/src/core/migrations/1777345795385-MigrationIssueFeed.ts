import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationIssueFeed1777345795385 implements MigrationInterface {
  name = 'MigrationIssueFeed1777345795385';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ADD COLUMN IF NOT EXISTS "comment_channel_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ADD CONSTRAINT "FK_issue_comment_channel_id"
      FOREIGN KEY ("comment_channel_id") REFERENCES "channel"."channel"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_issue_comment_channel_id"
      ON "workspace"."issue" ("comment_channel_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "workspace"."issue_activities" (
        "id" SERIAL NOT NULL,
        "issue_id" integer NOT NULL,
        "actor_id" integer,
        "type" character varying NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "message_id" integer,
        "attachment_id" integer,
        "payload" jsonb,
        CONSTRAINT "PK_issue_activities" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue_activities"
      ADD CONSTRAINT "FK_issue_activities_issue"
      FOREIGN KEY ("issue_id") REFERENCES "workspace"."issue"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue_activities"
      ADD CONSTRAINT "FK_issue_activities_actor"
      FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue_activities"
      ADD CONSTRAINT "FK_issue_activities_message"
      FOREIGN KEY ("message_id") REFERENCES "channel"."messages"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue_activities"
      ADD CONSTRAINT "FK_issue_activities_attachment"
      FOREIGN KEY ("attachment_id") REFERENCES "workspace"."attachments"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_issue_activities_issue_created"
      ON "workspace"."issue_activities" ("issue_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_issue_activities_message_id"
      ON "workspace"."issue_activities" ("message_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."attachments"
      ADD COLUMN IF NOT EXISTS "message_reply_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."attachments"
      ADD CONSTRAINT "FK_attachments_message_reply"
      FOREIGN KEY ("message_reply_id") REFERENCES "channel"."message_replies"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attachments_message_reply_id"
      ON "workspace"."attachments" ("message_reply_id")
    `);

    const issues: Array<{ id: number; workspace_id: number }> =
      await queryRunner.query(`
      SELECT id, workspace_id AS workspace_id FROM "workspace"."issue"
      WHERE comment_channel_id IS NULL
    `);

    for (const row of issues) {
      const ins: Array<{ id: number }> = await queryRunner.query(
        `
        INSERT INTO "channel"."channel" ("name", "workspace_id", "type", "created_at")
        VALUES ($1, $2, $3, now())
        RETURNING id
      `,
        ['', row.workspace_id, 'workspace_open'],
      );
      const channelId = ins[0]?.id;
      if (channelId) {
        await queryRunner.query(
          `UPDATE "workspace"."issue" SET comment_channel_id = $1 WHERE id = $2`,
          [channelId, row.id],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace"."attachments" DROP CONSTRAINT IF EXISTS "FK_attachments_message_reply"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "workspace"."IDX_attachments_message_reply_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "workspace"."attachments" DROP COLUMN IF EXISTS "message_reply_id"
    `);

    await queryRunner.query(
      `DROP TABLE IF EXISTS "workspace"."issue_activities"`,
    );

    await queryRunner.query(
      `ALTER TABLE "workspace"."issue" DROP CONSTRAINT IF EXISTS "FK_issue_comment_channel_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "workspace"."IDX_issue_comment_channel_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue" DROP COLUMN IF EXISTS "comment_channel_id"
    `);
  }
}

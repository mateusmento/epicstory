import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationIssueDescriptionThreads1779520000000
  implements MigrationInterface
{
  name = 'MigrationIssueDescriptionThreads1779520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace"."issue_description_thread" (
        "id" SERIAL NOT NULL,
        "workspace_id" INTEGER NOT NULL,
        "issue_id" INTEGER NOT NULL,
        "mark_id" UUID NOT NULL,
        "kind" VARCHAR NOT NULL,
        "status" VARCHAR NOT NULL DEFAULT 'open',
        "quote_text" TEXT,
        "proposed_text" TEXT,
        "created_by_id" INTEGER NOT NULL,
        "resolved_by_id" INTEGER,
        "resolved_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_issue_description_thread" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_issue_description_thread_mark" UNIQUE ("mark_id"),
        CONSTRAINT "FK_issue_description_thread_workspace"
          FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_description_thread_issue"
          FOREIGN KEY ("issue_id") REFERENCES "workspace"."issue"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_issue_description_thread_kind"
          CHECK ("kind" IN ('comment', 'suggestion')),
        CONSTRAINT "CHK_issue_description_thread_status"
          CHECK ("status" IN ('open', 'resolved', 'accepted', 'rejected'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_issue_description_thread_issue"
      ON "workspace"."issue_description_thread" ("issue_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_issue_description_thread_workspace"
      ON "workspace"."issue_description_thread" ("workspace_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace"."issue_description_thread_message" (
        "id" SERIAL NOT NULL,
        "thread_id" INTEGER NOT NULL,
        "author_id" INTEGER NOT NULL,
        "content" JSONB NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "edited_at" TIMESTAMPTZ,
        CONSTRAINT "PK_issue_description_thread_message" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_description_thread_message_thread"
          FOREIGN KEY ("thread_id") REFERENCES "workspace"."issue_description_thread"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_issue_description_thread_message_thread"
      ON "workspace"."issue_description_thread_message" ("thread_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "workspace"."issue_description_thread_message"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "workspace"."issue_description_thread"
    `);
  }
}

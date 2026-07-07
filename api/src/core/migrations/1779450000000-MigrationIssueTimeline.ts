import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationIssueTimeline1779450000000 implements MigrationInterface {
  name = 'MigrationIssueTimeline1779450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ADD COLUMN IF NOT EXISTS "issue_type" VARCHAR NOT NULL DEFAULT 'task'
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ADD COLUMN IF NOT EXISTS "starts_at" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ADD COLUMN IF NOT EXISTS "ends_at" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace"."issue_dependency" (
        "id" SERIAL NOT NULL,
        "workspace_id" INTEGER NOT NULL,
        "issue_id" INTEGER NOT NULL,
        "depends_on_issue_id" INTEGER NOT NULL,
        CONSTRAINT "PK_issue_dependency" PRIMARY KEY ("id"),
        CONSTRAINT "FK_issue_dependency_workspace"
          FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_dependency_issue"
          FOREIGN KEY ("issue_id") REFERENCES "workspace"."issue"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_issue_dependency_depends_on_issue"
          FOREIGN KEY ("depends_on_issue_id") REFERENCES "workspace"."issue"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_issue_dependency_not_self"
          CHECK ("issue_id" <> "depends_on_issue_id"),
        CONSTRAINT "UQ_issue_dependency_pair"
          UNIQUE ("issue_id", "depends_on_issue_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_issue_dependency_workspace"
      ON "workspace"."issue_dependency" ("workspace_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_issue_dependency_issue"
      ON "workspace"."issue_dependency" ("issue_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_issue_dependency_depends_on"
      ON "workspace"."issue_dependency" ("depends_on_issue_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "workspace"."issue_dependency"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      DROP COLUMN IF EXISTS "ends_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      DROP COLUMN IF EXISTS "starts_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      DROP COLUMN IF EXISTS "issue_type"
    `);
  }
}

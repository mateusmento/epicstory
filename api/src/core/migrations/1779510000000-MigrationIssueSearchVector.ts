import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationIssueSearchVector1779510000000
  implements MigrationInterface
{
  name = 'MigrationIssueSearchVector1779510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ADD COLUMN IF NOT EXISTS "search_vector" tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce("issue_key", '')), 'A') ||
        setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('english', coalesce("description"::text, '')), 'B')
      ) STORED
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_issue_search_vector"
      ON "workspace"."issue" USING GIN ("search_vector")
    `);

    // Replaced by FTS vector index above.
    await queryRunner.query(`
      DROP INDEX IF EXISTS "workspace"."IDX_workspace_issue_title_trgm"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "workspace"."IDX_workspace_issue_issue_key_trgm"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "workspace"."IDX_workspace_issue_search_vector"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue" DROP COLUMN IF EXISTS "search_vector"
    `);

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_issue_title_trgm"
      ON "workspace"."issue" USING GIN ("title" gin_trgm_ops)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_issue_issue_key_trgm"
      ON "workspace"."issue" USING GIN ("issue_key" gin_trgm_ops)
    `);
  }
}

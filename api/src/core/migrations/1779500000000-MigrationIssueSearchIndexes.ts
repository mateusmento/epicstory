import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationIssueSearchIndexes1779500000000
  implements MigrationInterface
{
  name = 'MigrationIssueSearchIndexes1779500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "workspace"."IDX_workspace_issue_issue_key_trgm"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "workspace"."IDX_workspace_issue_title_trgm"
    `);
  }
}

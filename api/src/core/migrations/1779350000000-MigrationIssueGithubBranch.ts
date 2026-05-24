import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationIssueGithubBranch1779350000000
  implements MigrationInterface
{
  name = 'MigrationIssueGithubBranch1779350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ADD COLUMN "github_branch" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      DROP COLUMN "github_branch"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationIssueGithubBranches1779380000000
  implements MigrationInterface
{
  name = 'MigrationIssueGithubBranches1779380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "integration"."issue_github_branches" (
        "id" SERIAL NOT NULL,
        "issue_id" integer NOT NULL,
        "workspace_id" integer NOT NULL,
        "owner" character varying NOT NULL,
        "repo_name" character varying NOT NULL,
        "branch_name" character varying NOT NULL,
        "source" character varying NOT NULL DEFAULT 'webhook_push',
        "first_linked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_pushed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_issue_github_branches" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_issue_github_branches_issue_repo_branch"
      ON "integration"."issue_github_branches" ("issue_id", "owner", "repo_name", "branch_name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_issue_github_branches_workspace"
      ON "integration"."issue_github_branches" ("workspace_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "integration"."issue_github_branches"
      ADD CONSTRAINT "FK_issue_github_branches_issue"
      FOREIGN KEY ("issue_id") REFERENCES "workspace"."issue"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "integration"."issue_github_branches"
      DROP CONSTRAINT "FK_issue_github_branches_issue"
    `);
    await queryRunner.query(
      `DROP INDEX "integration"."IDX_issue_github_branches_workspace"`,
    );
    await queryRunner.query(
      `DROP INDEX "integration"."UQ_issue_github_branches_issue_repo_branch"`,
    );
    await queryRunner.query(`DROP TABLE "integration"."issue_github_branches"`);
  }
}

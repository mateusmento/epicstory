import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationIssueGithubPullRequests1779275945495
  implements MigrationInterface
{
  name = 'MigrationIssueGithubPullRequests1779275945495';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "integration"."issue_github_pull_requests" (
        "id" SERIAL NOT NULL,
        "issue_id" integer NOT NULL,
        "github_pull_request_id" bigint NOT NULL,
        "owner" character varying NOT NULL,
        "repo_name" character varying NOT NULL,
        "pr_number" integer NOT NULL,
        "html_url" text NOT NULL,
        "head_ref" text,
        "base_ref" text,
        "state" character varying NOT NULL,
        "draft" boolean NOT NULL DEFAULT false,
        "merged" boolean NOT NULL DEFAULT false,
        "merged_at" TIMESTAMP WITH TIME ZONE,
        "closed_at" TIMESTAMP WITH TIME ZONE,
        "github_updated_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_issue_github_pull_requests" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_issue_github_pull_requests_gh_pr_id" UNIQUE ("github_pull_request_id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_issue_github_pull_requests_issue_id"
      ON "integration"."issue_github_pull_requests" ("issue_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "integration"."issue_github_pull_requests"
      ADD CONSTRAINT "FK_issue_github_pull_requests_issue"
        FOREIGN KEY ("issue_id")
        REFERENCES "workspace"."issue"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "integration"."issue_github_pull_requests"
      DROP CONSTRAINT "FK_issue_github_pull_requests_issue";
    `);
    await queryRunner.query(
      `DROP INDEX "integration"."IDX_issue_github_pull_requests_issue_id";`,
    );
    await queryRunner.query(
      `DROP TABLE "integration"."issue_github_pull_requests"`,
    );
  }
}

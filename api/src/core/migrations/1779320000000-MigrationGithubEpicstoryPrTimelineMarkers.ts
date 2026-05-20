import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationGithubEpicstoryPrTimelineMarkers1779320000000
  implements MigrationInterface
{
  name = 'MigrationGithubEpicstoryPrTimelineMarkers1779320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "integration"."github_epicstory_pr_timeline_markers" (
        "issue_id" integer NOT NULL,
        "github_pull_request_id" bigint NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_github_epicstory_pr_timeline_markers"
          PRIMARY KEY ("issue_id", "github_pull_request_id")
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "integration"."github_epicstory_pr_timeline_markers"
      ADD CONSTRAINT "FK_github_epicstory_pr_tm_issue"
      FOREIGN KEY ("issue_id") REFERENCES "workspace"."issue"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "integration"."github_epicstory_pr_timeline_markers"
      DROP CONSTRAINT "FK_github_epicstory_pr_tm_issue";
    `);
    await queryRunner.query(`
      DROP TABLE "integration"."github_epicstory_pr_timeline_markers";
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationDropProjectGithubRepos1779360000000
  implements MigrationInterface
{
  name = 'MigrationDropProjectGithubRepos1779360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "integration"."UQ_project_github_repos_one_primary_per_project"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "integration"."UQ_project_github_repos_project_owner_name"`,
    );
    await queryRunner.query(`
      ALTER TABLE "integration"."project_github_repos"
      DROP CONSTRAINT IF EXISTS "FK_project_github_repos_project"
    `);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "integration"."project_github_repos"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "integration"."project_github_repos" (
        "id" SERIAL NOT NULL,
        "project_id" integer NOT NULL,
        "owner" character varying NOT NULL,
        "name" character varying NOT NULL,
        "github_repo_id" bigint NOT NULL,
        "default_branch" character varying,
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_project_github_repos" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_project_github_repos_project_owner_name"
      ON "integration"."project_github_repos" ("project_id", "owner", "name")
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."project_github_repos"
      ADD CONSTRAINT "FK_project_github_repos_project"
      FOREIGN KEY ("project_id") REFERENCES "workspace"."workspace_project"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_project_github_repos_one_primary_per_project"
      ON "integration"."project_github_repos" ("project_id")
      WHERE "is_primary" = true
    `);
  }
}

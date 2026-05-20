import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationProjectGithubReposPrimary1779340000000
  implements MigrationInterface
{
  name = 'MigrationProjectGithubReposPrimary1779340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "integration"."project_github_repos"
      ADD COLUMN "is_primary" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      UPDATE "integration"."project_github_repos" p
      SET "is_primary" = true
      FROM (
        SELECT DISTINCT ON ("project_id") "id"
        FROM "integration"."project_github_repos"
        ORDER BY "project_id", "id" ASC
      ) x
      WHERE p."id" = x."id";
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_project_github_repos_one_primary_per_project"
      ON "integration"."project_github_repos" ("project_id")
      WHERE "is_primary" = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "integration"."UQ_project_github_repos_one_primary_per_project"`,
    );
    await queryRunner.query(`
      ALTER TABLE "integration"."project_github_repos"
      DROP COLUMN "is_primary";
    `);
  }
}

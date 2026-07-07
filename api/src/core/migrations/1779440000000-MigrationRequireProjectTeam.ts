import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationRequireProjectTeam1779440000000
  implements MigrationInterface
{
  name = 'MigrationRequireProjectTeam1779440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "workspace"."team" ("name", "workspace_id", "sprint_cadence_days")
      SELECT w."name", w."id", 14
      FROM "workspace"."workspace" w
      WHERE NOT EXISTS (
        SELECT 1 FROM "workspace"."team" t WHERE t."workspace_id" = w."id"
      )
    `);

    await queryRunner.query(`
      UPDATE "workspace"."workspace_project" p
      SET "team_id" = (
        SELECT t."id"
        FROM "workspace"."team" t
        WHERE t."workspace_id" = p."workspace_id"
        ORDER BY t."id" ASC
        LIMIT 1
      )
      WHERE p."team_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace_project"
      ALTER COLUMN "team_id" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace_project"
      ALTER COLUMN "team_id" DROP NOT NULL
    `);
  }
}

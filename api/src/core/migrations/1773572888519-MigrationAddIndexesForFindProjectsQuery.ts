import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddIndexesForFindProjectsQuery1773572888519
  implements MigrationInterface
{
  name = 'MigrationAddIndexesForFindProjectsQuery1773572888519';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // FindProjectsQuery filters by workspace_id (+ optional team_id) and orders by name/id.
    // It also computes issueCount via a correlated subquery on workspace.issue(project_id).

    // Helps: WHERE workspace_id = ? ORDER BY name, id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_project_workspace_id_name_id"
      ON "workspace"."workspace_project" ("workspace_id", "name", "id")
    `);

    // Helps: WHERE workspace_id = ? AND team_id = ? ORDER BY name, id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_project_workspace_id_team_id_name_id"
      ON "workspace"."workspace_project" ("workspace_id", "team_id", "name", "id")
    `);

    // Helps: correlated COUNT(*) on issues by project_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_issue_project_id"
      ON "workspace"."issue" ("project_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "workspace"."IDX_issue_project_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "workspace"."IDX_workspace_project_workspace_id_team_id_name_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "workspace"."IDX_workspace_project_workspace_id_name_id"
    `);
  }
}

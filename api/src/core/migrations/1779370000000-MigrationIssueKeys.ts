import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  candidateIssueKeyPrefixFromProjectName,
  disambiguateIssueKeyPrefix,
} from 'src/project/domain/issue-key';

type ProjectRow = {
  id: number;
  workspace_id: number;
  name: string;
};

export class MigrationIssueKeys1779370000000 implements MigrationInterface {
  name = 'MigrationIssueKeys1779370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace_project"
      ADD COLUMN "issue_key_prefix" character varying(10),
      ADD COLUMN "next_issue_number" integer NOT NULL DEFAULT 1
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ADD COLUMN "issue_number" integer,
      ADD COLUMN "issue_key" character varying(20)
    `);

    await this.backfillProjectIssueKeyPrefixes(queryRunner);

    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace_project"
      ALTER COLUMN "issue_key_prefix" SET NOT NULL
    `);

    await queryRunner.query(`
      WITH numbered AS (
        SELECT
          i.id,
          i.project_id,
          ROW_NUMBER() OVER (
            PARTITION BY i.project_id
            ORDER BY i.created_at ASC, i.id ASC
          )::integer AS num
        FROM "workspace"."issue" i
      )
      UPDATE "workspace"."issue" i
      SET
        "issue_number" = n.num,
        "issue_key" = p."issue_key_prefix" || '-' || n.num::text
      FROM numbered n
      INNER JOIN "workspace"."workspace_project" p ON p.id = n.project_id
      WHERE i.id = n.id
    `);

    await queryRunner.query(`
      UPDATE "workspace"."workspace_project" p
      SET "next_issue_number" = COALESCE(
        (
          SELECT MAX(i."issue_number") + 1
          FROM "workspace"."issue" i
          WHERE i."project_id" = p.id
        ),
        1
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ALTER COLUMN "issue_number" SET NOT NULL,
      ALTER COLUMN "issue_key" SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_workspace_project_issue_key_prefix"
      ON "workspace"."workspace_project" ("workspace_id", "issue_key_prefix")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_issue_project_issue_number"
      ON "workspace"."issue" ("project_id", "issue_number")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_issue_workspace_issue_key"
      ON "workspace"."issue" ("workspace_id", "issue_key")
    `);
  }

  /**
   * Assign prefixes in stable order using the same disambiguation as runtime
   * (`disambiguateIssueKeyPrefix`). Pure SQL suffix tricks can collide across
   * different base names (e.g. `PROJECT5` + `2` → `PROJECT52`).
   */
  private async backfillProjectIssueKeyPrefixes(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const projects = (await queryRunner.query(`
      SELECT id, workspace_id, name
      FROM "workspace"."workspace_project"
      ORDER BY workspace_id ASC, id ASC
    `)) as ProjectRow[];

    const takenByWorkspace = new Map<number, Set<string>>();

    for (const project of projects) {
      const workspaceId = project.workspace_id;
      const taken = takenByWorkspace.get(workspaceId) ?? new Set<string>();
      const base = candidateIssueKeyPrefixFromProjectName(project.name ?? '');
      const prefix = disambiguateIssueKeyPrefix(base, taken);
      taken.add(prefix);
      takenByWorkspace.set(workspaceId, taken);

      await queryRunner.query(
        `
          UPDATE "workspace"."workspace_project"
          SET "issue_key_prefix" = $1
          WHERE id = $2
        `,
        [prefix, project.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "workspace"."UQ_issue_workspace_issue_key"`,
    );
    await queryRunner.query(
      `DROP INDEX "workspace"."UQ_issue_project_issue_number"`,
    );
    await queryRunner.query(
      `DROP INDEX "workspace"."UQ_workspace_project_issue_key_prefix"`,
    );
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      DROP COLUMN "issue_key",
      DROP COLUMN "issue_number"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace_project"
      DROP COLUMN "next_issue_number",
      DROP COLUMN "issue_key_prefix"
    `);
  }
}

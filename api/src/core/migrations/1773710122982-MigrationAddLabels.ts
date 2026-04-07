import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddLabels1773710122982 implements MigrationInterface {
  name = 'MigrationAddLabels1773710122982';

  private async tableExists(queryRunner: QueryRunner, table: string) {
    // `to_regclass` returns NULL when the relation does not exist.
    const res = await queryRunner.query(
      `SELECT to_regclass($1) IS NOT NULL as "exists"`,
      [table],
    );
    return Boolean(res?.[0]?.exists);
  }

  private async constraintExists(queryRunner: QueryRunner, name: string) {
    const res = await queryRunner.query(
      `SELECT 1 FROM pg_constraint WHERE conname = $1 LIMIT 1`,
      [name],
    );
    return (res?.length ?? 0) > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Be tolerant in dev: if a table already exists (e.g. DB restored / migrations table reset),
    // don't crash startup. Still attempt to create missing indexes/constraints.

    const hasLabel = await this.tableExists(queryRunner, 'workspace.label');
    if (!hasLabel) {
      await queryRunner.query(`
        CREATE TABLE "workspace"."label" (
          "id" SERIAL NOT NULL,
          "workspace_id" integer NOT NULL,
          "name" character varying NOT NULL,
          "color" character varying NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_workspace_label_id" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_workspace_label_workspace_name" UNIQUE ("workspace_id", "name")
        )
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_label_workspace_id"
      ON "workspace"."label" ("workspace_id")
    `);

    if (
      !(await this.constraintExists(
        queryRunner,
        'FK_workspace_label_workspace',
      ))
    ) {
      await queryRunner.query(`
        ALTER TABLE "workspace"."label"
        ADD CONSTRAINT "FK_workspace_label_workspace"
        FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }

    const hasIssueLabel = await this.tableExists(
      queryRunner,
      'workspace.issue_label',
    );
    if (!hasIssueLabel) {
      await queryRunner.query(`
        CREATE TABLE "workspace"."issue_label" (
          "issue_id" integer NOT NULL,
          "label_id" integer NOT NULL,
          CONSTRAINT "PK_workspace_issue_label" PRIMARY KEY ("issue_id", "label_id")
        )
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_issue_label_issue_id"
      ON "workspace"."issue_label" ("issue_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_issue_label_label_id"
      ON "workspace"."issue_label" ("label_id")
    `);

    if (
      !(await this.constraintExists(
        queryRunner,
        'FK_workspace_issue_label_issue',
      ))
    ) {
      await queryRunner.query(`
        ALTER TABLE "workspace"."issue_label"
        ADD CONSTRAINT "FK_workspace_issue_label_issue"
        FOREIGN KEY ("issue_id") REFERENCES "workspace"."issue"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }

    if (
      !(await this.constraintExists(
        queryRunner,
        'FK_workspace_issue_label_label',
      ))
    ) {
      await queryRunner.query(`
        ALTER TABLE "workspace"."issue_label"
        ADD CONSTRAINT "FK_workspace_issue_label_label"
        FOREIGN KEY ("label_id") REFERENCES "workspace"."label"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Keep original down behavior (may fail if objects are already gone).
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue_label" DROP CONSTRAINT "FK_workspace_issue_label_label"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue_label" DROP CONSTRAINT "FK_workspace_issue_label_issue"
    `);
    await queryRunner.query(`
      DROP INDEX "workspace"."IDX_workspace_issue_label_label_id"
    `);
    await queryRunner.query(`
      DROP INDEX "workspace"."IDX_workspace_issue_label_issue_id"
    `);
    await queryRunner.query(`
      DROP TABLE "workspace"."issue_label"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."label" DROP CONSTRAINT "FK_workspace_label_workspace"
    `);
    await queryRunner.query(`
      DROP INDEX "workspace"."IDX_workspace_label_workspace_id"
    `);
    await queryRunner.query(`
      DROP TABLE "workspace"."label"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddLabels1773710122982 implements MigrationInterface {
  name = 'MigrationAddLabels1773710122982';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.query(`
      CREATE INDEX "IDX_workspace_label_workspace_id" ON "workspace"."label" ("workspace_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."label"
      ADD CONSTRAINT "FK_workspace_label_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "workspace"."issue_label" (
        "issue_id" integer NOT NULL,
        "label_id" integer NOT NULL,
        CONSTRAINT "PK_workspace_issue_label" PRIMARY KEY ("issue_id", "label_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_workspace_issue_label_issue_id" ON "workspace"."issue_label" ("issue_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_workspace_issue_label_label_id" ON "workspace"."issue_label" ("label_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue_label"
      ADD CONSTRAINT "FK_workspace_issue_label_issue"
      FOREIGN KEY ("issue_id") REFERENCES "workspace"."issue"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue_label"
      ADD CONSTRAINT "FK_workspace_issue_label_label"
      FOREIGN KEY ("label_id") REFERENCES "workspace"."label"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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

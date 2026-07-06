import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationSprints1779420000000 implements MigrationInterface {
  name = 'MigrationSprints1779420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old stub sprint table (no production data)
    await queryRunner.query(
      `DROP TABLE IF EXISTS "workspace"."sprint" CASCADE`,
    );

    await queryRunner.query(`
      CREATE TABLE "workspace"."sprint" (
        "id" SERIAL NOT NULL,
        "team_id" integer NOT NULL,
        "workspace_id" integer NOT NULL,
        "name" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'planned',
        "starts_at" TIMESTAMPTZ,
        "ends_at" TIMESTAMPTZ,
        "created_by_id" integer NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sprint" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sprint_team_id" ON "workspace"."sprint" ("team_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sprint_team_status" ON "workspace"."sprint" ("team_id", "status")
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."sprint"
        ADD CONSTRAINT "FK_sprint_team"
        FOREIGN KEY ("team_id")
        REFERENCES "workspace"."team"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "workspace"."sprint_item" (
        "id" SERIAL NOT NULL,
        "sprint_id" integer NOT NULL,
        "issue_id" integer NOT NULL,
        "order" float NOT NULL DEFAULT 0,
        "completed_status" varchar,
        "destination_sprint_id" integer,
        CONSTRAINT "PK_sprint_item" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sprint_item_sprint_id" ON "workspace"."sprint_item" ("sprint_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sprint_item_issue_id" ON "workspace"."sprint_item" ("issue_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."sprint_item"
        ADD CONSTRAINT "FK_sprint_item_sprint"
        FOREIGN KEY ("sprint_id")
        REFERENCES "workspace"."sprint"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."sprint_item"
        ADD CONSTRAINT "FK_sprint_item_issue"
        FOREIGN KEY ("issue_id")
        REFERENCES "workspace"."issue"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."sprint_item"
        ADD CONSTRAINT "FK_sprint_item_destination_sprint"
        FOREIGN KEY ("destination_sprint_id")
        REFERENCES "workspace"."sprint"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."team"
        ADD COLUMN IF NOT EXISTS "sprint_cadence_days" integer NOT NULL DEFAULT 14
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace"."team" DROP COLUMN IF EXISTS "sprint_cadence_days"`,
    );

    await queryRunner.query(
      `ALTER TABLE "workspace"."sprint_item" DROP CONSTRAINT IF EXISTS "FK_sprint_item_destination_sprint"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace"."sprint_item" DROP CONSTRAINT IF EXISTS "FK_sprint_item_issue"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace"."sprint_item" DROP CONSTRAINT IF EXISTS "FK_sprint_item_sprint"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "workspace"."IDX_sprint_item_issue_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "workspace"."IDX_sprint_item_sprint_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace"."sprint_item"`);

    await queryRunner.query(
      `ALTER TABLE "workspace"."sprint" DROP CONSTRAINT IF EXISTS "FK_sprint_team"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "workspace"."IDX_sprint_team_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "workspace"."IDX_sprint_team_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace"."sprint"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationUserProjectAccess1779400000000
  implements MigrationInterface
{
  name = 'MigrationUserProjectAccess1779400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workspace"."user_project_access" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "project_id" integer NOT NULL,
        "accessed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_project_access" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_project_access_user_project" UNIQUE ("user_id", "project_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_project_access_user_accessed"
      ON "workspace"."user_project_access" ("user_id", "accessed_at" DESC)
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."user_project_access"
      ADD CONSTRAINT "FK_user_project_access_project"
      FOREIGN KEY ("project_id")
      REFERENCES "workspace"."workspace_project"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."user_project_access"
      ADD CONSTRAINT "FK_user_project_access_user"
      FOREIGN KEY ("user_id")
      REFERENCES "auth"."users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."user_project_access"
      DROP CONSTRAINT IF EXISTS "FK_user_project_access_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."user_project_access"
      DROP CONSTRAINT IF EXISTS "FK_user_project_access_project"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "workspace"."IDX_user_project_access_user_accessed"
    `);

    await queryRunner.query(`
      DROP TABLE "workspace"."user_project_access"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationWorkspaceDeletionStatus1779490000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace"
        ADD COLUMN IF NOT EXISTS "status" character varying NOT NULL DEFAULT 'active'
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace"
        ADD COLUMN IF NOT EXISTS "deletion_requested_at" TIMESTAMPTZ NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace"
        ADD COLUMN IF NOT EXISTS "deletion_requested_by_user_id" integer NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace"
        DROP COLUMN IF EXISTS "deletion_requested_by_user_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace"
        DROP COLUMN IF EXISTS "deletion_requested_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace"
        DROP COLUMN IF EXISTS "status"
    `);
  }
}

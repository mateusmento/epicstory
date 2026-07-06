import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationUserProjectAccessCount1779430000000
  implements MigrationInterface
{
  name = 'MigrationUserProjectAccessCount1779430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."user_project_access"
      ADD COLUMN "access_count" integer NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."user_project_access"
      DROP COLUMN "access_count"
    `);
  }
}

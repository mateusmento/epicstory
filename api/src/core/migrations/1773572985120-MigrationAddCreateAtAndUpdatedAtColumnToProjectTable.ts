import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddCreateAtAndUpdatedAtColumnToProjectTable1773572985120
  implements MigrationInterface
{
  name = 'MigrationAddCreateAtAndUpdatedAtColumnToProjectTable1773572985120';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace_project"
      ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace_project"
      ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace_project" DROP COLUMN "updated_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace_project" DROP COLUMN "created_at"
    `);
  }
}

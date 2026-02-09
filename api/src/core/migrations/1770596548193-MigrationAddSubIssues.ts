import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddParentIssueIdColumn1770596548193
  implements MigrationInterface
{
  name = 'MigrationAddParentIssueIdColumn1770596548193';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue"
            ADD "parent_issue_id" integer
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue"
            ADD CONSTRAINT "FK_bd360b61bc2a40305214b4959d6" FOREIGN KEY ("parent_issue_id") REFERENCES "workspace"."issue"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue" DROP CONSTRAINT "FK_bd360b61bc2a40305214b4959d6"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue" DROP COLUMN "parent_issue_id"
        `);
  }
}

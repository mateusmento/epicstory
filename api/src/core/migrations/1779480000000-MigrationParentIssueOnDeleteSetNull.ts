import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationParentIssueOnDeleteSetNull1779480000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
        DROP CONSTRAINT IF EXISTS "FK_bd360b61bc2a40305214b4959d6"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
        ADD CONSTRAINT "FK_bd360b61bc2a40305214b4959d6"
        FOREIGN KEY ("parent_issue_id")
        REFERENCES "workspace"."issue"("id")
        ON DELETE SET NULL
        ON UPDATE NO ACTION
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
        DROP CONSTRAINT IF EXISTS "FK_bd360b61bc2a40305214b4959d6"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
        ADD CONSTRAINT "FK_bd360b61bc2a40305214b4959d6"
        FOREIGN KEY ("parent_issue_id")
        REFERENCES "workspace"."issue"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    `);
  }
}

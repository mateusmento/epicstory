import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationDropBacklogItemPrevNextColumns1770582113870
  implements MigrationInterface
{
  name = 'MigrationDropBacklogItemPrevNextColumns1770582113870';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT IF EXISTS "FK_03490acb11ea61f1aa3bd2a226c"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT IF EXISTS "FK_c95845eb3f03c9fe73e7aa34472"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT IF EXISTS "UQ_03490acb11ea61f1aa3bd2a226c"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT IF EXISTS "UQ_c95845eb3f03c9fe73e7aa34472"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."backlog_item" DROP COLUMN IF EXISTS "previous_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."backlog_item" DROP COLUMN IF EXISTS "next_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."backlog_item" ADD COLUMN "previous_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."backlog_item" ADD COLUMN "next_id" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."backlog_item"
      ADD CONSTRAINT "UQ_c95845eb3f03c9fe73e7aa34472" UNIQUE ("previous_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."backlog_item"
      ADD CONSTRAINT "UQ_03490acb11ea61f1aa3bd2a226c" UNIQUE ("next_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."backlog_item"
      ADD CONSTRAINT "FK_c95845eb3f03c9fe73e7aa34472" FOREIGN KEY ("previous_id") REFERENCES "workspace"."backlog_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."backlog_item"
      ADD CONSTRAINT "FK_03490acb11ea61f1aa3bd2a226c" FOREIGN KEY ("next_id") REFERENCES "workspace"."backlog_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }
}

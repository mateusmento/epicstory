import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddMessageIsScheduled1776899108599
  implements MigrationInterface
{
  name = 'MigrationAddMessageIsScheduled1776899108599';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      ADD COLUMN "is_scheduled" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."messages" DROP COLUMN "is_scheduled"
    `);
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddMessageEditedAt1775855849647
  implements MigrationInterface
{
  name = 'MigrationAddMessageEditedAt1775855849647';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      ADD COLUMN "edited_at" TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      DROP COLUMN "edited_at"
    `);
  }
}

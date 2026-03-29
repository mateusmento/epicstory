import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddMeetingTimestamps1774809872150
  implements MigrationInterface
{
  name = 'MigrationAddMeetingTimestamps1774809872150';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "channel";`);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // Backfill existing rows (in case the columns were added without defaults in some envs).
    await queryRunner.query(`
      UPDATE "channel"."meetings"
      SET created_at = COALESCE(created_at, now())
    `);
    await queryRunner.query(`
      UPDATE "channel"."meetings"
      SET updated_at = COALESCE(updated_at, created_at, now())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings" DROP COLUMN IF EXISTS "updated_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings" DROP COLUMN IF EXISTS "created_at"
    `);
  }
}

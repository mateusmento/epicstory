import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddNotificationsUpdatedAt1774810241743
  implements MigrationInterface
{
  name = 'MigrationAddNotificationsUpdatedAt1774810241743';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "scheduler";`);

    await queryRunner.query(`
      ALTER TABLE "scheduler"."notifications"
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // Backfill existing rows (if any) to a sensible value.
    await queryRunner.query(`
      UPDATE "scheduler"."notifications"
      SET updated_at = COALESCE(updated_at, created_at, now())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "scheduler"."notifications"
      DROP COLUMN IF EXISTS "updated_at"
    `);
  }
}


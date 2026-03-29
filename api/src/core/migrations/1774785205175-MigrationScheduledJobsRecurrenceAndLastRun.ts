import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationScheduledJobsRecurrenceAndLastRun1774785205175
  implements MigrationInterface
{
  name = 'MigrationScheduledJobsRecurrenceAndLastRun1774785205175';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "scheduling";`);

    await queryRunner.query(`
      ALTER TABLE "scheduling"."scheduled_jobs"
      ADD COLUMN IF NOT EXISTS "last_run_at" TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "scheduling"."scheduled_jobs"
      DROP COLUMN IF EXISTS "last_run_at"
    `);
  }
}

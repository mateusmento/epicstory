import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddLockIdColumnToScheduledEvents1763996451162
  implements MigrationInterface
{
  name = 'MigrationAddLockIdColumnToScheduledEvents1763996451162';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "scheduler"."scheduled_events"
            ADD "lock_id" uuid
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "scheduler"."scheduled_events" DROP COLUMN "lock_id"
        `);
  }
}

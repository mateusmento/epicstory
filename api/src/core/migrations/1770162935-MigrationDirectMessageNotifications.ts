import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationDirectMessageNotifications1770162935000
  implements MigrationInterface
{
  name = 'MigrationDirectMessageNotifications1770162935000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Convert message notifications for DMs into direct_message notifications
    await queryRunner.query(`
      UPDATE scheduler.notifications
      SET type = 'direct_message'
      WHERE type = 'message'
        AND payload->'channel'->>'type' IN ('direct', 'multi-direct')
    `);

    // Remove message notifications created from group channels
    await queryRunner.query(`
      DELETE FROM scheduler.notifications
      WHERE type = 'message'
        AND payload->'channel'->>'type' = 'group'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore DM notifications back to message
    await queryRunner.query(`
      UPDATE scheduler.notifications
      SET type = 'message'
      WHERE type = 'direct_message'
        AND payload->'channel'->>'type' IN ('direct', 'multi-direct')
    `);
  }
}

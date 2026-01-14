import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddDirectChannelPeersColumns1768236782000
  implements MigrationInterface
{
  name = 'MigrationAddDirectChannelPeersColumns1768236782000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "channel"."channel"
        ADD "dm_user_lower_id" integer
    `);
    await queryRunner.query(`
        ALTER TABLE "channel"."channel"
        ADD "dm_user_greater_id" integer
    `);
    await queryRunner.query(`
        ALTER TABLE "workspace"."team_member"
        ALTER COLUMN "joined_at"
        SET DEFAULT 'now()'
    `);
    await queryRunner.query(`
        ALTER TABLE "workspace"."workspace_member"
        ALTER COLUMN "joined_at"
        SET DEFAULT 'now()'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "workspace"."workspace_member"
        ALTER COLUMN "joined_at"
        SET DEFAULT '2026-01-12 16:52:20.414936'
    `);
    await queryRunner.query(`
        ALTER TABLE "workspace"."team_member"
        ALTER COLUMN "joined_at"
        SET DEFAULT '2026-01-12 16:52:20.414936'
    `);
    await queryRunner.query(`
        ALTER TABLE "channel"."channel" DROP COLUMN "dm_user_greater_id"
    `);
    await queryRunner.query(`
        ALTER TABLE "channel"."channel" DROP COLUMN "dm_user_lower_id"
    `);
  }
}

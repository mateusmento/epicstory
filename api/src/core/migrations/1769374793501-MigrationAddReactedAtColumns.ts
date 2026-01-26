import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddReactedAtColumns1769374793501
  implements MigrationInterface
{
  name = 'MigrationAddReactedAtColumns1769374793501';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reply_reactions"
            ADD "reacted_at" TIMESTAMP NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reactions"
            ADD "reacted_at" TIMESTAMP NOT NULL
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
            SET DEFAULT '2026-01-23 01:05:12.114967'
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2026-01-23 01:05:12.114967'
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reactions" DROP COLUMN "reacted_at"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reply_reactions" DROP COLUMN "reacted_at"
        `);
  }
}

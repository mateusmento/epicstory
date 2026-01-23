import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddUniqueConstraintToReactionTables1769130308515
  implements MigrationInterface
{
  name = 'MigrationAddUniqueConstraintToReactionTables1769130308515';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reactions"
            ADD CONSTRAINT "unique_message_reaction" UNIQUE ("message_id", "emoji", "user_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reply_reactions"
            ADD CONSTRAINT "unique_message_reply_reaction" UNIQUE ("message_reply_id", "emoji", "user_id")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reply_reactions" DROP CONSTRAINT "unique_message_reply_reaction"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reactions" DROP CONSTRAINT "unique_message_reaction"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2026-01-22 22:22:06.764177'
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2026-01-22 22:22:06.764177'
        `);
  }
}

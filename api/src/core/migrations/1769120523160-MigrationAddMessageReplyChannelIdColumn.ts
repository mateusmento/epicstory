import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddMessageReplyChannelIdColumn1769120523160
  implements MigrationInterface
{
  name = 'MigrationAddMessageReplyChannelIdColumn1769120523160';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "channel"."message_replies"
            ADD "channel_id" integer NOT NULL
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
            SET DEFAULT '2026-01-13 00:39:09.087143'
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2026-01-13 00:39:09.087143'
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_replies" DROP COLUMN "channel_id"
        `);
  }
}

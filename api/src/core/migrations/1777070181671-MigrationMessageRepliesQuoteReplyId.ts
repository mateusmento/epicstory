import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replies quote other thread replies (message_replies.id), not channel messages.
 * Replaces quoted_message_id → messages with quoted_reply_id → message_replies.
 * Existing reply quote rows (FK to messages) are dropped; column data is not migrated.
 */
export class MigrationMessageRepliesQuoteReplyId1777070181671
  implements MigrationInterface
{
  name = 'MigrationMessageRepliesQuoteReplyId1777070181671';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "channel"."IDX_message_replies_quoted_message_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."message_replies" DROP CONSTRAINT IF EXISTS "FK_message_replies_quoted_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."message_replies" DROP COLUMN "quoted_message_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."message_replies" ADD "quoted_reply_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."message_replies" ADD CONSTRAINT "FK_message_replies_quoted_reply" FOREIGN KEY ("quoted_reply_id") REFERENCES "channel"."message_replies"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_message_replies_quoted_reply_id" ON "channel"."message_replies" ("quoted_reply_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "channel"."IDX_message_replies_quoted_reply_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."message_replies" DROP CONSTRAINT "FK_message_replies_quoted_reply"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."message_replies" DROP COLUMN "quoted_reply_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."message_replies" ADD "quoted_message_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."message_replies" ADD CONSTRAINT "FK_message_replies_quoted_message" FOREIGN KEY ("quoted_message_id") REFERENCES "channel"."messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_message_replies_quoted_message_id" ON "channel"."message_replies" ("quoted_message_id")`,
    );
  }
}

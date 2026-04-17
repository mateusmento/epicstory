import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddQuotedMessageId1776301196238
  implements MigrationInterface
{
  name = 'MigrationAddQuotedMessageId1776301196238';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      ADD COLUMN "quoted_message_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      ADD CONSTRAINT "FK_messages_quoted_message"
      FOREIGN KEY ("quoted_message_id") REFERENCES "channel"."messages"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_messages_quoted_message_id" ON "channel"."messages" ("quoted_message_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      ADD COLUMN "quoted_message_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."message_replies"
      ADD CONSTRAINT "FK_message_replies_quoted_message"
      FOREIGN KEY ("quoted_message_id") REFERENCES "channel"."messages"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_message_replies_quoted_message_id" ON "channel"."message_replies" ("quoted_message_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "channel"."IDX_message_replies_quoted_message_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."message_replies" DROP CONSTRAINT "FK_message_replies_quoted_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."message_replies" DROP COLUMN "quoted_message_id"`,
    );

    await queryRunner.query(
      `DROP INDEX "channel"."IDX_messages_quoted_message_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."messages" DROP CONSTRAINT "FK_messages_quoted_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."messages" DROP COLUMN "quoted_message_id"`,
    );
  }
}

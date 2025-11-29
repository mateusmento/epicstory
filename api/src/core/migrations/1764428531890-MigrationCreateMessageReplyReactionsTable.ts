import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationCreateMessageReplyReactionsTable1764428531890
  implements MigrationInterface
{
  name = 'MigrationCreateMessageReplyReactionsTable1764428531890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "channel"."message_reply_reactions" (
                "id" SERIAL NOT NULL,
                "emoji" character varying NOT NULL,
                "message_reply_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                CONSTRAINT "PK_message_reply_reactions" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_message_reply_reaction_user" UNIQUE ("message_reply_id", "emoji", "user_id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reply_reactions"
            ADD CONSTRAINT "FK_message_reply_reactions_reply" FOREIGN KEY ("message_reply_id") REFERENCES "channel"."message_replies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reply_reactions"
            ADD CONSTRAINT "FK_message_reply_reactions_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reply_reactions" DROP CONSTRAINT "FK_message_reply_reactions_user"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reply_reactions" DROP CONSTRAINT "FK_message_reply_reactions_reply"
        `);
    await queryRunner.query(`
            DROP TABLE "channel"."message_reply_reactions"
        `);
  }
}

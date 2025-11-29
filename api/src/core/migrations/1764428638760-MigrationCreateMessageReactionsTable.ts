import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationCreateMessageReactionsTable1764428638760
  implements MigrationInterface
{
  name = 'MigrationCreateMessageReactionsTable1764428638760';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "channel"."message_reactions" (
                "id" SERIAL NOT NULL,
                "emoji" character varying NOT NULL,
                "message_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                CONSTRAINT "PK_message_reactions" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_message_reaction_user" UNIQUE ("message_id", "emoji", "user_id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reactions"
            ADD CONSTRAINT "FK_message_reactions_message" FOREIGN KEY ("message_id") REFERENCES "channel"."messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reactions"
            ADD CONSTRAINT "FK_message_reactions_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reactions" DROP CONSTRAINT "FK_message_reactions_user"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reactions" DROP CONSTRAINT "FK_message_reactions_message"
        `);
    await queryRunner.query(`
            DROP TABLE "channel"."message_reactions"
        `);
  }
}

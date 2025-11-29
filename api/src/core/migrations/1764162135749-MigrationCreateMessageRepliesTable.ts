import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationCreateMessageRepliesTable1764162135749
  implements MigrationInterface
{
  name = 'MigrationCreateMessageRepliesTable1764162135749';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "channel"."message_replies" (
                "id" SERIAL NOT NULL,
                "content" character varying NOT NULL,
                "sent_at" TIMESTAMP NOT NULL DEFAULT now(),
                "sender_id" integer NOT NULL,
                "message_id" integer NOT NULL,
                CONSTRAINT "PK_6b6a26b5b288b9d77a7bea062c4" PRIMARY KEY ("id")
            )
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
    await queryRunner.query(`
            ALTER TABLE "channel"."message_replies"
            ADD CONSTRAINT "FK_0b4eef3917ea5eab7a2bc3e7a5e" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_replies"
            ADD CONSTRAINT "FK_6be8c1ed3936f924e8abd422dd4" FOREIGN KEY ("message_id") REFERENCES "channel"."messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "channel"."message_replies" DROP CONSTRAINT "FK_6be8c1ed3936f924e8abd422dd4"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_replies" DROP CONSTRAINT "FK_0b4eef3917ea5eab7a2bc3e7a5e"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2025-11-25 22:03:59.513649'
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2025-11-25 22:03:59.513649'
        `);
    await queryRunner.query(`
            DROP TABLE "channel"."message_replies"
        `);
  }
}

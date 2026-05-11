import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Channel message polls: vote rows + `messages.poll` jsonb.
 * (Single migration replacing separate votes-table + column migrations.)
 */
export class MigrationChannelMessagePolls1778527121326
  implements MigrationInterface
{
  name = 'MigrationChannelMessagePolls1778527121326';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "channel"."message_poll_votes" (
        "id" SERIAL NOT NULL,
        "message_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "option_id" character varying(64) NOT NULL,
        CONSTRAINT "PK_message_poll_votes" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."message_poll_votes"
      ADD CONSTRAINT "FK_message_poll_votes_message"
      FOREIGN KEY ("message_id") REFERENCES "channel"."messages"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."message_poll_votes"
      ADD CONSTRAINT "FK_message_poll_votes_user"
      FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_message_poll_vote_message_user"
      ON "channel"."message_poll_votes" ("message_id", "user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_message_poll_votes_message_id"
      ON "channel"."message_poll_votes" ("message_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      ADD COLUMN IF NOT EXISTS "poll" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."messages"
      DROP COLUMN IF EXISTS "poll"
    `);

    await queryRunner.query(
      `DROP INDEX "channel"."IDX_message_poll_votes_message_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "channel"."UQ_message_poll_vote_message_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."message_poll_votes" DROP CONSTRAINT "FK_message_poll_votes_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."message_poll_votes" DROP CONSTRAINT "FK_message_poll_votes_message"`,
    );
    await queryRunner.query(`DROP TABLE "channel"."message_poll_votes"`);
  }
}

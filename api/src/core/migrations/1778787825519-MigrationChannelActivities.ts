import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationChannelActivities1778787825519
  implements MigrationInterface
{
  name = 'MigrationChannelActivities1778787825519';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "channel"."channel_activities" (
        "id" SERIAL NOT NULL,
        "channel_id" integer NOT NULL,
        "type" character varying(32) NOT NULL,
        "actor_id" integer,
        "subject_user_id" integer,
        "message_id" integer,
        "meeting_id" integer,
        "payload" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_channel_activities" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."channel_activities"
      ADD CONSTRAINT "FK_channel_activities_channel"
      FOREIGN KEY ("channel_id") REFERENCES "channel"."channel"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."channel_activities"
      ADD CONSTRAINT "FK_channel_activities_actor"
      FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."channel_activities"
      ADD CONSTRAINT "FK_channel_activities_subject_user"
      FOREIGN KEY ("subject_user_id") REFERENCES "auth"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."channel_activities"
      ADD CONSTRAINT "FK_channel_activities_message"
      FOREIGN KEY ("message_id") REFERENCES "channel"."messages"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."channel_activities"
      ADD CONSTRAINT "FK_channel_activities_meeting"
      FOREIGN KEY ("meeting_id") REFERENCES "channel"."meetings"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_channel_activities_channel_created"
      ON "channel"."channel_activities" ("channel_id", "created_at")
    `);

    // Backfill timeline from existing messages (sender → actor, sent_at → created_at).
    await queryRunner.query(`
      INSERT INTO "channel"."channel_activities" (
        "channel_id",
        "type",
        "actor_id",
        "subject_user_id",
        "message_id",
        "meeting_id",
        "payload",
        "created_at"
      )
      SELECT
        msg."channel_id",
        'message_sent',
        msg."sender_id",
        NULL,
        msg."id",
        NULL,
        NULL,
        msg."sent_at"
      FROM "channel"."messages" msg
    `);

    // Backfill channel meetings (one activity per meeting start; actor unknown for legacy rows).
    await queryRunner.query(`
      INSERT INTO "channel"."channel_activities" (
        "channel_id",
        "type",
        "actor_id",
        "subject_user_id",
        "message_id",
        "meeting_id",
        "payload",
        "created_at"
      )
      SELECT
        m."channel_id",
        'meeting_started',
        NULL,
        NULL,
        NULL,
        m."id",
        NULL,
        m."started_at"
      FROM "channel"."meetings" m
      WHERE m."channel_id" IS NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        seq text;
        mx bigint;
      BEGIN
        seq := pg_get_serial_sequence('"channel"."channel_activities"', 'id');
        SELECT COALESCE(MAX("id"), 0) INTO mx FROM "channel"."channel_activities";
        IF mx > 0 THEN
          PERFORM setval(seq, mx, true);
        END IF;
      END$$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "channel"."IDX_channel_activities_channel_created"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."channel_activities" DROP CONSTRAINT "FK_channel_activities_meeting"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."channel_activities" DROP CONSTRAINT "FK_channel_activities_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."channel_activities" DROP CONSTRAINT "FK_channel_activities_subject_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."channel_activities" DROP CONSTRAINT "FK_channel_activities_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "channel"."channel_activities" DROP CONSTRAINT "FK_channel_activities_channel"`,
    );
    await queryRunner.query(`DROP TABLE "channel"."channel_activities"`);
  }
}

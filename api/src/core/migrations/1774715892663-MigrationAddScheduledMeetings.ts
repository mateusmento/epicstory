import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddScheduledMeetings1774715892663
  implements MigrationInterface
{
  name = 'MigrationAddScheduledMeetings1774715892663';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure UUID functions exist.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Scheduled meeting series
    await queryRunner.query(`
      CREATE TABLE "channel"."scheduled_meetings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" integer NOT NULL,
        "channel_id" integer,
        "created_by_id" integer NOT NULL,
        "title" character varying NOT NULL DEFAULT '',
        "description" character varying NOT NULL DEFAULT '',
        "is_public" boolean NOT NULL DEFAULT true,
        "notify_minutes_before" integer NOT NULL DEFAULT 1,
        "recurrence" jsonb NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_channel_scheduled_meetings_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_channel_scheduled_meetings_workspace_id"
      ON "channel"."scheduled_meetings" ("workspace_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_channel_scheduled_meetings_channel_id"
      ON "channel"."scheduled_meetings" ("channel_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meetings"
      ADD CONSTRAINT "FK_channel_scheduled_meetings_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meetings"
      ADD CONSTRAINT "FK_channel_scheduled_meetings_channel"
      FOREIGN KEY ("channel_id") REFERENCES "channel"."channel"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meetings"
      ADD CONSTRAINT "FK_channel_scheduled_meetings_created_by"
      FOREIGN KEY ("created_by_id") REFERENCES "auth"."users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // Participants join table
    await queryRunner.query(`
      CREATE TABLE "channel"."scheduled_meeting_participants" (
        "scheduled_meeting_id" uuid NOT NULL,
        "user_id" integer NOT NULL,
        CONSTRAINT "PK_channel_scheduled_meeting_participants"
          PRIMARY KEY ("scheduled_meeting_id", "user_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_channel_scheduled_meeting_participants_meeting_id"
      ON "channel"."scheduled_meeting_participants" ("scheduled_meeting_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_channel_scheduled_meeting_participants_user_id"
      ON "channel"."scheduled_meeting_participants" ("user_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meeting_participants"
      ADD CONSTRAINT "FK_channel_scheduled_meeting_participants_meeting"
      FOREIGN KEY ("scheduled_meeting_id") REFERENCES "channel"."scheduled_meetings"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meeting_participants"
      ADD CONSTRAINT "FK_channel_scheduled_meeting_participants_user"
      FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Occurrences
    await queryRunner.query(`
      CREATE TABLE "channel"."scheduled_meeting_occurrences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "scheduled_meeting_id" uuid NOT NULL,
        "starts_at" TIMESTAMPTZ NOT NULL,
        "ends_at" TIMESTAMPTZ NOT NULL,
        "meeting_id" integer,
        CONSTRAINT "PK_channel_scheduled_meeting_occurrences_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_channel_scheduled_meeting_occurrences_meeting_start"
          UNIQUE ("scheduled_meeting_id", "starts_at")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_channel_scheduled_meeting_occurrences_meeting_id"
      ON "channel"."scheduled_meeting_occurrences" ("scheduled_meeting_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_channel_scheduled_meeting_occurrences_starts_at"
      ON "channel"."scheduled_meeting_occurrences" ("starts_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meeting_occurrences"
      ADD CONSTRAINT "FK_channel_scheduled_meeting_occurrences_meeting"
      FOREIGN KEY ("scheduled_meeting_id") REFERENCES "channel"."scheduled_meetings"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meeting_occurrences"
      ADD CONSTRAINT "FK_channel_scheduled_meeting_occurrences_session"
      FOREIGN KEY ("meeting_id") REFERENCES "channel"."meetings"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Extend existing meetings table to support standalone sessions + occurrence linkage.
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD "workspace_id" integer
    `);
    await queryRunner.query(`
      UPDATE "channel"."meetings" m
      SET "workspace_id" = c."workspace_id"
      FROM "channel"."channel" c
      WHERE m."channel_id" = c."id"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ALTER COLUMN "workspace_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD CONSTRAINT "FK_channel_meetings_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ALTER COLUMN "channel_id" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD "scheduled_occurrence_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD CONSTRAINT "UQ_channel_meetings_scheduled_occurrence_id"
      UNIQUE ("scheduled_occurrence_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD CONSTRAINT "FK_channel_meetings_scheduled_occurrence"
      FOREIGN KEY ("scheduled_occurrence_id")
      REFERENCES "channel"."scheduled_meeting_occurrences"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD "starts_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings" DROP COLUMN "starts_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings" DROP CONSTRAINT "FK_channel_meetings_scheduled_occurrence"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings" DROP CONSTRAINT "UQ_channel_meetings_scheduled_occurrence_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings" DROP COLUMN "scheduled_occurrence_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings" ALTER COLUMN "channel_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings" DROP CONSTRAINT "FK_channel_meetings_workspace"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings" DROP COLUMN "workspace_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meeting_occurrences"
      DROP CONSTRAINT "FK_channel_scheduled_meeting_occurrences_session"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meeting_occurrences"
      DROP CONSTRAINT "FK_channel_scheduled_meeting_occurrences_meeting"
    `);
    await queryRunner.query(`
      DROP INDEX "channel"."IDX_channel_scheduled_meeting_occurrences_starts_at"
    `);
    await queryRunner.query(`
      DROP INDEX "channel"."IDX_channel_scheduled_meeting_occurrences_meeting_id"
    `);
    await queryRunner.query(`
      DROP TABLE "channel"."scheduled_meeting_occurrences"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meeting_participants"
      DROP CONSTRAINT "FK_channel_scheduled_meeting_participants_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meeting_participants"
      DROP CONSTRAINT "FK_channel_scheduled_meeting_participants_meeting"
    `);
    await queryRunner.query(`
      DROP INDEX "channel"."IDX_channel_scheduled_meeting_participants_user_id"
    `);
    await queryRunner.query(`
      DROP INDEX "channel"."IDX_channel_scheduled_meeting_participants_meeting_id"
    `);
    await queryRunner.query(`
      DROP TABLE "channel"."scheduled_meeting_participants"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meetings"
      DROP CONSTRAINT "FK_channel_scheduled_meetings_created_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meetings"
      DROP CONSTRAINT "FK_channel_scheduled_meetings_channel"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."scheduled_meetings"
      DROP CONSTRAINT "FK_channel_scheduled_meetings_workspace"
    `);
    await queryRunner.query(`
      DROP INDEX "channel"."IDX_channel_scheduled_meetings_channel_id"
    `);
    await queryRunner.query(`
      DROP INDEX "channel"."IDX_channel_scheduled_meetings_workspace_id"
    `);
    await queryRunner.query(`
      DROP TABLE "channel"."scheduled_meetings"
    `);
  }
}

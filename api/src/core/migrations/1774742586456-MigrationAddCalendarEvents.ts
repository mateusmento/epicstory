import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddCalendarEvents1774742586456
  implements MigrationInterface
{
  name = 'MigrationAddCalendarEvents1774742586456';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "calendar";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "calendar"."calendar_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" integer NOT NULL,
        "created_by_id" integer NOT NULL,
        "channel_id" integer,
        "starts_at" TIMESTAMPTZ NOT NULL,
        "ends_at" TIMESTAMPTZ NOT NULL,
        "title" character varying NOT NULL DEFAULT '',
        "description" character varying NOT NULL DEFAULT '',
        "is_public" boolean NOT NULL DEFAULT true,
        "notify_minutes_before" integer NOT NULL DEFAULT 1,
        "recurrence" jsonb NOT NULL,
        "payload" jsonb NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calendar_calendar_events_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_calendar_calendar_events_workspace_id"
      ON "calendar"."calendar_events" ("workspace_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_calendar_calendar_events_starts_at"
      ON "calendar"."calendar_events" ("starts_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_calendar_calendar_events_channel_id"
      ON "calendar"."calendar_events" ("channel_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "calendar"."calendar_event_participants" (
        "calendar_event_id" uuid NOT NULL,
        "user_id" integer NOT NULL,
        CONSTRAINT "PK_calendar_event_participants"
          PRIMARY KEY ("calendar_event_id", "user_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_calendar_event_participants_event_id"
      ON "calendar"."calendar_event_participants" ("calendar_event_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_calendar_event_participants_user_id"
      ON "calendar"."calendar_event_participants" ("user_id")
    `);

    // FK constraints (idempotent via pg_constraint checks)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_calendar_calendar_events_workspace'
        ) THEN
          ALTER TABLE "calendar"."calendar_events"
          ADD CONSTRAINT "FK_calendar_calendar_events_workspace"
          FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_calendar_calendar_events_created_by'
        ) THEN
          ALTER TABLE "calendar"."calendar_events"
          ADD CONSTRAINT "FK_calendar_calendar_events_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "auth"."users"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_calendar_calendar_events_channel'
        ) THEN
          ALTER TABLE "calendar"."calendar_events"
          ADD CONSTRAINT "FK_calendar_calendar_events_channel"
          FOREIGN KEY ("channel_id") REFERENCES "channel"."channel"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_calendar_event_participants_event'
        ) THEN
          ALTER TABLE "calendar"."calendar_event_participants"
          ADD CONSTRAINT "FK_calendar_event_participants_event"
          FOREIGN KEY ("calendar_event_id") REFERENCES "calendar"."calendar_events"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_calendar_event_participants_user'
        ) THEN
          ALTER TABLE "calendar"."calendar_event_participants"
          ADD CONSTRAINT "FK_calendar_event_participants_user"
          FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort down
    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_event_participants"
      DROP CONSTRAINT IF EXISTS "FK_calendar_event_participants_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_event_participants"
      DROP CONSTRAINT IF EXISTS "FK_calendar_event_participants_event"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "calendar"."calendar_event_participants"
    `);

    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events"
      DROP CONSTRAINT IF EXISTS "FK_calendar_calendar_events_channel"
    `);
    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events"
      DROP CONSTRAINT IF EXISTS "FK_calendar_calendar_events_created_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "calendar"."calendar_events"
      DROP CONSTRAINT IF EXISTS "FK_calendar_calendar_events_workspace"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "calendar"."calendar_events"
    `);
  }
}

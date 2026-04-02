import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationSquashCalendarScheduling1774996376040
  implements MigrationInterface
{
  name = 'MigrationSquashCalendarScheduling1774996376040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // UUIDs are used across calendar/scheduling.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // New schemas introduced after 1773710122982.
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "calendar";`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "scheduling";`);

    // ---- scheduling.scheduled_jobs (final shape) ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scheduling"."scheduled_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying,
        "workspace_id" integer NOT NULL,
        "payload" jsonb NOT NULL,
        "due_at" TIMESTAMPTZ NOT NULL,
        "notify_minutes_before" integer NOT NULL DEFAULT 1,
        "recurrence" jsonb NOT NULL,
        "processed" boolean NOT NULL DEFAULT false,
        "lock_id" uuid,
        "locked_at" TIMESTAMPTZ,
        "retry_count" integer NOT NULL DEFAULT 0,
        "last_error" text,
        "last_retry_at" TIMESTAMPTZ,
        "last_run_at" TIMESTAMPTZ,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scheduling_scheduled_jobs_id" PRIMARY KEY ("id")
      )
    `);

    // If the table existed from partial runs, ensure the newer column exists.
    await queryRunner.query(`
      ALTER TABLE "scheduling"."scheduled_jobs"
      ADD COLUMN IF NOT EXISTS "last_run_at" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scheduling_scheduled_jobs_due_at"
      ON "scheduling"."scheduled_jobs" ("due_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scheduling_scheduled_jobs_workspace_id"
      ON "scheduling"."scheduled_jobs" ("workspace_id")
    `);

    // ---- calendar.calendar_events (final shape) ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "calendar"."calendar_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspace_id" integer NOT NULL,
        "created_by_id" integer NOT NULL,
        "starts_at" TIMESTAMPTZ NOT NULL,
        "ends_at" TIMESTAMPTZ NOT NULL,
        "title" character varying NOT NULL DEFAULT '',
        "description" character varying NOT NULL DEFAULT '',
        "is_public" boolean NOT NULL DEFAULT true,
        "notify_minutes_before" integer NOT NULL DEFAULT 1,
        "recurrence" jsonb NOT NULL,
        "payload" jsonb NOT NULL,
        "type" character varying NOT NULL DEFAULT 'event',
        "notify_enabled" boolean NOT NULL DEFAULT true,
        "scheduled_job_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_calendar_calendar_events_id" PRIMARY KEY ("id")
      )
    `);

    // If a legacy column exists (from older intermediate migrations), migrate it into payload and drop.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'calendar'
            AND table_name = 'calendar_events'
            AND column_name = 'channel_id'
        ) THEN
          UPDATE "calendar"."calendar_events" ev
          SET payload = jsonb_set(
            COALESCE(ev.payload, '{}'::jsonb),
            '{channelId}',
            to_jsonb(ev.channel_id),
            true
          )
          WHERE ev.channel_id IS NOT NULL;

          ALTER TABLE "calendar"."calendar_events"
          DROP COLUMN IF EXISTS "channel_id";
        END IF;
      END$$;
    `);

    // Ensure payload.channelId exists for all rows (null when not tied to a channel).
    await queryRunner.query(`
      UPDATE "calendar"."calendar_events" ev
      SET payload = jsonb_set(
        COALESCE(ev.payload, '{}'::jsonb),
        '{channelId}',
        'null'::jsonb,
        true
      )
      WHERE NOT (COALESCE(ev.payload, '{}'::jsonb) ? 'channelId')
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
      CREATE INDEX IF NOT EXISTS "IDX_calendar_calendar_events_scheduled_job_id"
      ON "calendar"."calendar_events" ("scheduled_job_id")
    `);

    // FKs (idempotent via pg_constraint checks)
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

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_calendar_calendar_events_created_by'
        ) THEN
          ALTER TABLE "calendar"."calendar_events"
          ADD CONSTRAINT "FK_calendar_calendar_events_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "auth"."users"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_calendar_calendar_events_scheduled_job_id'
        ) THEN
          ALTER TABLE "calendar"."calendar_events"
          ADD CONSTRAINT "FK_calendar_calendar_events_scheduled_job_id"
          FOREIGN KEY ("scheduled_job_id") REFERENCES "scheduling"."scheduled_jobs"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);

    // ---- calendar.calendar_event_participants ----
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

    // ---- channel.meetings (final shape) ----
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "channel";`);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "workspace_id" integer
    `);

    // Calendar occurrence identity columns (added early so backfills below can reference them safely).
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "calendar_event_id" uuid
    `);

    // Rename legacy column if it exists (older DBs) -> new final name.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'channel'
            AND table_name = 'meetings'
            AND column_name = 'occurrence_starts_at'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'channel'
            AND table_name = 'meetings'
            AND column_name = 'occurrence_at'
        ) THEN
          ALTER TABLE "channel"."meetings"
          RENAME COLUMN "occurrence_starts_at" TO "occurrence_at";
        END IF;
      END$$;
    `);

    // Backfill workspace_id from channel.workspace_id (labels baseline has channel_id NOT NULL).
    await queryRunner.query(`
      UPDATE "channel"."meetings" m
      SET "workspace_id" = c."workspace_id"
      FROM "channel"."channel" c
      WHERE
        m."workspace_id" IS NULL
        AND m."channel_id" IS NOT NULL
        AND m."channel_id" = c."id"
    `);

    // If the meeting is calendar-backed, try backfilling from calendar_event.workspace_id as well.
    await queryRunner.query(`
      UPDATE "channel"."meetings" m
      SET "workspace_id" = ev."workspace_id"
      FROM "calendar"."calendar_events" ev
      WHERE
        m."workspace_id" IS NULL
        AND m."calendar_event_id" IS NOT NULL
        AND m."calendar_event_id" = ev."id"
    `);

    // Enforce NOT NULL once data is consistent; otherwise stop with a helpful error.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "channel"."meetings" WHERE "workspace_id" IS NULL
        ) THEN
          RAISE EXCEPTION 'Cannot set channel.meetings.workspace_id NOT NULL: some rows could not be backfilled. Please backfill workspace_id for meetings with NULL workspace_id before re-running.';
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ALTER COLUMN "workspace_id" SET NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_channel_meetings_workspace'
        ) THEN
          ALTER TABLE "channel"."meetings"
          ADD CONSTRAINT "FK_channel_meetings_workspace"
          FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ALTER COLUMN "channel_id" DROP NOT NULL
    `);

    // Remove any legacy scheduled-occurrence linkage (introduced and later removed in the old chain).
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP CONSTRAINT IF EXISTS "FK_channel_meetings_scheduled_occurrence"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP CONSTRAINT IF EXISTS "UQ_channel_meetings_scheduled_occurrence_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP COLUMN IF EXISTS "scheduled_occurrence_id"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'channel'
            AND table_name = 'meetings'
            AND column_name = 'starts_at'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'channel'
            AND table_name = 'meetings'
            AND column_name = 'started_at'
        ) THEN
          ALTER TABLE "channel"."meetings"
          RENAME COLUMN "starts_at" TO "started_at";
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "occurrence_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "ended_at" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "scheduled_starts_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "scheduled_ends_at" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // Backfill timestamps defensively (in case of older rows).
    await queryRunner.query(`
      UPDATE "channel"."meetings"
      SET created_at = COALESCE(created_at, now())
    `);
    await queryRunner.query(`
      UPDATE "channel"."meetings"
      SET updated_at = COALESCE(updated_at, created_at, now())
    `);

    // Unique per calendar-series occurrence.
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP CONSTRAINT IF EXISTS "UQ_channel_meetings_calendar_occurrence"
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_channel_meetings_calendar_occurrence'
        ) THEN
          ALTER TABLE "channel"."meetings"
          ADD CONSTRAINT "UQ_channel_meetings_calendar_occurrence"
          UNIQUE ("calendar_event_id", "occurrence_at");
        END IF;
      END$$;
    `);

    // Allow multiple meetings per channel (drop the legacy OneToOne uniqueness if present).
    await queryRunner.query(
      `ALTER TABLE "channel"."meetings" DROP CONSTRAINT IF EXISTS "REL_e6bd0ae7682ea6085e62ab7830"`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_channel_meetings_channel_id" ON "channel"."meetings" ("channel_id")`,
    );

    // ---- scheduler.notifications updated_at ----
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('scheduler.notifications') IS NULL THEN
          RETURN;
        END IF;

        ALTER TABLE "scheduler"."notifications"
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now();

        UPDATE "scheduler"."notifications"
        SET updated_at = COALESCE(updated_at, created_at, now());
      END
      $$;
    `);

    // ---- Drop legacy tables replaced by calendar/scheduling (final state) ----
    await queryRunner.query(`
      DROP TABLE IF EXISTS "channel"."scheduled_meeting_occurrences" CASCADE
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "channel"."scheduled_meeting_participants" CASCADE
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "channel"."scheduled_meetings" CASCADE
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "scheduler"."scheduled_events" CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort rollback. We intentionally do not recreate dropped legacy tables.
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
      DROP CONSTRAINT IF EXISTS "FK_calendar_calendar_events_scheduled_job_id"
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

    await queryRunner.query(`
      DROP TABLE IF EXISTS "scheduling"."scheduled_jobs"
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP CONSTRAINT IF EXISTS "UQ_channel_meetings_calendar_occurrence"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "channel"."IDX_channel_meetings_channel_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP COLUMN IF EXISTS "updated_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP COLUMN IF EXISTS "created_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP COLUMN IF EXISTS "ended_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP COLUMN IF EXISTS "scheduled_ends_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP COLUMN IF EXISTS "scheduled_starts_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP COLUMN IF EXISTS "occurrence_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP COLUMN IF EXISTS "calendar_event_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP COLUMN IF EXISTS "started_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP CONSTRAINT IF EXISTS "FK_channel_meetings_workspace"
    `);
    await queryRunner.query(`
      ALTER TABLE "channel"."meetings"
      DROP COLUMN IF EXISTS "workspace_id"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddSchedulingJobs1774749188359
  implements MigrationInterface
{
  name = 'MigrationAddSchedulingJobs1774749188359';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "scheduling";`);

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
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scheduling_scheduled_jobs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scheduling_scheduled_jobs_due_at"
      ON "scheduling"."scheduled_jobs" ("due_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scheduling_scheduled_jobs_workspace_id"
      ON "scheduling"."scheduled_jobs" ("workspace_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "scheduling"."scheduled_jobs"
    `);
  }
}

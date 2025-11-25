import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddScheduledEvents1763988442556
  implements MigrationInterface
{
  name = 'MigrationAddScheduledEvents1763988442556';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SCHEMA IF NOT EXISTS "scheduler";
    `);

    await queryRunner.query(`
      CREATE TABLE "scheduler"."scheduled_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" integer NOT NULL,
        "payload" jsonb NOT NULL,
        "due_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "processed" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_5ab29293642d5d17f11fda15c90" PRIMARY KEY ("id")
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
      CREATE INDEX "idx_scheduled_events_due_at"
      ON "scheduler"."scheduled_events" (due_at)
      WHERE "processed" = false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "workspace"."workspace_member"
      ALTER COLUMN "joined_at"
      SET DEFAULT '2025-11-24 12:46:48.513135'
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."team_member"
      ALTER COLUMN "joined_at"
      SET DEFAULT '2025-11-24 12:46:48.513135'
    `);
    await queryRunner.query(`
      DROP INDEX "scheduler"."idx_scheduled_events_due_at";
    `);
    await queryRunner.query(`
      DROP TABLE "scheduler"."scheduled_events"
    `);
  }
}

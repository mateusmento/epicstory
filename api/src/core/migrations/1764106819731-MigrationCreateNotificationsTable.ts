import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrationCreateNotificationsTable1764106819731 implements MigrationInterface {
    name = 'MigrationCreateNotificationsTable1764106819731'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "scheduler"."idx_scheduled_events_due_at"
        `);
        await queryRunner.query(`
            CREATE TABLE "scheduler"."notifications" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "type" character varying NOT NULL,
                "user_id" integer NOT NULL,
                "payload" jsonb NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "seen" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id")
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2025-11-24 22:36:02.214554'
        `);
        await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2025-11-24 22:36:02.214554'
        `);
        await queryRunner.query(`
            DROP TABLE "scheduler"."notifications"
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_scheduled_events_due_at" ON "scheduler"."scheduled_events" ("due_at")
            WHERE (processed = false)
        `);
    }

}

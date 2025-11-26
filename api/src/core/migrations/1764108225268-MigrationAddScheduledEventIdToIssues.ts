import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrationAddScheduledEventIdToIssues1764108225268 implements MigrationInterface {
    name = 'MigrationAddScheduledEventIdToIssues1764108225268'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "workspace"."issue"
            ADD "scheduled_event_id" uuid
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
            SET DEFAULT '2025-11-25 21:40:30.633684'
        `);
        await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2025-11-25 21:40:30.633684'
        `);
        await queryRunner.query(`
            ALTER TABLE "workspace"."issue" DROP COLUMN "scheduled_event_id"
        `);
    }

}

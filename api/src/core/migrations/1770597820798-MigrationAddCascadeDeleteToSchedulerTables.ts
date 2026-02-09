import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddCascadeDeleteToSchedulerTables1770597820798
  implements MigrationInterface
{
  name = 'MigrationAddCascadeDeleteToSchedulerTables1770597820798';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        delete from "scheduler"."scheduled_events"
    `);

    await queryRunner.query(`
      delete from "scheduler"."notifications"
    `);

    await queryRunner.query(`
            ALTER TABLE "scheduler"."scheduled_events"
            ADD "workspace_id" integer NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "scheduler"."notifications"
            ADD "workspace_id" integer NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT 'now()'
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT 'now()'
        `);
    await queryRunner.query(`
            ALTER TABLE "scheduler"."scheduled_events"
            ADD CONSTRAINT "FK_4fe443c683dbe8b2fd8215f016b" FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "scheduler"."notifications"
            ADD CONSTRAINT "FK_ff8a9bf1b558104a843964c01ec" FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "scheduler"."notifications" DROP CONSTRAINT "FK_ff8a9bf1b558104a843964c01ec"
        `);
    await queryRunner.query(`
            ALTER TABLE "scheduler"."scheduled_events" DROP CONSTRAINT "FK_4fe443c683dbe8b2fd8215f016b"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2026-02-09 00:36:44.541472'
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2026-02-09 00:36:44.541472'
        `);
    await queryRunner.query(`
            ALTER TABLE "scheduler"."notifications" DROP COLUMN "workspace_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "scheduler"."scheduled_events" DROP COLUMN "workspace_id"
        `);
  }
}

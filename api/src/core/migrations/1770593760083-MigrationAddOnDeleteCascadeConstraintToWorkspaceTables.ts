import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddOnDeleteCascadeConstraintToWorkspaceTables1770593760083
  implements MigrationInterface
{
  name = 'MigrationAddOnDeleteCascadeConstraintToWorkspaceTables1770593760083';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT IF EXISTS "FK_79919f05a57b19d5092f1685a61"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT IF EXISTS "FK_8433a3e8b34032bbe9a5a5043a0"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT IF EXISTS "FK_90b05eb9ab85cc6409612b21fc7"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog" DROP CONSTRAINT IF EXISTS "FK_b63a18f7feab59fbeb110e9c8b4"
        `);
    // await queryRunner.query(`
    //         ALTER TABLE "workspace"."workspace_project" DROP CONSTRAINT IF EXISTS "FK_56ea9a1d5e559808fab93b15b50"
    //     `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member" DROP CONSTRAINT IF EXISTS "FK_a1b5b4f5fa1b7f890d0a278748b"
        `);

    // If these constraints already exist (manual DB changes, partial migrations, etc),
    // drop them so the ADD CONSTRAINT steps below are deterministic.
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_project" DROP CONSTRAINT IF EXISTS "FK_1beff8efd017275a501474f2d33"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue" DROP CONSTRAINT IF EXISTS "FK_bf4bb11daec2e5242c5310504a8"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue" DROP CONSTRAINT IF EXISTS "FK_c5c1ee47a932087585aab345d4c"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue" DROP CONSTRAINT IF EXISTS "FK_87dc164f246973f7e124962a592"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_member" DROP CONSTRAINT IF EXISTS "FK_73d466cb93234025fe379fa5873"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team" DROP CONSTRAINT IF EXISTS "FK_5e6b6afb22e99e752975a85505c"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace_member_invite" DROP CONSTRAINT IF EXISTS "FK_f1db16cd12d74f9468e2f1fd951"
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
            ALTER TABLE "workspace"."backlog_item"
            ADD CONSTRAINT "FK_8433a3e8b34032bbe9a5a5043a0" FOREIGN KEY ("backlog_id") REFERENCES "workspace"."backlog"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item"
            ADD CONSTRAINT "FK_90b05eb9ab85cc6409612b21fc7" FOREIGN KEY ("project_id") REFERENCES "workspace"."workspace_project"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item"
            ADD CONSTRAINT "FK_79919f05a57b19d5092f1685a61" FOREIGN KEY ("issue_id") REFERENCES "workspace"."issue"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog"
            ADD CONSTRAINT "FK_b63a18f7feab59fbeb110e9c8b4" FOREIGN KEY ("project_id") REFERENCES "workspace"."workspace_project"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_project"
            ADD CONSTRAINT "FK_1beff8efd017275a501474f2d33" FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    // await queryRunner.query(`
    //         ALTER TABLE "workspace"."workspace_project"
    //         ADD CONSTRAINT "FK_56ea9a1d5e559808fab93b15b50" FOREIGN KEY ("backlog_id") REFERENCES "workspace"."backlog"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    //     `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue"
            ADD CONSTRAINT "FK_bf4bb11daec2e5242c5310504a8" FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue"
            ADD CONSTRAINT "FK_c5c1ee47a932087585aab345d4c" FOREIGN KEY ("project_id") REFERENCES "workspace"."workspace_project"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue"
            ADD CONSTRAINT "FK_87dc164f246973f7e124962a592" FOREIGN KEY ("created_by_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_member"
            ADD CONSTRAINT "FK_73d466cb93234025fe379fa5873" FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team"
            ADD CONSTRAINT "FK_5e6b6afb22e99e752975a85505c" FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ADD CONSTRAINT "FK_a1b5b4f5fa1b7f890d0a278748b" FOREIGN KEY ("team_id") REFERENCES "workspace"."team"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace_member_invite"
            ADD CONSTRAINT "FK_f1db16cd12d74f9468e2f1fd951" FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "workspace_member_invite" DROP CONSTRAINT "FK_f1db16cd12d74f9468e2f1fd951"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member" DROP CONSTRAINT "FK_a1b5b4f5fa1b7f890d0a278748b"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team" DROP CONSTRAINT "FK_5e6b6afb22e99e752975a85505c"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_member" DROP CONSTRAINT "FK_73d466cb93234025fe379fa5873"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue" DROP CONSTRAINT "FK_87dc164f246973f7e124962a592"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue" DROP CONSTRAINT "FK_c5c1ee47a932087585aab345d4c"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue" DROP CONSTRAINT "FK_bf4bb11daec2e5242c5310504a8"
        `);
    // await queryRunner.query(`
    //         ALTER TABLE "workspace"."workspace_project" DROP CONSTRAINT "FK_56ea9a1d5e559808fab93b15b50"
    //     `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_project" DROP CONSTRAINT "FK_1beff8efd017275a501474f2d33"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog" DROP CONSTRAINT "FK_b63a18f7feab59fbeb110e9c8b4"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT "FK_79919f05a57b19d5092f1685a61"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT "FK_90b05eb9ab85cc6409612b21fc7"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT "FK_8433a3e8b34032bbe9a5a5043a0"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2026-01-25 21:11:59.061411'
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2026-01-25 21:11:59.061411'
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ADD CONSTRAINT "FK_a1b5b4f5fa1b7f890d0a278748b" FOREIGN KEY ("team_id") REFERENCES "workspace"."team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    // await queryRunner.query(`
    //         ALTER TABLE "workspace"."workspace_project"
    //         ADD CONSTRAINT "FK_56ea9a1d5e559808fab93b15b50" FOREIGN KEY ("backlog_id") REFERENCES "workspace"."backlog"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    //     `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog"
            ADD CONSTRAINT "FK_b63a18f7feab59fbeb110e9c8b4" FOREIGN KEY ("project_id") REFERENCES "workspace"."workspace_project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item"
            ADD CONSTRAINT "FK_90b05eb9ab85cc6409612b21fc7" FOREIGN KEY ("project_id") REFERENCES "workspace"."workspace_project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item"
            ADD CONSTRAINT "FK_8433a3e8b34032bbe9a5a5043a0" FOREIGN KEY ("backlog_id") REFERENCES "workspace"."backlog"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item"
            ADD CONSTRAINT "FK_79919f05a57b19d5092f1685a61" FOREIGN KEY ("issue_id") REFERENCES "workspace"."issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }
}

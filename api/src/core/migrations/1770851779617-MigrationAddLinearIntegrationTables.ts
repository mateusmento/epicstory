import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddLinearIntegrationTables1770851779617
  implements MigrationInterface
{
  name = 'MigrationAddLinearIntegrationTables1770851779617';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure UUID functions exist (scheduler tables also rely on uuid_generate_v4()).
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS integration;`);

    await queryRunner.query(`
      CREATE TABLE "integration"."linear_connections" (
        "id" SERIAL NOT NULL,

        "workspace_id" integer,
        "user_id" integer,

        "created_by_user_id" integer NOT NULL,

        "linear_org_id" character varying NOT NULL,
        "linear_org_name" character varying NOT NULL,

        "access_token_encrypted" text NOT NULL,
        "refresh_token_encrypted" text,
        "token_expires_at" TIMESTAMP WITH TIME ZONE,

        "status" character varying NOT NULL DEFAULT 'active',
        "revoked_at" TIMESTAMP WITH TIME ZONE,

        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        CONSTRAINT "PK_integration_linear_connections" PRIMARY KEY ("id"),
        CONSTRAINT "CK_integration_linear_connections_scope"
          CHECK (
            (workspace_id IS NOT NULL AND user_id IS NULL)
            OR (workspace_id IS NULL AND user_id IS NOT NULL)
          )
      );
    `);

    // Connection uniqueness per scope (partial unique indexes).
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_linear_connections_workspace_org"
      ON "integration"."linear_connections" ("workspace_id", "linear_org_id")
      WHERE "workspace_id" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_linear_connections_user_org"
      ON "integration"."linear_connections" ("user_id", "linear_org_id")
      WHERE "user_id" IS NOT NULL;
    `);

    // Foreign keys
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_connections"
      ADD CONSTRAINT "FK_linear_connections_workspace"
        FOREIGN KEY ("workspace_id")
        REFERENCES "workspace"."workspace"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_connections"
      ADD CONSTRAINT "FK_linear_connections_user"
        FOREIGN KEY ("user_id")
        REFERENCES "auth"."users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_connections"
      ADD CONSTRAINT "FK_linear_connections_created_by"
        FOREIGN KEY ("created_by_user_id")
        REFERENCES "auth"."users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    `);

    // --- Mapping tables (idempotency) ---
    await queryRunner.query(`
      CREATE TABLE "integration"."linear_team_map" (
        "id" SERIAL NOT NULL,
        "linear_connection_id" integer NOT NULL,
        "linear_team_id" character varying NOT NULL,
        "epic_team_id" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_linear_team_map" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_linear_team_map_connection_team"
      ON "integration"."linear_team_map" ("linear_connection_id", "linear_team_id");
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_team_map"
      ADD CONSTRAINT "FK_linear_team_map_connection"
        FOREIGN KEY ("linear_connection_id")
        REFERENCES "integration"."linear_connections"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_team_map"
      ADD CONSTRAINT "FK_linear_team_map_epic_team"
        FOREIGN KEY ("epic_team_id")
        REFERENCES "workspace"."team"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      CREATE TABLE "integration"."linear_project_map" (
        "id" SERIAL NOT NULL,
        "linear_connection_id" integer NOT NULL,
        "linear_project_id" character varying NOT NULL,
        "epic_project_id" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_linear_project_map" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_linear_project_map_connection_project"
      ON "integration"."linear_project_map" ("linear_connection_id", "linear_project_id");
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_project_map"
      ADD CONSTRAINT "FK_linear_project_map_connection"
        FOREIGN KEY ("linear_connection_id")
        REFERENCES "integration"."linear_connections"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_project_map"
      ADD CONSTRAINT "FK_linear_project_map_epic_project"
        FOREIGN KEY ("epic_project_id")
        REFERENCES "workspace"."workspace_project"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      CREATE TABLE "integration"."linear_user_map" (
        "id" SERIAL NOT NULL,
        "linear_connection_id" integer NOT NULL,
        "linear_user_id" character varying NOT NULL,
        "epic_user_id" integer,
        "email_snapshot" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_linear_user_map" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_linear_user_map_connection_user"
      ON "integration"."linear_user_map" ("linear_connection_id", "linear_user_id");
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_user_map"
      ADD CONSTRAINT "FK_linear_user_map_connection"
        FOREIGN KEY ("linear_connection_id")
        REFERENCES "integration"."linear_connections"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_user_map"
      ADD CONSTRAINT "FK_linear_user_map_epic_user"
        FOREIGN KEY ("epic_user_id")
        REFERENCES "auth"."users"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      CREATE TABLE "integration"."linear_issue_map" (
        "id" SERIAL NOT NULL,
        "linear_connection_id" integer NOT NULL,
        "linear_issue_id" character varying NOT NULL,
        "epic_issue_id" integer NOT NULL,
        "epic_backlog_item_id" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_linear_issue_map" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_linear_issue_map_connection_issue"
      ON "integration"."linear_issue_map" ("linear_connection_id", "linear_issue_id");
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_linear_issue_map_epic_issue"
      ON "integration"."linear_issue_map" ("epic_issue_id");
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_linear_issue_map_epic_backlog_item"
      ON "integration"."linear_issue_map" ("epic_backlog_item_id");
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_issue_map"
      ADD CONSTRAINT "FK_linear_issue_map_connection"
        FOREIGN KEY ("linear_connection_id")
        REFERENCES "integration"."linear_connections"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_issue_map"
      ADD CONSTRAINT "FK_linear_issue_map_epic_issue"
        FOREIGN KEY ("epic_issue_id")
        REFERENCES "workspace"."issue"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_issue_map"
      ADD CONSTRAINT "FK_linear_issue_map_epic_backlog_item"
        FOREIGN KEY ("epic_backlog_item_id")
        REFERENCES "workspace"."backlog_item"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    // --- Import jobs + mismatch reporting ---
    await queryRunner.query(`
      CREATE TABLE "integration"."linear_import_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "linear_connection_id" integer NOT NULL,
        "workspace_id" integer NOT NULL,
        "created_by_user_id" integer NOT NULL,

        "status" character varying NOT NULL DEFAULT 'pending',
        "params" jsonb NOT NULL,
        "progress" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "last_error" text,

        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "started_at" TIMESTAMP WITH TIME ZONE,
        "finished_at" TIMESTAMP WITH TIME ZONE,

        "lock_id" uuid,
        "locked_at" TIMESTAMP WITH TIME ZONE,
        "retry_count" integer NOT NULL DEFAULT 0,
        "last_retry_at" TIMESTAMP WITH TIME ZONE,

        CONSTRAINT "PK_integration_linear_import_jobs" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_linear_import_jobs_status_created_at"
      ON "integration"."linear_import_jobs" ("status", "created_at");
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_import_jobs"
      ADD CONSTRAINT "FK_linear_import_jobs_connection"
        FOREIGN KEY ("linear_connection_id")
        REFERENCES "integration"."linear_connections"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_import_jobs"
      ADD CONSTRAINT "FK_linear_import_jobs_workspace"
        FOREIGN KEY ("workspace_id")
        REFERENCES "workspace"."workspace"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_import_jobs"
      ADD CONSTRAINT "FK_linear_import_jobs_created_by"
        FOREIGN KEY ("created_by_user_id")
        REFERENCES "auth"."users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      CREATE TABLE "integration"."linear_import_mismatches" (
        "id" SERIAL NOT NULL,
        "job_id" uuid NOT NULL,
        "type" character varying NOT NULL,
        "message" text NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_linear_import_mismatches" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_linear_import_mismatches_job_id"
      ON "integration"."linear_import_mismatches" ("job_id");
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."linear_import_mismatches"
      ADD CONSTRAINT "FK_linear_import_mismatches_job"
        FOREIGN KEY ("job_id")
        REFERENCES "integration"."linear_import_jobs"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "integration"."linear_import_mismatches" DROP CONSTRAINT "FK_linear_import_mismatches_job"`,
    );
    await queryRunner.query(
      `DROP INDEX "integration"."IDX_linear_import_mismatches_job_id"`,
    );
    await queryRunner.query(
      `DROP TABLE "integration"."linear_import_mismatches"`,
    );

    await queryRunner.query(
      `ALTER TABLE "integration"."linear_import_jobs" DROP CONSTRAINT "FK_linear_import_jobs_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."linear_import_jobs" DROP CONSTRAINT "FK_linear_import_jobs_workspace"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."linear_import_jobs" DROP CONSTRAINT "FK_linear_import_jobs_connection"`,
    );
    await queryRunner.query(
      `DROP INDEX "integration"."IDX_linear_import_jobs_status_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "integration"."linear_import_jobs"`);

    await queryRunner.query(
      `ALTER TABLE "integration"."linear_issue_map" DROP CONSTRAINT "FK_linear_issue_map_epic_backlog_item"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."linear_issue_map" DROP CONSTRAINT "FK_linear_issue_map_epic_issue"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."linear_issue_map" DROP CONSTRAINT "FK_linear_issue_map_connection"`,
    );
    await queryRunner.query(
      `DROP INDEX "integration"."UQ_linear_issue_map_epic_backlog_item"`,
    );
    await queryRunner.query(
      `DROP INDEX "integration"."UQ_linear_issue_map_epic_issue"`,
    );
    await queryRunner.query(
      `DROP INDEX "integration"."UQ_linear_issue_map_connection_issue"`,
    );
    await queryRunner.query(`DROP TABLE "integration"."linear_issue_map"`);

    await queryRunner.query(
      `ALTER TABLE "integration"."linear_user_map" DROP CONSTRAINT "FK_linear_user_map_epic_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."linear_user_map" DROP CONSTRAINT "FK_linear_user_map_connection"`,
    );
    await queryRunner.query(
      `DROP INDEX "integration"."UQ_linear_user_map_connection_user"`,
    );
    await queryRunner.query(`DROP TABLE "integration"."linear_user_map"`);

    await queryRunner.query(
      `ALTER TABLE "integration"."linear_project_map" DROP CONSTRAINT "FK_linear_project_map_epic_project"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."linear_project_map" DROP CONSTRAINT "FK_linear_project_map_connection"`,
    );
    await queryRunner.query(
      `DROP INDEX "integration"."UQ_linear_project_map_connection_project"`,
    );
    await queryRunner.query(`DROP TABLE "integration"."linear_project_map"`);

    await queryRunner.query(
      `ALTER TABLE "integration"."linear_team_map" DROP CONSTRAINT "FK_linear_team_map_epic_team"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."linear_team_map" DROP CONSTRAINT "FK_linear_team_map_connection"`,
    );
    await queryRunner.query(
      `DROP INDEX "integration"."UQ_linear_team_map_connection_team"`,
    );
    await queryRunner.query(`DROP TABLE "integration"."linear_team_map"`);

    await queryRunner.query(
      `ALTER TABLE "integration"."linear_connections" DROP CONSTRAINT "FK_linear_connections_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."linear_connections" DROP CONSTRAINT "FK_linear_connections_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."linear_connections" DROP CONSTRAINT "FK_linear_connections_workspace"`,
    );
    await queryRunner.query(
      `DROP INDEX "integration"."UQ_linear_connections_user_org"`,
    );
    await queryRunner.query(
      `DROP INDEX "integration"."UQ_linear_connections_workspace_org"`,
    );
    await queryRunner.query(`DROP TABLE "integration"."linear_connections"`);

    // Keep schema & extension (other parts of the app may rely on them)
  }
}

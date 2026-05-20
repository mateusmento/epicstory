import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddGitHubIntegrationTables1779241587262
  implements MigrationInterface
{
  name = 'MigrationAddGitHubIntegrationTables1779241587262';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS integration;`);

    await queryRunner.query(`
      CREATE TABLE "integration"."github_installations" (
        "id" SERIAL NOT NULL,
        "workspace_id" integer NOT NULL,
        "github_installation_id" bigint NOT NULL,
        "account_login" character varying NOT NULL,
        "account_type" character varying NOT NULL,
        "suspended_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_github_installations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_github_installations_workspace" UNIQUE ("workspace_id"),
        CONSTRAINT "UQ_github_installations_github_id" UNIQUE ("github_installation_id")
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "integration"."github_installations"
      ADD CONSTRAINT "FK_github_installations_workspace"
        FOREIGN KEY ("workspace_id")
        REFERENCES "workspace"."workspace"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      CREATE TABLE "integration"."github_user_connections" (
        "id" SERIAL NOT NULL,
        "workspace_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "github_user_id" bigint NOT NULL,
        "github_login" character varying NOT NULL,
        "access_token_encrypted" text NOT NULL,
        "refresh_token_encrypted" text,
        "token_expires_at" TIMESTAMP WITH TIME ZONE,
        "status" character varying NOT NULL DEFAULT 'active',
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_github_user_connections" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_github_user_connections_workspace_user"
      ON "integration"."github_user_connections" ("workspace_id", "user_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "integration"."github_user_connections"
      ADD CONSTRAINT "FK_github_user_connections_workspace"
        FOREIGN KEY ("workspace_id")
        REFERENCES "workspace"."workspace"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."github_user_connections"
      ADD CONSTRAINT "FK_github_user_connections_user"
        FOREIGN KEY ("user_id")
        REFERENCES "auth"."users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
      CREATE TABLE "integration"."project_github_repos" (
        "id" SERIAL NOT NULL,
        "project_id" integer NOT NULL,
        "owner" character varying NOT NULL,
        "name" character varying NOT NULL,
        "github_repo_id" bigint NOT NULL,
        "default_branch" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_project_github_repos" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_project_github_repos_project_owner_name"
      ON "integration"."project_github_repos" ("project_id", "owner", "name");
    `);

    await queryRunner.query(`
      ALTER TABLE "integration"."project_github_repos"
      ADD CONSTRAINT "FK_project_github_repos_project"
        FOREIGN KEY ("project_id")
        REFERENCES "workspace"."workspace_project"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "integration"."project_github_repos"
      DROP CONSTRAINT "FK_project_github_repos_project";
    `);
    await queryRunner.query(
      `DROP INDEX "integration"."UQ_project_github_repos_project_owner_name";`,
    );
    await queryRunner.query(`DROP TABLE "integration"."project_github_repos"`);

    await queryRunner.query(`
      ALTER TABLE "integration"."github_user_connections"
      DROP CONSTRAINT "FK_github_user_connections_user";
    `);
    await queryRunner.query(`
      ALTER TABLE "integration"."github_user_connections"
      DROP CONSTRAINT "FK_github_user_connections_workspace";
    `);
    await queryRunner.query(
      `DROP INDEX "integration"."UQ_github_user_connections_workspace_user";`,
    );
    await queryRunner.query(
      `DROP TABLE "integration"."github_user_connections"`,
    );

    await queryRunner.query(`
      ALTER TABLE "integration"."github_installations"
      DROP CONSTRAINT "FK_github_installations_workspace";
    `);
    await queryRunner.query(`DROP TABLE "integration"."github_installations"`);
  }
}

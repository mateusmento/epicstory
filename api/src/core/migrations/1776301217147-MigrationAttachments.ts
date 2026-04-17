import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAttachments1776301217147 implements MigrationInterface {
  name = 'MigrationAttachments1776301217147';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workspace"."attachments" (
        "id" SERIAL NOT NULL,
        "workspace_id" integer NOT NULL,
        "channel_id" integer,
        "issue_id" integer,
        "message_id" integer,
        "uploaded_by_id" integer NOT NULL,
        "storage_key" character varying NOT NULL,
        "public_url" text NOT NULL,
        "mime_type" character varying NOT NULL,
        "original_filename" character varying NOT NULL,
        "byte_size" bigint NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attachments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."attachments"
      ADD CONSTRAINT "FK_attachments_workspace"
      FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "workspace"."attachments"
      ADD CONSTRAINT "FK_attachments_user"
      FOREIGN KEY ("uploaded_by_id") REFERENCES "auth"."users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attachments_workspace_id" ON "workspace"."attachments" ("workspace_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attachments_channel_id" ON "workspace"."attachments" ("channel_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_attachments_issue_id" ON "workspace"."attachments" ("issue_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "workspace"."IDX_attachments_issue_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "workspace"."IDX_attachments_channel_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "workspace"."IDX_attachments_workspace_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace"."attachments" DROP CONSTRAINT "FK_attachments_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace"."attachments" DROP CONSTRAINT "FK_attachments_workspace"`,
    );
    await queryRunner.query(`DROP TABLE "workspace"."attachments"`);
  }
}

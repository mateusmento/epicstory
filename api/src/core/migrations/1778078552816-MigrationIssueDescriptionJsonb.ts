import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Convert Issue.description from varchar to jsonb TipTap doc.
 *
 * Empty descriptions become a normalized empty doc:
 * { type: "doc", content: [{ type: "paragraph", content: [] }] }
 */
export class MigrationIssueDescriptionJsonb1778078552816
  implements MigrationInterface
{
  name = 'MigrationIssueDescriptionJsonb1778078552816';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add a jsonb column first.
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ADD COLUMN "description_json" jsonb
    `);

    // Backfill legacy plain text into a basic TipTap doc.
    await queryRunner.query(`
      UPDATE "workspace"."issue"
      SET "description_json" = jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'content',
              CASE
                WHEN "description" IS NULL OR "description" = '' THEN '[]'::jsonb
                ELSE jsonb_build_array(jsonb_build_object('type', 'text', 'text', "description"))
              END
          )
        )
      )
      WHERE "description_json" IS NULL
    `);

    // Enforce NOT NULL (we explicitly write empty docs in the application layer).
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ALTER COLUMN "description_json" SET NOT NULL
    `);

    // Drop old varchar and rename jsonb column into place.
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      DROP COLUMN "description"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      RENAME COLUMN "description_json" TO "description"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add varchar column for description.
    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      ADD COLUMN "description_text" character varying NOT NULL DEFAULT ''
    `);

    // Best-effort downgrade: stringify JSON into empty string (we cannot reliably roundtrip rich text).
    await queryRunner.query(`
      UPDATE "workspace"."issue"
      SET "description_text" = ''
      WHERE "description_text" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      DROP COLUMN "description"
    `);

    await queryRunner.query(`
      ALTER TABLE "workspace"."issue"
      RENAME COLUMN "description_text" TO "description"
    `);
  }
}

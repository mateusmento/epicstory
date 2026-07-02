import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationChannelMemberRead1779410000000
  implements MigrationInterface
{
  name = 'MigrationChannelMemberRead1779410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "channel"."channel_member_read" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "channel_id" integer NOT NULL,
        "last_read_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_channel_member_read" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_channel_member_read_user_channel" UNIQUE ("user_id", "channel_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_channel_member_read_user"
      ON "channel"."channel_member_read" ("user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "channel"."channel_member_read"
      ADD CONSTRAINT "FK_channel_member_read_channel"
      FOREIGN KEY ("channel_id")
      REFERENCES "channel"."channel"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Seed existing memberships so historical messages don't appear as unread.
    // channel_peers join table uses "users_id" for the user FK column.
    await queryRunner.query(`
      INSERT INTO "channel"."channel_member_read" (user_id, channel_id, last_read_at)
      SELECT cp.users_id, cp.channel_id, now()
      FROM "channel"."channel_peers" cp
      ON CONFLICT (user_id, channel_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."channel_member_read"
      DROP CONSTRAINT IF EXISTS "FK_channel_member_read_channel"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "channel"."IDX_channel_member_read_user"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "channel"."channel_member_read"
    `);
  }
}

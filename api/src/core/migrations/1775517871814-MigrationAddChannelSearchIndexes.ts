import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddChannelSearchIndexes1775517871814
  implements MigrationInterface
{
  name = 'MigrationAddChannelSearchIndexes1775517871814';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Needed for fast ILIKE / %...% searches via GIN trigram indexes.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);

    // --- auth.users (search by name/email) ---
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_users_name_trgm"
      ON "auth"."users" USING GIN ("name" gin_trgm_ops)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auth_users_email_trgm"
      ON "auth"."users" USING GIN ("email" gin_trgm_ops)
    `);

    // --- channel.channel (search by group/multi-direct name) ---
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_channel_channel_name_trgm"
      ON "channel"."channel" USING GIN ("name" gin_trgm_ops)
    `);

    // --- workspace.workspace_member (DM candidates scope) ---
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_workspace_member_workspace_id_user_id"
      ON "workspace"."workspace_member" ("workspace_id", "user_id")
    `);

    // --- channel.channel_peers (NOT EXISTS direct-channel check) ---
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_channel_channel_peers_users_id_channel_id"
      ON "channel"."channel_peers" ("users_id", "channel_id")
    `);

    // --- channel.channel (filter by workspace + type + optional team) ---
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_channel_channel_workspace_id_type_team_id_id"
      ON "channel"."channel" ("workspace_id", "type", "team_id", "id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "channel"."IDX_channel_channel_workspace_id_type_team_id_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "channel"."IDX_channel_channel_peers_users_id_channel_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "workspace"."IDX_workspace_workspace_member_workspace_id_user_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "channel"."IDX_channel_channel_name_trgm"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "auth"."IDX_auth_users_email_trgm"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "auth"."IDX_auth_users_name_trgm"
    `);
  }
}

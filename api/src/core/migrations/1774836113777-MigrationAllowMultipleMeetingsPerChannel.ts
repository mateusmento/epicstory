import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAllowMultipleMeetingsPerChannel1774836113777
  implements MigrationInterface
{
  name = 'MigrationAllowMultipleMeetingsPerChannel1774836113777';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This constraint is created by the old OneToOne(Channel<->Meeting) mapping
    // and prevents creating multiple meeting sessions for the same channel over time.
    await queryRunner.query(
      `ALTER TABLE "channel"."meetings" DROP CONSTRAINT IF EXISTS "REL_e6bd0ae7682ea6085e62ab7830"`,
    );

    // Keep an index for common lookups like "find ongoing meeting by channel".
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_channel_meetings_channel_id" ON "channel"."meetings" ("channel_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "channel"."IDX_channel_meetings_channel_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "channel"."meetings" ADD CONSTRAINT "REL_e6bd0ae7682ea6085e62ab7830" UNIQUE ("channel_id")`,
    );
  }
}

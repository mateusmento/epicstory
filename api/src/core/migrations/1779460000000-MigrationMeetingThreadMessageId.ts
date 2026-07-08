import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationMeetingThreadMessageId1779460000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "channel"."meetings" ADD COLUMN IF NOT EXISTS "thread_message_id" integer NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "channel"."meetings" DROP COLUMN IF EXISTS "thread_message_id"`,
    );
  }
}

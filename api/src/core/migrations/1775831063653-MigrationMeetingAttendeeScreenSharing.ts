import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationMeetingAttendeeScreenSharing1776108000000
  implements MigrationInterface
{
  name = 'MigrationMeetingAttendeeScreenSharing1776108000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."meeting_attendees"
      ADD COLUMN IF NOT EXISTS "is_screen_sharing" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "channel"."meeting_attendees" DROP COLUMN IF EXISTS "is_screen_sharing"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationAddOnDeleteCascadeConstraintToChannelTables1770597367250
  implements MigrationInterface
{
  name = 'MigrationAddOnDeleteCascadeConstraintToChannelTables1770597367250';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "channel"."meeting_attendees" DROP CONSTRAINT "FK_8643679c49d7234b266433bc201"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."meetings" DROP CONSTRAINT "FK_e6bd0ae7682ea6085e62ab78307"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_replies" DROP CONSTRAINT "FK_6be8c1ed3936f924e8abd422dd4"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reply_reactions" DROP CONSTRAINT "FK_d6f4fb078fe88e3a5ca868aab53"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."messages" DROP CONSTRAINT "FK_86b9109b155eb70c0a2ca3b4b6d"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reactions" DROP CONSTRAINT "FK_ce61e365d81a9dfc15cd36513b0"
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
            ALTER TABLE "channel"."meeting_attendees"
            ADD CONSTRAINT "FK_8643679c49d7234b266433bc201" FOREIGN KEY ("meeting_id") REFERENCES "channel"."meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."meetings"
            ADD CONSTRAINT "FK_e6bd0ae7682ea6085e62ab78307" FOREIGN KEY ("channel_id") REFERENCES "channel"."channel"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_replies"
            ADD CONSTRAINT "FK_6be8c1ed3936f924e8abd422dd4" FOREIGN KEY ("message_id") REFERENCES "channel"."messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reply_reactions"
            ADD CONSTRAINT "FK_d6f4fb078fe88e3a5ca868aab53" FOREIGN KEY ("message_reply_id") REFERENCES "channel"."message_replies"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."messages"
            ADD CONSTRAINT "FK_86b9109b155eb70c0a2ca3b4b6d" FOREIGN KEY ("channel_id") REFERENCES "channel"."channel"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reactions"
            ADD CONSTRAINT "FK_ce61e365d81a9dfc15cd36513b0" FOREIGN KEY ("message_id") REFERENCES "channel"."messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."channel"
            ADD CONSTRAINT "FK_54d184fa863ba93b007e8dcc279" FOREIGN KEY ("workspace_id") REFERENCES "workspace"."workspace"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "channel"."channel" DROP CONSTRAINT "FK_54d184fa863ba93b007e8dcc279"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reactions" DROP CONSTRAINT "FK_ce61e365d81a9dfc15cd36513b0"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."messages" DROP CONSTRAINT "FK_86b9109b155eb70c0a2ca3b4b6d"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reply_reactions" DROP CONSTRAINT "FK_d6f4fb078fe88e3a5ca868aab53"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_replies" DROP CONSTRAINT "FK_6be8c1ed3936f924e8abd422dd4"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."meetings" DROP CONSTRAINT "FK_e6bd0ae7682ea6085e62ab78307"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."meeting_attendees" DROP CONSTRAINT "FK_8643679c49d7234b266433bc201"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2026-02-09 00:29:26.152936'
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_member"
            ALTER COLUMN "joined_at"
            SET DEFAULT '2026-02-09 00:29:26.152936'
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reactions"
            ADD CONSTRAINT "FK_ce61e365d81a9dfc15cd36513b0" FOREIGN KEY ("message_id") REFERENCES "channel"."messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."messages"
            ADD CONSTRAINT "FK_86b9109b155eb70c0a2ca3b4b6d" FOREIGN KEY ("channel_id") REFERENCES "channel"."channel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_reply_reactions"
            ADD CONSTRAINT "FK_d6f4fb078fe88e3a5ca868aab53" FOREIGN KEY ("message_reply_id") REFERENCES "channel"."message_replies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."message_replies"
            ADD CONSTRAINT "FK_6be8c1ed3936f924e8abd422dd4" FOREIGN KEY ("message_id") REFERENCES "channel"."messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."meetings"
            ADD CONSTRAINT "FK_e6bd0ae7682ea6085e62ab78307" FOREIGN KEY ("channel_id") REFERENCES "channel"."channel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."meeting_attendees"
            ADD CONSTRAINT "FK_8643679c49d7234b266433bc201" FOREIGN KEY ("meeting_id") REFERENCES "channel"."meetings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationInitial1763984691156 implements MigrationInterface {
  name = 'MigrationInitial1763984691156';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "workspace"."team" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "workspace_id" integer NOT NULL,
                CONSTRAINT "PK_f57d8293406df4af348402e4b74" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "auth"."users" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "email" character varying NOT NULL,
                "password" character varying,
                "picture" character varying,
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "workspace"."team_member" (
                "id" SERIAL NOT NULL,
                "user_id" integer NOT NULL,
                "workspace_member_id" integer NOT NULL,
                "team_id" integer NOT NULL,
                "joined_at" TIMESTAMP NOT NULL DEFAULT 'now()',
                CONSTRAINT "PK_649680684d72a20d279641469c5" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "workspace_member_invite" (
                "id" SERIAL NOT NULL,
                "workspace_id" integer NOT NULL,
                "email" character varying NOT NULL,
                "user_id" integer,
                "role" integer,
                "status" character varying NOT NULL,
                "expires_at" TIMESTAMP NOT NULL,
                CONSTRAINT "PK_50a4409a072b4b9296696fb744a" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "workspace"."workspace_member" (
                "id" SERIAL NOT NULL,
                "workspace_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                "role" integer NOT NULL,
                "joined_at" TIMESTAMP NOT NULL DEFAULT 'now()',
                CONSTRAINT "PK_a3a35f64bf30517010551467c6e" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "workspace"."issue" (
                "id" SERIAL NOT NULL,
                "title" character varying NOT NULL DEFAULT '',
                "description" character varying NOT NULL DEFAULT '',
                "workspace_id" integer NOT NULL,
                "project_id" integer NOT NULL,
                "created_by_id" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "status" character varying NOT NULL DEFAULT 'todo',
                "due_date" TIMESTAMP,
                "priority" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_f80e086c249b9f3f3ff2fd321b7" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "workspace"."backlog_item" (
                "id" SERIAL NOT NULL,
                "backlog_id" integer NOT NULL,
                "project_id" integer NOT NULL,
                "issue_id" integer NOT NULL,
                "order" double precision NOT NULL DEFAULT '0',
                "previous_id" integer,
                "next_id" integer,
                CONSTRAINT "UQ_c95845eb3f03c9fe73e7aa34472" UNIQUE ("previous_id"),
                CONSTRAINT "UQ_03490acb11ea61f1aa3bd2a226c" UNIQUE ("next_id"),
                CONSTRAINT "PK_4da836fa604d3eae1fc738701b4" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "workspace"."backlog" (
                "id" SERIAL NOT NULL,
                "project_id" integer NOT NULL,
                CONSTRAINT "PK_2b6379507bedcd48474c22d3727" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "workspace"."workspace_project" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "workspace_id" integer NOT NULL,
                "team_id" integer,
                "backlog_id" integer,
                CONSTRAINT "PK_658ca0774c6910eb91fb94ffb2b" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "workspace"."sprint" (
                "id" SERIAL NOT NULL,
                "workspace_id" integer NOT NULL,
                "project_id" integer NOT NULL,
                "backlog_id" integer NOT NULL,
                "created_by_id" integer NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_f371c7b5c4bc62fb2ba2bdb9f61" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "workspace"."workspace" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                CONSTRAINT "PK_ca86b6f9b3be5fe26d307d09b49" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "channel"."meeting_attendees" (
                "id" SERIAL NOT NULL,
                "remote_id" character varying NOT NULL,
                "user_id" integer NOT NULL,
                "meeting_id" integer NOT NULL,
                "is_camera_on" boolean NOT NULL DEFAULT true,
                "is_microphone_on" boolean NOT NULL DEFAULT true,
                CONSTRAINT "UQ_9e77432405674ec4608ee6f5da6" UNIQUE ("remote_id"),
                CONSTRAINT "PK_b49884a61337dbfb2f3018710da" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "channel"."meetings" (
                "id" SERIAL NOT NULL,
                "ongoing" boolean NOT NULL,
                "channel_id" integer NOT NULL,
                CONSTRAINT "REL_e6bd0ae7682ea6085e62ab7830" UNIQUE ("channel_id"),
                CONSTRAINT "PK_aa73be861afa77eb4ed31f3ed57" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "channel"."messages" (
                "id" SERIAL NOT NULL,
                "content" character varying NOT NULL,
                "sent_at" TIMESTAMP NOT NULL DEFAULT now(),
                "sender_id" integer NOT NULL,
                "channel_id" integer NOT NULL,
                CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "channel"."channel" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL DEFAULT '',
                "workspace_id" integer NOT NULL,
                "team_id" integer,
                "type" character varying NOT NULL DEFAULT 'direct',
                "last_message_id" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_590f33ee6ee7d76437acf362e39" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "workspace"."issue_assignee" (
                "issue_id" integer NOT NULL,
                "user_id" integer NOT NULL,
                CONSTRAINT "PK_e530b748c004103b65d4e0aec96" PRIMARY KEY ("issue_id", "user_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_8ef02425cdddea5337326583d9" ON "workspace"."issue_assignee" ("issue_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_8bfef41b1a0f14eab8def78ab1" ON "workspace"."issue_assignee" ("user_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "channel"."channel_peers" (
                "channel_id" integer NOT NULL,
                "users_id" integer NOT NULL,
                CONSTRAINT "PK_7524ec44c6c1518f5b3b4574a0b" PRIMARY KEY ("channel_id", "users_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d4dccab44574927c7665b07eec" ON "channel"."channel_peers" ("channel_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_6015373ed9a5c1e1f56c919afb" ON "channel"."channel_peers" ("users_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ADD CONSTRAINT "FK_0724b86622f89c433dee4cd8b17" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member"
            ADD CONSTRAINT "FK_a1b5b4f5fa1b7f890d0a278748b" FOREIGN KEY ("team_id") REFERENCES "workspace"."team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace_member_invite"
            ADD CONSTRAINT "FK_3b1db57c3bc6a42f9323e7db4ab" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_member"
            ADD CONSTRAINT "FK_82b74268d8b7e1574fd744b3903" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item"
            ADD CONSTRAINT "FK_8433a3e8b34032bbe9a5a5043a0" FOREIGN KEY ("backlog_id") REFERENCES "workspace"."backlog"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item"
            ADD CONSTRAINT "FK_90b05eb9ab85cc6409612b21fc7" FOREIGN KEY ("project_id") REFERENCES "workspace"."workspace_project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item"
            ADD CONSTRAINT "FK_79919f05a57b19d5092f1685a61" FOREIGN KEY ("issue_id") REFERENCES "workspace"."issue"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item"
            ADD CONSTRAINT "FK_c95845eb3f03c9fe73e7aa34472" FOREIGN KEY ("previous_id") REFERENCES "workspace"."backlog_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item"
            ADD CONSTRAINT "FK_03490acb11ea61f1aa3bd2a226c" FOREIGN KEY ("next_id") REFERENCES "workspace"."backlog_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog"
            ADD CONSTRAINT "FK_b63a18f7feab59fbeb110e9c8b4" FOREIGN KEY ("project_id") REFERENCES "workspace"."workspace_project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_project"
            ADD CONSTRAINT "FK_56ea9a1d5e559808fab93b15b50" FOREIGN KEY ("backlog_id") REFERENCES "workspace"."backlog"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."sprint"
            ADD CONSTRAINT "FK_097cde4ee8bc37bdb329fc4c8fc" FOREIGN KEY ("backlog_id") REFERENCES "workspace"."backlog"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."meeting_attendees"
            ADD CONSTRAINT "FK_edda203440a111ad016876f8737" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."meeting_attendees"
            ADD CONSTRAINT "FK_8643679c49d7234b266433bc201" FOREIGN KEY ("meeting_id") REFERENCES "channel"."meetings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."meetings"
            ADD CONSTRAINT "FK_e6bd0ae7682ea6085e62ab78307" FOREIGN KEY ("channel_id") REFERENCES "channel"."channel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."messages"
            ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."messages"
            ADD CONSTRAINT "FK_86b9109b155eb70c0a2ca3b4b6d" FOREIGN KEY ("channel_id") REFERENCES "channel"."channel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."channel"
            ADD CONSTRAINT "FK_2d96552a109b8a99c2de06dc191" FOREIGN KEY ("team_id") REFERENCES "workspace"."team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."channel"
            ADD CONSTRAINT "FK_c348c021618627599ac87f4b2ef" FOREIGN KEY ("last_message_id") REFERENCES "channel"."messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue_assignee"
            ADD CONSTRAINT "FK_8ef02425cdddea5337326583d96" FOREIGN KEY ("issue_id") REFERENCES "workspace"."issue"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue_assignee"
            ADD CONSTRAINT "FK_8bfef41b1a0f14eab8def78ab15" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."channel_peers"
            ADD CONSTRAINT "FK_d4dccab44574927c7665b07eecf" FOREIGN KEY ("channel_id") REFERENCES "channel"."channel"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."channel_peers"
            ADD CONSTRAINT "FK_6015373ed9a5c1e1f56c919afb7" FOREIGN KEY ("users_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "channel"."channel_peers" DROP CONSTRAINT "FK_6015373ed9a5c1e1f56c919afb7"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."channel_peers" DROP CONSTRAINT "FK_d4dccab44574927c7665b07eecf"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue_assignee" DROP CONSTRAINT "FK_8bfef41b1a0f14eab8def78ab15"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."issue_assignee" DROP CONSTRAINT "FK_8ef02425cdddea5337326583d96"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."channel" DROP CONSTRAINT "FK_c348c021618627599ac87f4b2ef"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."channel" DROP CONSTRAINT "FK_2d96552a109b8a99c2de06dc191"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."messages" DROP CONSTRAINT "FK_86b9109b155eb70c0a2ca3b4b6d"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."meetings" DROP CONSTRAINT "FK_e6bd0ae7682ea6085e62ab78307"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."meeting_attendees" DROP CONSTRAINT "FK_8643679c49d7234b266433bc201"
        `);
    await queryRunner.query(`
            ALTER TABLE "channel"."meeting_attendees" DROP CONSTRAINT "FK_edda203440a111ad016876f8737"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."sprint" DROP CONSTRAINT "FK_097cde4ee8bc37bdb329fc4c8fc"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_project" DROP CONSTRAINT "FK_56ea9a1d5e559808fab93b15b50"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog" DROP CONSTRAINT "FK_b63a18f7feab59fbeb110e9c8b4"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT "FK_03490acb11ea61f1aa3bd2a226c"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT "FK_c95845eb3f03c9fe73e7aa34472"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT "FK_79919f05a57b19d5092f1685a61"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT "FK_90b05eb9ab85cc6409612b21fc7"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."backlog_item" DROP CONSTRAINT "FK_8433a3e8b34032bbe9a5a5043a0"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."workspace_member" DROP CONSTRAINT "FK_82b74268d8b7e1574fd744b3903"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace_member_invite" DROP CONSTRAINT "FK_3b1db57c3bc6a42f9323e7db4ab"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member" DROP CONSTRAINT "FK_a1b5b4f5fa1b7f890d0a278748b"
        `);
    await queryRunner.query(`
            ALTER TABLE "workspace"."team_member" DROP CONSTRAINT "FK_0724b86622f89c433dee4cd8b17"
        `);
    await queryRunner.query(`
            DROP INDEX "channel"."IDX_6015373ed9a5c1e1f56c919afb"
        `);
    await queryRunner.query(`
            DROP INDEX "channel"."IDX_d4dccab44574927c7665b07eec"
        `);
    await queryRunner.query(`
            DROP TABLE "channel"."channel_peers"
        `);
    await queryRunner.query(`
            DROP INDEX "workspace"."IDX_8bfef41b1a0f14eab8def78ab1"
        `);
    await queryRunner.query(`
            DROP INDEX "workspace"."IDX_8ef02425cdddea5337326583d9"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace"."issue_assignee"
        `);
    await queryRunner.query(`
            DROP TABLE "channel"."channel"
        `);
    await queryRunner.query(`
            DROP TABLE "channel"."messages"
        `);
    await queryRunner.query(`
            DROP TABLE "channel"."meetings"
        `);
    await queryRunner.query(`
            DROP TABLE "channel"."meeting_attendees"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace"."workspace"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace"."sprint"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace"."workspace_project"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace"."backlog"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace"."backlog_item"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace"."issue"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace"."workspace_member"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace_member_invite"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace"."team_member"
        `);
    await queryRunner.query(`
            DROP TABLE "auth"."users"
        `);
    await queryRunner.query(`
            DROP TABLE "workspace"."team"
        `);
  }
}

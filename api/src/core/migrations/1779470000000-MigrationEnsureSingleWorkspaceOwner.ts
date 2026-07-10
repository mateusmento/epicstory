import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WorkspaceRole: OWNER=0, ADMIN=1, COLLABORATOR=2.
 * Ensure every workspace has exactly one OWNER (earliest joinedAt, then id).
 */
export class MigrationEnsureSingleWorkspaceOwner1779470000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Demote extra owners: keep earliest joinedAt / lowest id as sole OWNER.
    await queryRunner.query(`
      UPDATE workspace.workspace_member wm
      SET role = 1
      WHERE wm.role = 0
        AND wm.id NOT IN (
          SELECT DISTINCT ON (workspace_id) id
          FROM workspace.workspace_member
          WHERE role = 0
          ORDER BY workspace_id, joined_at ASC NULLS LAST, id ASC
        )
    `);

    // Workspaces with no OWNER: promote earliest member.
    await queryRunner.query(`
      UPDATE workspace.workspace_member wm
      SET role = 0
      WHERE wm.id IN (
        SELECT DISTINCT ON (workspace_id) id
        FROM workspace.workspace_member
        WHERE workspace_id NOT IN (
          SELECT DISTINCT workspace_id
          FROM workspace.workspace_member
          WHERE role = 0
        )
        ORDER BY workspace_id, joined_at ASC NULLS LAST, id ASC
      )
    `);
  }

  async down(): Promise<void> {
    // Irreversible data fix — no-op.
  }
}

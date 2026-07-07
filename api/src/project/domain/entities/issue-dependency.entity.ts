import { patch } from 'src/core/objects';
import { PROJECT_SCHEMA } from 'src/project/constants';
import { Workspace } from 'src/workspace/domain/entities';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from './issue.entity';

@Entity({ schema: PROJECT_SCHEMA, name: 'issue_dependency' })
export class IssueDependency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  /** Dependent (blocked) issue. */
  @Column()
  issueId: number;

  @ManyToOne(() => Issue, { onDelete: 'CASCADE' })
  issue: Issue;

  /** Blocker issue. */
  @Column()
  dependsOnIssueId: number;

  @ManyToOne(() => Issue, { onDelete: 'CASCADE' })
  dependsOnIssue: Issue;

  constructor(data: Partial<IssueDependency> = {}) {
    patch(this, data);
  }

  static create(data: Partial<IssueDependency> = {}) {
    return new IssueDependency(data);
  }
}

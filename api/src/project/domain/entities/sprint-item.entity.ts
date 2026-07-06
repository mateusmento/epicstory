import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PROJECT_SCHEMA } from 'src/project/constants';
import { Sprint } from './sprint.entity';
import { Issue } from './issue.entity';

@Entity({ schema: PROJECT_SCHEMA })
export class SprintItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sprintId: number;

  @ManyToOne(() => Sprint, { onDelete: 'CASCADE' })
  sprint: Sprint;

  @Column()
  issueId: number;

  @ManyToOne(() => Issue, { onDelete: 'CASCADE' })
  issue: Issue;

  @Column({ type: 'float', default: 0 })
  order: number;

  /** Snapshot of issue.status at sprint completion. Null while sprint is active. */
  @Column({ nullable: true })
  completedStatus: string | null;

  /** Sprint this item was routed to after completion. Null means stays in backlog. */
  @Column({ nullable: true })
  destinationSprintId: number | null;

  @ManyToOne(() => Sprint, { nullable: true, onDelete: 'SET NULL' })
  destinationSprint: Sprint | null;
}

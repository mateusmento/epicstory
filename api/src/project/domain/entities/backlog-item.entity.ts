import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from './issue.entity';
import { PROJECT_SCHEMA } from 'src/project/constants';
import { Backlog } from './backlog.entity';
import { Project } from './project.entity';

@Entity({ schema: PROJECT_SCHEMA })
export class BacklogItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  backlogId: number;
  @ManyToOne(() => Backlog)
  backlog: Backlog;

  @Column()
  projectId: number;
  @ManyToOne(() => Project)
  project: Project;

  @Column()
  issueId: number;
  @ManyToOne(() => Issue)
  issue: Issue;

  @Column({ type: 'float', default: 0 })
  order: number;
}

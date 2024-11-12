import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Issue } from './issue.entity';
import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Backlog } from './backlog.entity';

@Entity({ schema: WORKSPACE_SCHEMA })
export class BacklogItem {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  backlogId: number;
  @ManyToOne(() => Backlog)
  backlog: Backlog;
  @Column()
  issueId: number;
  @ManyToOne(() => Issue)
  issue: Issue;
  @Column({ type: 'float', default: 0 })
  order: number;
  @Column({ nullable: true })
  previousId: number;
  @ManyToOne(() => BacklogItem, { nullable: true })
  before: BacklogItem;
  @Column({ nullable: true })
  nextId: number;
  @ManyToOne(() => BacklogItem, { nullable: true })
  next: BacklogItem;
}

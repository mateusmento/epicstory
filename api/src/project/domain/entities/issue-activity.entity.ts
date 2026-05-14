import { PROJECT_SCHEMA } from 'src/project/constants';
import type { IssueActivityType } from 'src/project/domain/types/issue-activity-payload.types';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: PROJECT_SCHEMA, name: 'issue_activities' })
export class IssueActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  issueId: number;

  @Column({ nullable: true })
  actorId: number | null;

  @Column()
  type: IssueActivityType;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  messageId: number | null;

  @Column({ nullable: true })
  attachmentId: number | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;
}

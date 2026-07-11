import type { JSONContent } from '@tiptap/core';
import { patch } from 'src/core/objects';
import { PROJECT_SCHEMA } from 'src/project/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IssueDescriptionThread } from './issue-description-thread.entity';

@Entity({ schema: PROJECT_SCHEMA, name: 'issue_description_thread_message' })
export class IssueDescriptionThreadMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  threadId: number;

  @ManyToOne(() => IssueDescriptionThread, (t) => t.messages, {
    onDelete: 'CASCADE',
  })
  thread: IssueDescriptionThread;

  @Column()
  authorId: number;

  @Column({ type: 'jsonb' })
  content: JSONContent;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  editedAt: Date | null;

  constructor(data: Partial<IssueDescriptionThreadMessage> = {}) {
    patch(this, data);
  }

  static create(data: Partial<IssueDescriptionThreadMessage> = {}) {
    return new IssueDescriptionThreadMessage(data);
  }
}

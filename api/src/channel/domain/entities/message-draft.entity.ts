import type { MessagePollBody } from '@epicstory/contracts';
import type { JSONContent } from '@tiptap/core';
import { User } from 'src/auth';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import { Attachment } from 'src/workspace/domain/entities/attachment.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Channel } from './channel.entity';
import { Message } from './message.entity';

@Entity({ schema: CHANNEL_SCHEMA, name: 'message_drafts' })
export class MessageDraft {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @Column()
  channelId: number;

  @ManyToOne(() => Channel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @Column()
  authorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  /** Null = root composer; set = reply draft in that thread. */
  @Column({ type: 'int', nullable: true })
  threadMessageId: number | null;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'thread_message_id' })
  threadMessage?: Message | null;

  @Column({ type: 'jsonb', default: () => `'{"type":"doc","content":[]}'` })
  content: JSONContent;

  @Column({ type: 'jsonb', nullable: true })
  poll?: MessagePollBody | null;

  @Column({ type: 'int', nullable: true })
  quotedMessageId: number | null;

  @Column({ type: 'int', nullable: true })
  quotedReplyId: number | null;

  @Column({ default: 1 })
  version: number;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Attachment)
  @JoinTable({
    name: 'message_draft_attachments',
    schema: CHANNEL_SCHEMA,
    joinColumn: { name: 'draft_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'attachment_id', referencedColumnName: 'id' },
  })
  attachments?: Attachment[];
}

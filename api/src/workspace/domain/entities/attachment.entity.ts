import { User } from 'src/auth';
import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';

@Entity({ schema: WORKSPACE_SCHEMA, name: 'attachments' })
export class Attachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  /** When set, file was uploaded in a channel context (messages / composer). */
  @Column({ type: 'int', nullable: true })
  channelId: number | null;

  /** When set, file was uploaded from an issue description editor. */
  @Column({ type: 'int', nullable: true })
  issueId: number | null;

  /** Optional link after a message is created (set by future flows). */
  @Column({ type: 'int', nullable: true })
  messageId: number | null;

  @Column()
  uploadedById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column()
  storageKey: string;

  @Column({ type: 'text' })
  publicUrl: string;

  @Column()
  mimeType: string;

  @Column()
  originalFilename: string;

  @Column({ type: 'bigint', default: '0' })
  byteSize: string;

  @CreateDateColumn()
  createdAt: Date;
}

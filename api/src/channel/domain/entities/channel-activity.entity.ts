import { User } from 'src/auth';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import type { ChannelActivityType } from '@epicstory/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Channel } from './channel.entity';

@Entity({ schema: CHANNEL_SCHEMA, name: 'channel_activities' })
export class ChannelActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  channelId: number;

  @ManyToOne(() => Channel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @Column({ type: 'varchar', length: 32 })
  type: ChannelActivityType;

  @Column({ type: 'int', nullable: true })
  actorId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor?: User | null;

  @Column({ type: 'int', nullable: true })
  subjectUserId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'subject_user_id' })
  subjectUser?: User | null;

  @Column({ type: 'int', nullable: true })
  messageId: number | null;

  @Column({ type: 'int', nullable: true })
  meetingId: number | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}

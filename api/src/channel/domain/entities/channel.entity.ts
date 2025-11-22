import { User } from 'src/auth';
import { create } from 'src/core/objects';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Meeting } from './meeting.entity';
import { Message } from './message.entity';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import { Team } from 'src/workspace/domain/entities';

type ChannelType = 'direct' | 'group';

@Entity({ schema: CHANNEL_SCHEMA })
export class Channel {
  @PrimaryGeneratedColumn()
  // @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ default: '' })
  name: string;

  @Column()
  workspaceId: number;

  @Column({ nullable: true })
  teamId?: number;

  @ManyToOne(() => Team)
  team: Team;

  @Column({ default: 'direct' })
  type: ChannelType;

  @ManyToMany(() => User)
  @JoinTable({ name: 'channel_peers' })
  peers: User[];

  speakingTo: User;

  @OneToOne(() => Meeting, (m) => m.channel)
  meeting: Meeting;

  @Column({ default: null })
  lastMessageId: number;

  @ManyToOne(() => Message)
  lastMessage: Message;

  @CreateDateColumn()
  createdAt: Date;

  static create(data: Partial<Channel>) {
    return create(Channel, data);
  }
}

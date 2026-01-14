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

export type ChannelType = 'direct' | 'multi-direct' | 'group';

@Entity({ schema: CHANNEL_SCHEMA, name: 'channel' })
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

  @Column({ nullable: true })
  dmUserLowerId?: number;

  @Column({ nullable: true })
  dmUserGreaterId?: number;

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

  static createMultiDirect(data: Partial<Channel>) {
    return create(Channel, {
      ...data,
      type: 'multi-direct',
      name: ``,
    });
  }

  static createDirect({ peers, ...data }: Partial<Channel>) {
    if (peers.length !== 2) {
      throw new Error('Direct channel must have exactly 2 peers');
    }
    const [user1, user2] = peers;
    return create(Channel, {
      ...data,
      type: 'direct',
      name: '',
      dmUserLowerId: Math.min(user1.id, user2.id),
      dmUserGreaterId: Math.max(user1.id, user2.id),
    });
  }
}

import { CHANNEL_SCHEMA } from 'src/channel/constants';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Channel } from './channel.entity';

@Entity({ schema: CHANNEL_SCHEMA, name: 'channel_member_read' })
@Unique(['userId', 'channelId'])
export class ChannelMemberRead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'channel_id' })
  channelId: number;

  @ManyToOne(() => Channel, { onDelete: 'CASCADE' })
  channel: Channel;

  @UpdateDateColumn({ name: 'last_read_at', type: 'timestamptz' })
  lastReadAt: Date;
}

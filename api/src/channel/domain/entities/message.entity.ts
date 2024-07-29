import { User } from 'src/auth';
import { Channel } from './channel.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'messages' })
export class Message {
  @PrimaryGeneratedColumn()
  // @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id: number;

  @Column()
  text: string;

  @CreateDateColumn()
  sentAt: Date;

  @Column()
  speakerId: number;

  @ManyToOne(() => User)
  speaker: User;

  @Column()
  channelId: number;

  @ManyToOne(() => Channel)
  channel: Channel;
}

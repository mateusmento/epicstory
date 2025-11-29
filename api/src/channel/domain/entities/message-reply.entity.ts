import { User } from 'src/auth';
import { Message } from './message.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CHANNEL_SCHEMA } from 'src/channel/constants';

@Entity({ schema: CHANNEL_SCHEMA, name: 'message_replies' })
export class MessageReply {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @CreateDateColumn()
  sentAt: Date;

  @Column()
  senderId: number;

  @ManyToOne(() => User)
  sender: User;

  @Column()
  messageId: number;

  @ManyToOne(() => Message)
  message: Message;
}

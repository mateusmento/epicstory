import { User } from 'src/auth';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Message } from './message.entity';

@Entity({ schema: CHANNEL_SCHEMA, name: 'message_replies' })
export class MessageReply {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @Column({ default: () => 'now()' })
  sentAt: Date;

  @Column()
  senderId: number;

  @ManyToOne(() => User)
  sender: User;

  @Column()
  messageId: number;

  @ManyToOne(() => Message)
  message: Message;

  @OneToMany(() => MessageReplyReaction, (reaction) => reaction.messageReply)
  reactions: MessageReplyReaction[];
}

@Entity({ schema: CHANNEL_SCHEMA, name: 'message_reply_reactions' })
export class MessageReplyReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  emoji: string;

  @Column()
  messageReplyId: number;

  @ManyToOne(() => MessageReply)
  messageReply: MessageReply;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  user: User;
}

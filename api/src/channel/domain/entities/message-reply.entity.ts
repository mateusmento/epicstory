import { User } from 'src/auth';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Message } from './message.entity';

export type ReplyReactionsGroup = {
  emoji: string;
  reactedBy: User[];
};

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
  channelId: number;

  @Column()
  messageId: number;

  @ManyToOne(() => Message)
  message: Message;

  @OneToMany(() => MessageReplyReaction, (reaction) => reaction.messageReply)
  reactions: MessageReplyReaction[];

  reactionsGroups: ReplyReactionsGroup[];
}

@Entity({ schema: CHANNEL_SCHEMA, name: 'message_reply_reactions' })
@Unique('unique_message_reply_reaction', ['messageReplyId', 'emoji', 'userId'])
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

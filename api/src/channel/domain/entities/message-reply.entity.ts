import { Exclude } from 'class-transformer';
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
import { mapReactions } from '../utils';
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

  @Column({ type: 'jsonb', nullable: true })
  contentRich?: any;

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

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  message: Message;

  @Exclude()
  @OneToMany(() => MessageReplyReaction, (reaction) => reaction.messageReply)
  allReactions: MessageReplyReaction[];

  reactions: ReplyReactionsGroup[];

  setReactions(senderId: number, usersMap?: Map<number, User>) {
    this.reactions = mapReactions(this.allReactions, senderId, usersMap);
  }
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

  @ManyToOne(() => MessageReply, { onDelete: 'CASCADE' })
  messageReply: MessageReply;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  reactedAt: Date;
}

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
import { Exclude } from 'class-transformer';
import { groupBy, minBy, sortBy } from 'lodash';

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

  @Exclude()
  @OneToMany(() => MessageReplyReaction, (reaction) => reaction.messageReply)
  allReactions: MessageReplyReaction[];

  reactions: ReplyReactionsGroup[];

  setReactions(senderId: number, usersMap?: Map<number, User>) {
    const grouped = groupBy(this.allReactions, 'emoji');
    const reactions = Object.entries(grouped).map(([emoji, reactions]) => ({
      emoji,
      reactedBy: reactions.map((r) =>
        usersMap ? usersMap.get(r.userId) : r.user,
      ),
      firstReactedAt: minBy(
        reactions.map((r) => r.reactedAt),
        (d) => d.getTime(),
      ),
      reactedByMe: reactions.some((r) => r.userId === senderId),
    }));

    this.reactions = sortBy(reactions, ['firstReactedAt']);
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

  @ManyToOne(() => MessageReply)
  messageReply: MessageReply;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  reactedAt: Date;
}

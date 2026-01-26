import { User } from 'src/auth';
import { Channel } from './channel.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import { MessageReply } from './message-reply.entity';
import { Exclude } from 'class-transformer';
import { groupBy } from 'src/core/objects';

export type MessageReactionsGroup = {
  emoji: string;
  reactedBy: User[];
};

@Entity({ schema: CHANNEL_SCHEMA, name: 'messages' })
export class Message {
  @PrimaryGeneratedColumn()
  // @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
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
  channelId: number;

  @ManyToOne(() => Channel)
  channel: Channel;

  @Exclude()
  @OneToMany(() => MessageReaction, (reaction) => reaction.message)
  allReactions: MessageReaction[];

  @Exclude()
  @OneToMany(() => MessageReply, (reply) => reply.message)
  allReplies: MessageReply[];

  reactions: MessageReactionsGroup[];

  replies: {
    count: number;
    repliedBy: User[];
  };

  setReactions() {
    const grouped = groupBy(this.allReactions, 'emoji');

    this.reactions = Object.entries(grouped).map(([emoji, reactions]) => ({
      emoji,
      reactedBy: reactions.map((reaction) => reaction.user),
    }));
  }

  setReplies() {
    const repliedBy = [];
    for (const reply of this.allReplies) {
      if (!repliedBy.some(({ id }) => id === reply.senderId))
        repliedBy.push(reply.sender);
    }

    this.replies = {
      count: this.allReplies.length,
      repliedBy,
    };
  }
}

@Unique('unique_message_reaction', ['messageId', 'emoji', 'userId'])
@Entity({
  schema: CHANNEL_SCHEMA,
  name: 'message_reactions',
})
export class MessageReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  emoji: string;

  @Column()
  messageId: number;

  @ManyToOne(() => Message)
  message: Message;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  reactedAt: Date;
}

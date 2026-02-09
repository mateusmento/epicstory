import { Exclude } from 'class-transformer';
import { User } from 'src/auth';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Channel } from './channel.entity';
import { MessageReply } from './message-reply.entity';

export type MessageReactionsGroup = {
  emoji: string;
  reactedBy: User[];
  firstReactedAt?: Date;
  reactedByMe: boolean;
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

  @ManyToOne(() => Channel, { onDelete: 'CASCADE' })
  channel: Channel;

  @Exclude()
  @OneToMany(() => MessageReaction, (reaction) => reaction.message)
  allReactions: MessageReaction[];

  @Exclude()
  @OneToMany(() => MessageReply, (reply) => reply.message)
  allReplies: MessageReply[];

  repliesCount: number;
  repliers: { user: User; repliesCount: number }[];
  reactions: MessageReactionsGroup[];

  constructor() {
    this.reactions = [];
    this.repliesCount = 0;
    this.repliers = [];
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

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  message: Message;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  reactedAt: Date;
}

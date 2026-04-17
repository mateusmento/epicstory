import { Exclude } from 'class-transformer';
import { User } from 'src/auth';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Channel } from './channel.entity';
import { MessageReply } from './message-reply.entity';

@Entity({ schema: CHANNEL_SCHEMA, name: 'messages' })
export class Message {
  @PrimaryGeneratedColumn()
  // @PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
  id: number;

  @Column()
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  contentRich?: any;

  @CreateDateColumn()
  sentAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  editedAt?: Date | null;

  @Column()
  senderId: number;

  @ManyToOne(() => User)
  sender: User;

  @Column()
  channelId: number;

  @ManyToOne(() => Channel, { onDelete: 'CASCADE' })
  channel: Channel;

  /** Optional reference to another top-level message quoted in this one (same channel). */
  @Column({ type: 'int', nullable: true })
  quotedMessageId: number | null;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'quoted_message_id' })
  quotedMessageRef?: Message | null;

  @Exclude()
  @OneToMany(() => MessageReaction, (reaction) => reaction.message)
  allReactions: MessageReaction[];

  @Exclude()
  @OneToMany(() => MessageReply, (reply) => reply.message)
  allReplies: MessageReply[];
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

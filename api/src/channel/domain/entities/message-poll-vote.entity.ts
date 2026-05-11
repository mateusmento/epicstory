import { User } from 'src/auth';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import { Message } from 'src/channel/domain/entities/message.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ schema: CHANNEL_SCHEMA, name: 'message_poll_votes' })
@Unique('UQ_message_poll_vote_message_user', ['messageId', 'userId'])
export class MessagePollVote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  messageId: number;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  message: Message;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  user: User;

  /** Selected option id (matches `messages.poll.options[].id`). */
  @Column({ type: 'varchar', length: 64 })
  optionId: string;
}

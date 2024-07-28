import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

const CHANNEL_SCHEMA = 'channel';

@Entity({ schema: CHANNEL_SCHEMA })
export class Channel {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  name: string;
  @Column()
  workspaceId: number;
}

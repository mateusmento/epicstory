import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BacklogItem } from './backlog-item.entity';

@Entity({ schema: WORKSPACE_SCHEMA })
export class Backlog {
  @PrimaryGeneratedColumn()
  id: number;
  @OneToMany(() => BacklogItem, (bi) => bi.backlog)
  items: BacklogItem[];
}

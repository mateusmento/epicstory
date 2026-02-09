import { PROJECT_SCHEMA } from 'src/project/constants';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BacklogItem } from './backlog-item.entity';
import { Project } from './project.entity';
import { patch } from 'src/core/objects';

@Entity({ schema: PROJECT_SCHEMA })
export class Backlog {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  projectId: number;
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;
  @OneToMany(() => BacklogItem, (bi) => bi.backlog)
  items: BacklogItem[];

  constructor(partial: Partial<Backlog> = {}) {
    patch(this, partial);
  }
}
